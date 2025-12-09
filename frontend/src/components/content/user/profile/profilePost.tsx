import React, { useEffect, useState, useRef } from "react";
import { postAPI } from "../../../../services/PostService";
import AccountService from "../../../../services/AccountService";
import CommentService from "../../../../services/CommentService";
import type { Post } from "../../../../types/Post";
import type { UserInfo } from "../../../../types/Account";
import { jwtDecode } from "jwt-decode";
import "./profilePost.css";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import MapsUgcOutlinedIcon from "@mui/icons-material/MapsUgcOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import InsertEmoticonOutlinedIcon from "@mui/icons-material/InsertEmoticonOutlined";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import CreatePost from "../create/createPost";
import ReportModal from "../report/reportModal";
import EditPost from "../create/editPost";
import ReactList from "../create/reactList";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import type { ReactType } from "../../../../types/Post";
import type { Comment } from "../../../../types/Post";
import { useNavigate } from "react-router-dom";
import { FollowButton } from "../relationship/follow";
import SharePostModal from "../create/sharePostModal";
import PostDetail from "../post/postDetail";

interface ProfilePostProps {
  email?: string;
  listPostSearch?: any[]; // truyền trực tiếp danh sách post
}

const ListPost: React.FC<ProfilePostProps> = ({ email, listPostSearch }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [openEmojiPicker, setOpenEmojiPicker] = useState<{
    type: "post" | "modal";
    postId?: string;
  } | null>(null);
  const [userReactMap, setUserReactMap] = useState<
    Record<string, "love" | "like" | "haha" | "wow" | "sad" | "angry" | null>
  >({});
  const [userCommentReactMap, setUserCommentReactMap] = useState<
    Record<string, "love" | "like" | "haha" | "wow" | "sad" | "angry" | null>
  >({});
  const [commentPopoverMap, setCommentPopoverMap] = useState<
    Record<string, boolean>
  >({});
  const [postPopoverMap, setPostPopoverMap] = useState<Record<string, boolean>>(
    {}
  );
  const [initializedReactMap, setInitializedReactMap] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState<Record<string, boolean>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [slideIndex, setSlideIndex] = useState<{ [key: string]: number }>({});
  const [isReactModalOpen, setReactModalOpen] = useState(false);
  const [selectedReactPost, setSelectedReactPost] = useState<Post | null>(null);
  const [selectedReactComment, setSelectedReactComment] =
    useState<Comment | null>(null);
  const [reportPost, setReportPost] = useState<Post | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<{
    [key: string]: boolean;
  }>({});
  const [openShareModal, setOpenShareModal] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [originalPostCache, setOriginalPostCache] = useState<
    Record<string, Post>
  >({});
  const [reloadFlag, setReloadFlag] = useState(false);

  const defaultReact: ReactType = {
    love: [],
    like: [],
    haha: [],
    wow: [],
    sad: [],
    angry: [],
  };

  const token = localStorage.getItem("token");
  let currentUserEmail: string | null = email || null;

  if (!currentUserEmail && token) {
    try {
      interface JwtPayload {
        sub: string;
        exp: number;
      }
      const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
      currentUserEmail = decoded.sub;
    } catch (err) {
      console.error("❌ Token không hợp lệ:", err);
    }
  }

  const fetchPosts = async () => {
    try {
      let res;

      if (listPostSearch && listPostSearch.length > 0) {
        setPosts(listPostSearch);
        return;
      }

      if (email) {
        res = await postAPI.getByEmail(email);
      } else {
        res = await postAPI.getAll();
      }

      setPosts(res.post_list || []);
    } catch (err) {
      console.error("❌ Lỗi fetch posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [email, listPostSearch, reloadFlag]);

  useEffect(() => {
    if (!posts.length) return;

    const fetchAllUserInfo = async () => {
      const emailsSet = new Set<string>();
      posts.forEach((post) => {
        emailsSet.add(post.createdBy);
        post.comments?.forEach((cmt) => emailsSet.add(cmt.commentBy));
      });
      const emails = Array.from(emailsSet);

      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const res = await AccountService.get_account_info(email);
            return [email, res] as [string, UserInfo];
          } catch (err) {
            console.error("❌ Lỗi lấy user info:", email, err);
            return [email, null] as [string, UserInfo | null];
          }
        })
      );

      const userMap: Record<string, UserInfo> = {};
      results.forEach(([email, info]) => {
        if (info) userMap[email] = info;
      });
      setUserInfoMap(userMap);
    };

    fetchAllUserInfo();
  }, [posts]);

  useEffect(() => {
    if (!posts.length || !currentUserEmail || initializedReactMap) return;

    const initialMap: Record<
      string,
      "love" | "like" | "haha" | "wow" | "sad" | "angry" | null
    > = {};
    const initialCommentMap: Record<
      string,
      "love" | "like" | "haha" | "wow" | "sad" | "angry" | null
    > = {};

    posts.forEach((post) => {
      const entry = post.react
        ? Object.entries(post.react).find(([_, users]) =>
            (users as string[]).includes(currentUserEmail!)
          )
        : null;

      initialMap[post._id] = entry ? (entry[0] as any) : null;

      post.comments?.forEach((cmt) => {
        const cmtEntry = cmt.reacts
          ? Object.entries(cmt.reacts).find(([_, users]) =>
              (users as string[]).includes(currentUserEmail!)
            )
          : null;

        initialCommentMap[cmt.commentId] = cmtEntry
          ? (cmtEntry[0] as any)
          : null;
      });
    });

    setUserReactMap(initialMap);
    setUserCommentReactMap(initialCommentMap);
    setInitializedReactMap(true);
  }, [posts, currentUserEmail, initializedReactMap]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const newState: Record<string, boolean> = {};
      let changed = false;

      Object.keys(menuRefs.current).forEach((postId) => {
        const ref = menuRefs.current[postId];
        if (ref && !ref.contains(e.target as Node)) {
          if (postMenuOpen[postId]) changed = true;
          newState[postId] = false;
        } else {
          newState[postId] = postMenuOpen[postId];
        }
      });

      if (changed) setPostMenuOpen(newState);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [postMenuOpen]);

  const handleReact = async (
    postId: string,
    type: "love" | "like" | "haha" | "wow" | "sad" | "angry"
  ) => {
    try {
      const response = await postAPI.updateReact(postId, type);
      const updatedReact = response.react;
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, react: updatedReact } : p))
      );
      if (currentUserEmail) {
        const reactedEntry = Object.entries(updatedReact).find(([_, users]) =>
          (users as string[]).includes(currentUserEmail!)
        );
        setUserReactMap((prev) => ({
          ...prev,
          [postId]: reactedEntry ? (reactedEntry[0] as any) : null,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentReact = async (
    postId: string,
    commentId: string,
    type: "love" | "like" | "haha" | "wow" | "sad" | "angry"
  ) => {
    try {
      const response = await CommentService.updateCommentReact(
        postId,
        commentId,
        type
      );
      const updatedReact = response.react;
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id !== postId) return post;
          const updatedComments = post.comments?.map((cmt) =>
            cmt.commentId === commentId ? { ...cmt, reacts: updatedReact } : cmt
          );
          return { ...post, comments: updatedComments };
        })
      );
      const entry = currentUserEmail
        ? Object.entries(updatedReact).find(([_, users]) =>
            (users as string[]).includes(currentUserEmail!)
          )
        : null;
      setUserCommentReactMap((prev) => ({
        ...prev,
        [commentId]: entry ? (entry[0] as any) : null,
      }));
    } catch (err) {
      console.error("❌ Lỗi khi gửi reaction cho comment:", err);
    }
  };
  const getOriginalPost = async (postId: string) => {
    if (originalPostCache[postId]) return originalPostCache[postId];

    const res = await postAPI.getById(postId);
    const data = res.post;

    setOriginalPostCache((prev) => ({ ...prev, [postId]: data }));

    return data;
  };

  const handleAddComment = async (postId: string) => {
    const newComment = commentText[postId]?.trim();
    if (!newComment) return alert("Vui lòng nhập nội dung bình luận!");
    try {
      setOpenEmojiPicker(null);
      await CommentService.addComment({ postId, content: newComment });
      const updated = await postAPI.getById(postId);
      const updatedPost = updated.post || updated;
      setPosts((prev) => prev.map((p) => (p._id === postId ? updatedPost : p)));
      setActivePost(updatedPost);
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error(err);
      alert("Không thể gửi bình luận!");
    }
  };

  const handleEmojiClick = (postId: string, emojiData: EmojiClickData) => {
    setCommentText((prev) => ({
      ...prev,
      [postId]: (prev[postId] || "") + emojiData.emoji,
    }));
    setOpenEmojiPicker(null);
  };
  const openPostDetail = (post: Post) => {
    setActivePost(post);
    setIsPostDetailOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeCommentModal = () => {
    setShowModal(false);
    setActivePost(null);
    document.body.style.overflow = "auto";
  };
  const togglePostMenu = (postId: string) => {
    setPostMenuOpen((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
    setPostMenuOpen((prev) => ({
      ...prev,
      [post._id]: false,
    }));
  };

  const handleDeletePost = async (postId: string) => {
    if (!postId) return;

    const confirmDelete = window.confirm("Bạn có chắc muốn xóa bài viết này?");
    if (!confirmDelete) return;

    try {
      await postAPI.deletePost(postId);
      alert("Xóa bài viết thành công!");
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setPostMenuOpen((prev) => ({ ...prev, [postId]: false }));
    } catch (err) {
      console.error("❌ Lỗi xóa bài viết:", err);
      alert("Xóa bài viết thất bại!");
    }
  };

  const getIndex = (postId: string) => slideIndex[postId] ?? 0;

  const handleNext = (postId: string, total: number) => {
    setSlideIndex((prev) => ({
      ...prev,
      [postId]: (getIndex(postId) + 1) % total,
    }));
  };

  const handlePrev = (postId: string, total: number) => {
    setSlideIndex((prev) => ({
      ...prev,
      [postId]: (getIndex(postId) - 1 + total) % total,
    }));
  };
  const navigate = useNavigate();

  const goToProfile = (email: string) => {
    navigate(`/profile/${email}`);
  };
  const handleReport = (post: Post) => {
    setPostMenuOpen((prev) => ({ ...prev, [post._id]: false }));

    requestAnimationFrame(() => setReportPost(post));
  };

  const truncateWords = (text: string, limit: number) => {
    const words = text.split(" ");
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(" ") + "...";
  };

  const handleShared = () => {
    setReloadFlag((prev) => !prev);
  };

  const handleBlock = async (ownerEmail: string) => {
    if (!currentUserEmail) return;

    try {
      await AccountService.block({
        owner: currentUserEmail,
        client: ownerEmail,
      });

      console.log("Đã chặn:", ownerEmail);

      // 👉 Nếu bạn muốn update UI sau khi chặn:
      setUserInfoMap((prev) => ({
        ...prev,
        [ownerEmail]: {
          ...prev[ownerEmail],
          isBlocked: true,
        },
      }));
    } catch (err) {
      console.error("Block failed:", err);
    }
  };

  const refreshPost = async (postId: string) => {
    const updated = await postAPI.getById(postId);
    const updatedPost = updated.post || updated;

    setPosts((prev) => prev.map((p) => (p._id === postId ? updatedPost : p)));
    setActivePost(updatedPost);
    
  };

  function formatTimeVN(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 3) return `${diffDays} ngày trước`;

    return date.toLocaleString("vi-VN");
  }

  return (
    <div className="profilePost">
      <div className="postSection">
        {posts.map((post) => {
          const isShare = post.postType === "share";
          let originalPost =
            isShare && post.postId
              ? posts.find((p) => p._id === post.postId) ||
                originalPostCache[post.postId] ||
                null
              : null;

          if (isShare && post.postId && !originalPost) {
            getOriginalPost(post.postId);
          }
          const commentCount = post.comments?.length ?? 0;
          return (
            <div className="post" key={post._id}>
              <div className="postInfo" style={{ cursor: "pointer" }}>
                <img
                  className="postInfoImg"
                  src={userInfoMap[post.createdBy]?.avatar || ""}
                  alt="avatar"
                  onClick={() => goToProfile(post.createdBy)}
                />
                <div className="postInfoText">
                  <div
                    className="postInfoName"
                    onClick={() => goToProfile(post.createdBy)}
                  >
                    {userInfoMap[post.createdBy]?.fullName || post.createdBy}
                  </div>
                  <div className="timingInfo">
                    • {post.createdAt ? formatTimeVN(post.createdAt) : ""}
                  </div>
                </div>

                <div className="follow-check">
                  {post.createdBy !== currentUserEmail &&
                    !userInfoMap[post.createdBy]?.followers?.includes(
                      currentUserEmail || ""
                    ) && (
                      <FollowButton
                        ownerEmail={currentUserEmail!}
                        clientEmail={post.createdBy}
                        onFollowSuccess={() => {
                          setUserInfoMap((prev) => ({
                            ...prev,
                            [post.createdBy]: {
                              ...prev[post.createdBy],
                              followers: [
                                ...(prev[post.createdBy]?.followers ?? []),
                                currentUserEmail!,
                              ],
                            },
                          }));
                        }}
                      />
                    )}
                </div>

                <button
                  className="optionPost"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePostMenu(post._id);
                  }}
                >
                  <MoreHorizOutlinedIcon />
                </button>

                <div
                  className="postMenu"
                  ref={(el) => {
                    menuRefs.current[post._id] = el;
                  }}
                >
                  {postMenuOpen[post._id] && (
                    <div className="menuDropdown">
                      {post.createdBy === currentUserEmail ? (
                        <>
                          <div
                            className="menuItem"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post);
                            }}
                          >
                            ✏️ Chỉnh sửa bài đăng
                          </div>
                          <div
                            className="menuItem delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post._id);
                            }}
                          >
                            🗑️ Xóa bài đăng
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className="menuItem"
                            onClick={() => handleReport(post)}
                          >
                            🚩 Báo cáo bài đăng
                          </div>
                          <div
                            className="menuItem block"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlock(post.createdBy);
                              setPostMenuOpen((prev) => ({
                                ...prev,
                                [post._id]: false,
                              }));
                            }}
                          >
                            ⛔ Chặn
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="postTitle">
                <span>{post.title}</span>
              </div>

              <div className="postContent">
                <p>
                  {expandedPosts[post._id]
                    ? post.content
                    : truncateWords(post.content, 100)}
                </p>
                {post.content.split(" ").length > 100 && (
                  <button
                    className="toggleReadMore"
                    onClick={() =>
                      setExpandedPosts((prev) => ({
                        ...prev,
                        [post._id]: !prev[post._id],
                      }))
                    }
                  >
                    {expandedPosts[post._id] ? "Thu gọn" : "Xem thêm"}
                  </button>
                )}
              </div>

              {/* share bai */}
              {isShare && originalPost && (
                <div className="post sharedPost">
                  {originalPost.thumbnails_url &&
                    originalPost.thumbnails_url.length > 0 && (
                      <div className="postImg">
                        <div
                          className="postSlider"
                          style={{
                            transform: `translateX(-${
                              getIndex(originalPost._id) * 100
                            }%)`,
                          }}
                        >
                          {originalPost.thumbnails_url.map((url, idx) => {
                            const fileName =
                              originalPost.thumbnails?.[idx] || "";
                            return (
                              <div className="slide" key={idx}>
                                {/\.mp4|\.mov$/i.test(fileName) ? (
                                  <video className="postVideo" controls>
                                    <source src={url} type="video/mp4" />
                                  </video>
                                ) : (
                                  <img className="postImage" src={url} alt="" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {originalPost.thumbnails_url.length > 1 && (
                          <>
                            {getIndex(originalPost._id) > 0 && (
                              <ChevronLeftOutlinedIcon
                                className="nav-left"
                                onClick={() =>
                                  handlePrev(
                                    originalPost._id,
                                    originalPost.thumbnails_url.length
                                  )
                                }
                              />
                            )}
                            {getIndex(originalPost._id) <
                              originalPost.thumbnails_url.length - 1 && (
                              <ChevronRightOutlinedIcon
                                className="nav-right"
                                onClick={() =>
                                  handleNext(
                                    originalPost._id,
                                    originalPost.thumbnails_url.length
                                  )
                                }
                              />
                            )}
                            <div className="dots-post">
                              {originalPost.thumbnails_url.map((_, idx) => (
                                <span
                                  key={idx}
                                  className={`dot-post ${
                                    idx === getIndex(originalPost._id)
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setSlideIndex((prev) => ({
                                      ...prev,
                                      [originalPost._id]: idx,
                                    }))
                                  }
                                ></span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  <div
                    className="postInfo"
                    style={{ cursor: "pointer", marginTop: "10px" }}
                  >
                    <img
                      className="postInfoImg"
                      src={userInfoMap[originalPost.createdBy]?.avatar || ""}
                      alt="avatar"
                      onClick={() => goToProfile(originalPost.createdBy)}
                    />
                    <div
                      className="postInfoName"
                      onClick={() => goToProfile(originalPost.createdBy)}
                    >
                      {userInfoMap[originalPost.createdBy]?.fullName
                        ? userInfoMap[originalPost.createdBy].fullName
                        : (() => {
                            // Nếu chưa có fullName, gọi API lấy thông tin user
                            AccountService.get_account_info(
                              originalPost.createdBy
                            )
                              .then((info) => {
                                if (info) {
                                  setUserInfoMap((prev) => ({
                                    ...prev,
                                    [originalPost.createdBy]: info,
                                  }));
                                }
                              })
                              .catch((err) =>
                                console.error(
                                  "❌ Lỗi lấy thông tin user gốc:",
                                  err
                                )
                              );
                            // Khi đang load hiển thị email tạm thời
                            return originalPost.createdBy;
                          })()}
                    </div>
                    <div className="timingInfo">
                      •{" "}
                      {originalPost.createdAt
                        ? new Date(originalPost.createdAt).toLocaleString(
                            "vi-VN"
                          )
                        : ""}
                    </div>
                  </div>
                  <div className="postTitle">
                    <span>{originalPost.title}</span>
                  </div>

                  <div className="postContent">
                    <p>
                      {expandedPosts[originalPost._id]
                        ? originalPost.content
                        : truncateWords(originalPost.content, 100)}
                    </p>
                    {originalPost.content.split(" ").length > 100 && (
                      <button
                        className="toggleReadMore"
                        onClick={() =>
                          setExpandedPosts((prev) => ({
                            ...prev,
                            [originalPost._id]: !prev[originalPost._id],
                          }))
                        }
                      >
                        {expandedPosts[originalPost._id]
                          ? "Thu gọn"
                          : "Xem thêm"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {post.thumbnails_url && post.thumbnails_url.length > 0 && (
                <div className="postImg">
                  {/* Slide items */}
                  <div
                    className="postSlider"
                    style={{
                      transform: `translateX(-${getIndex(post._id) * 100}%)`,
                    }}
                  >
                    {post.thumbnails_url.map((url, idx) => {
                      const fileName = post.thumbnails?.[idx] || "";

                      return (
                        <div className="slide" key={idx}>
                          {/\.mp4|\.mov$/i.test(fileName) ? (
                            <video className="postVideo" controls>
                              <source src={url} type="video/mp4" />
                            </video>
                          ) : (
                            <img className="postImage" src={url} alt="" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation buttons */}
                  {post.thumbnails_url.length > 1 && (
                    <>
                      {/* Chỉ hiển thị nút trái nếu không phải slide đầu */}
                      {getIndex(post._id) > 0 && (
                        <ChevronLeftOutlinedIcon
                          className="nav-left"
                          onClick={() =>
                            handlePrev(post._id, post.thumbnails_url.length)
                          }
                        />
                      )}

                      {/* Chỉ hiển thị nút phải nếu chưa phải slide cuối */}
                      {getIndex(post._id) < post.thumbnails_url.length - 1 && (
                        <ChevronRightOutlinedIcon
                          className="nav-right"
                          onClick={() =>
                            handleNext(post._id, post.thumbnails_url.length)
                          }
                        />
                      )}
                    </>
                  )}

                  {/* Dots: chỉ hiển thị nếu nhiều hơn 1 ảnh */}
                  {post.thumbnails_url.length > 1 && (
                    <div className="dots-post">
                      {post.thumbnails_url.map((_, idx) => (
                        <span
                          key={idx}
                          className={`dot-post ${
                            idx === getIndex(post._id) ? "active" : ""
                          }`}
                          onClick={() =>
                            setSlideIndex((prev) => ({
                              ...prev,
                              [post._id]: idx,
                            }))
                          }
                        ></span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="iconBlock">
                <div className="leftIcon">
                  <div
                    className="like-container"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setPostPopoverMap((prev) => ({
                        ...prev,
                        [post._id]: true,
                      }));
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      setPostPopoverMap((prev) => ({
                        ...prev,
                        [post._id]: false,
                      }));
                    }}
                  >
                    <button
                      className={`react-btn ${
                        userReactMap[post._id]
                          ? `active-${userReactMap[post._id]}`
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReact(post._id, "love");
                      }}
                    >
                      {userReactMap[post._id] === "love" ? (
                        "❤️"
                      ) : userReactMap[post._id] === "like" ? (
                        "👍"
                      ) : userReactMap[post._id] === "haha" ? (
                        "😂"
                      ) : userReactMap[post._id] === "wow" ? (
                        "😮"
                      ) : userReactMap[post._id] === "sad" ? (
                        "😢"
                      ) : userReactMap[post._id] === "angry" ? (
                        "😡"
                      ) : (
                        <FavoriteBorderOutlinedIcon />
                      )}
                    </button>

                    {postPopoverMap[post._id] && (
                      <div
                        className="emote-popover"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span onClick={() => handleReact(post._id, "love")}>
                          ❤️
                        </span>
                        <span onClick={() => handleReact(post._id, "like")}>
                          👍
                        </span>
                        <span onClick={() => handleReact(post._id, "haha")}>
                          😂
                        </span>
                        <span onClick={() => handleReact(post._id, "wow")}>
                          😮
                        </span>
                        <span onClick={() => handleReact(post._id, "sad")}>
                          😢
                        </span>
                        <span onClick={() => handleReact(post._id, "angry")}>
                          😡
                        </span>
                      </div>
                    )}
                  </div>

                  <MapsUgcOutlinedIcon
                    sx={{
                      fontSize: "23px",
                      marginLeft: "8px",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPostDetail(post);
                      console.log("bấm", post);
                    }}
                  />

                  {post.createdBy !== currentUserEmail && (
                    <ShareOutlinedIcon
                      sx={{
                        fontSize: "23px",
                        marginLeft: "8px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSharePost(post);
                        setOpenShareModal(true);
                      }}
                    />
                  )}
                </div>
              </div>

              {Object.values(post.react || {}).reduce(
                (s, arr) => s + arr.length,
                0
              ) > 0 && (
                <label
                  className="countReact-Post"
                  onClick={() => {
                    setSelectedReactPost(post);
                    setReactModalOpen(true);
                  }}
                >
                  {Object.values(post.react || {}).reduce(
                    (s, arr) => s + arr.length,
                    0
                  )}{" "}
                  lượt bày tỏ cảm xúc
                </label>
              )}

              <div
                className="commentSection"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="commentInput">
                  <textarea
                    value={commentText[post._id] || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCommentText((prev) => ({
                        ...prev,
                        [post._id]: value,
                      }));
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder={
                      commentCount > 0
                        ? "Bình luận về bài viết này..."
                        : "Hãy là người bình luận đầu tiên!"
                    }
                    className="commentBox"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (post._id) handleAddComment(post._id);
                      }
                    }}
                  />
                  <div className="emojiWrapper">
                    <InsertEmoticonOutlinedIcon
                      sx={{ fontSize: 22, color: "#777", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenEmojiPicker((prev) =>
                          prev?.type === "post" && prev.postId === post._id
                            ? null
                            : { type: "post", postId: post._id }
                        );
                      }}
                    />
                    {openEmojiPicker?.type === "post" &&
                      openEmojiPicker.postId === post._id && (
                        <div className="emojiPickerContainer">
                          <EmojiPicker
                            onEmojiClick={(emojiData) =>
                              handleEmojiClick(post._id, emojiData)
                            }
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {isPostDetailOpen && activePost && (
          <PostDetail
            activePost={activePost}
            onClose={() => setIsPostDetailOpen(false)}
            email={activePost.createdBy}
            onCommentAdded={refreshPost}
          />
        )}

        <CreatePost
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPost(null);
          }}
          editingPost={editingPost}
          onPostSaved={fetchPosts}
        />
        <EditPost
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPost(null);
          }}
          post={editingPost}
          onPostUpdated={fetchPosts}
        />
        <ReportModal
          isOpen={!!reportPost}
          onClose={() => setReportPost(null)}
          post={reportPost}
          type="post"
          violatorEmail={reportPost?.createdBy}
          content={reportPost?.content || ""}
          contentId={reportPost?._id}
          contentParentId=""
        />


        {selectedReactPost && (
          <ReactList
            isOpen={isReactModalOpen}
            onClose={() => setReactModalOpen(false)}
            reacts={selectedReactPost.react ?? defaultReact}
            userInfoMap={userInfoMap}
          />
        )}
        {selectedReactComment && (
          <ReactList
            isOpen={isReactModalOpen}
            onClose={() => setReactModalOpen(false)}
            reacts={selectedReactComment.reacts ?? defaultReact}
            userInfoMap={userInfoMap}
          />
        )}
        <SharePostModal
          isOpen={openShareModal}
          onClose={() => setOpenShareModal(false)}
          postId={sharePost?._id || ""}
          onShared={handleShared} // 👈 thêm dòng này
        />
      </div>
    </div>
  );
};

export default ListPost;
