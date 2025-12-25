import "./leftSide.css";
import React, { useState, useEffect, useRef } from "react";
import PostAddIcon from "@mui/icons-material/PostAdd";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { StoryService } from "../../../../services/StoryService";

import CreatePost from "../create/createPost";
import CreateStory from "../create/createStory";
import RelationshipModal from "../relationship/listRelationship";
import AccountService from "../../../../services/AccountService";
import type { Story } from "../../../../types/Story";
import { useNavigate } from "react-router-dom";
import { ToastService } from "../../../../services/ToastService";
import { jwtDecode } from "jwt-decode";

const LeftSide = () => {
  const [openCreatePost, setOpenCreatePost] = useState<boolean>(false);
  const [openCreateStory, setOpenCreateStory] = useState<boolean>(false);
  const [openCreateMenu, setOpenCreateMenu] = useState(false);

  const [isRelationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState(0);

  const [followersPreview, setFollowersPreview] = useState<any[]>([]);
  const [followedPreview, setFollowedPreview] = useState<any[]>([]);
  const [storys, setStorys] = useState<UserStory[]>([]);
  interface UserStory {
    userId: string;
    stories: Story[];
  }

  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  let currentUserEmail: string | null = null;

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      currentUserEmail = decoded.sub;
    } catch (err) {
      console.error("❌ Token không hợp lệ:", err);
    }
  }

  const canCreateContent = () => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      return decoded.per?.[0] === "1";
    } catch {
      return false;
    }
  };

  // Fetch preview data (top 2 followers/followed)
  useEffect(() => {
    const fetchRelations = async () => {
      if (currentUserEmail) {
        try {
          const relation = await AccountService.get_account_relation(
            currentUserEmail
          );

          const getDetails = async (emails: string[]) => {
            const topEmails = emails.slice(0, 2);
            return Promise.all(
              topEmails.map(async (email) => {
                const info = await AccountService.get_account_info(email);
                return { email, fullName: info.fullName, avatar: info.avatar };
              })
            );
          };

          setFollowersPreview(await getDetails(relation.followers || []));
          setFollowedPreview(await getDetails(relation.followed || []));
        } catch (error) {
          console.error("Lỗi lấy preview quan hệ:", error);
        }
      }
    };
    fetchRelations();
  }, [currentUserEmail, isRelationshipModalOpen]); // Reload preview khi modal đóng (có thể có thay đổi)

  const handleLogout = async () => {
    if (!token) return;
    try {
      await AccountService.logout(token);
      localStorage.removeItem("token");
      navigate("/login");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  const handleOpenModal = (tabIndex: number) => {
    setModalTab(tabIndex);
    setRelationshipModalOpen(true);
  };

  // Helper render cho từng nhóm (Followers/Followed)
  const renderRelationSection = (
    title: string,
    list: any[],
    tabIndex: number
  ) => (
    <div className="side-rel-section">
      <div className="side-rel-header">
        <span className="side-rel-title">{title}</span>
        <ArrowForwardIosIcon
          className="side-rel-arrow"
          onClick={() => handleOpenModal(tabIndex)}
        />
      </div>
      <div className="side-rel-list">
        {list.map((user) => (
          <div
            key={user.email}
            className="side-rel-item"
            onClick={() => navigate(`/profile/${user.email}`)}
          >
            <img
              src={user.avatar || "/default-avatar.png"}
              alt=""
              className="side-rel-avatar"
            />
            <span className="side-rel-name">{user.fullName}</span>
          </div>
        ))}
        {list.length === 0 && <span className="side-rel-empty">Trống</span>}
      </div>
    </div>
  );

  const fetchStorys = async () => {
    try {
      const res = await StoryService.getTodayStories();
      console.log(res);
      setStorys(res.data);
    } catch (err) {
      console.error("❌ Lỗi fetch stories:", err);
    }
  };

  useEffect(() => {
    fetchStorys();
  }, []);
  const handleStoryCreated = async () => {
  };

  return (
    <>
      <div className="leftSidePart">
        <div className="navLinkPart">
          {/* Trang chủ */}
          <div
            className="navLink"
            onClick={() => navigate("/home")}
            style={{ cursor: "pointer" }}
          >
            <HomeIcon sx={{ fontSize: "30px", margin: "0 20px 0 0" }} />
            <div className="navName">Trang chủ</div>
          </div>

          {/* Nút Thêm */}
          <div
            className="navLink"
            onClick={() => {
              if (!canCreateContent()) {
                ToastService.error(
                  "Tài khoản của bạn đã bị cấm đăng tải nội dung"
                );
                return;
              }
              setOpenCreateMenu((prev) => !prev);
            }}
            style={{ cursor: "pointer", position: "relative" }}
          >
            <AddIcon sx={{ fontSize: "30px", margin: "0 20px 0 0" }} />
            <div className="navName">Thêm</div>

            {openCreateMenu && (
              <div className="createMenuDropdown" ref={createMenuRef}>
                <div
                  className="createItem"
                  onClick={() => {
                    if (!canCreateContent()) {
                      ToastService.error(
                        "Tài khoản của bạn đã bị cấm đăng tải nội dung"
                      );
                      return;
                    }
                    setOpenCreateMenu(false);
                    setOpenCreatePost(true);
                  }}
                >
                  <div className="option-create">Bài viết</div>
                  <PostAddIcon />
                </div>

                <div
                  className="createItem"
                  onClick={() => {
                    if (!canCreateContent()) {
                      ToastService.error(
                        "Tài khoản của bạn đã bị cấm đăng tải nội dung"
                      );
                      return;
                    }
                    setOpenCreateMenu(false);
                    setOpenCreateStory(true);
                  }}
                >
                  <div className="option-create">Tin</div>
                  <VideoLibraryIcon />
                </div>
              </div>
            )}
          </div>

          {/* PHẦN MỚI: THEO DÕI & ĐANG THEO DÕI */}
          <div className="sidebar-relations-container">
            {renderRelationSection("Theo dõi", followersPreview, 0)}
            <div className="side-divider" />
            {renderRelationSection("Đang theo dõi", followedPreview, 1)}
          </div>

          <div className="bellowPart">
            <div
              className="navLink"
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <LogoutOutlinedIcon
                sx={{ fontSize: "30px", margin: "0 20px 0 0" }}
              />
              <div className="navName">Đăng xuất</div>
            </div>
          </div>
        </div>
      </div>

      <CreatePost
        isOpen={openCreatePost}
        onClose={() => setOpenCreatePost(false)}
        onPostSaved={() => window.location.reload()}
      />
      {openCreateStory && (
        <CreateStory
          isOpen={openCreateStory}
          onClose={() => setOpenCreateStory(false)}
          currentUser={currentUserEmail || ""}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {currentUserEmail && (
        <RelationshipModal
          isOpen={isRelationshipModalOpen}
          onClose={() => setRelationshipModalOpen(false)}
          profileEmail={currentUserEmail}
          myEmail={currentUserEmail}
          initialTab={modalTab}
        />
      )}
    </>
  );
};

export default LeftSide;
