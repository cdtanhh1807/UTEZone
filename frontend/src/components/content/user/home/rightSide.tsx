import { useState, useRef, useEffect } from "react";
import "./rightSide.css";
import ChatDialog from "../chat/ChatDialog";
import type { Post } from "../../../../types/Post";
import PostDetail from "../post/postDetail";
import { postAPI } from "../../../../services/PostService";
import RightFeed from "./rightFeed";
import { useLocation } from "react-router-dom";

export default function RightSide() {
  const [openMessage, setOpenMessage] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isSearchPage = location.pathname === "/search";

  // ================= CLICK OUTSIDE TO CLOSE CHAT =================
  useEffect(() => {
    if (!openMessage) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpenMessage(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMessage]);

  // ================= OPEN POST DETAIL =================
  const openPostDetail = async (post: Post) => {
    try {
      const res = await postAPI.getById(post._id);
      const fullPost = res.post || res;

      setActivePost(fullPost);
      setIsPostDetailOpen(true);
      document.body.style.overflow = "hidden";
    } catch (err) {
      console.error("Không lấy được chi tiết bài viết", err);
    }
  };

  const refreshPost = async (postId: string) => {
    const updated = await postAPI.getById(postId);
    const updatedPost = updated.post || updated;
    setActivePost(updatedPost);
  };

  const openOriginalPost = async (originalPostId: string) => {
    try {
      const res = await postAPI.getById(originalPostId);
      const originalPost = res.post || res;

      setIsPostDetailOpen(false);
      requestAnimationFrame(() => {
        setActivePost(originalPost);
        setIsPostDetailOpen(true);
      });
    } catch (err) {
      console.error("Không lấy được bài viết gốc", err);
    }
  };

  return (
    <div className="rightSide">
      {/* ====== SUGGESTED POSTS ====== */}
      {!isSearchPage && <RightFeed onOpenPostDetail={openPostDetail} />}

      {/* ====== CHAT BUTTON ====== */}
      <button className="floating-ribbon" onClick={() => setOpenMessage(true)}>
        Nhắn tin
      </button>

      {/* ====== CHAT BOX ====== */}
      {openMessage && (
        <div ref={boxRef} className="chat-fixed">
          <ChatDialog onClose={() => setOpenMessage(false)} />
        </div>
      )}

      {/* ====== POST DETAIL ====== */}
      {isPostDetailOpen && activePost && (
        <PostDetail
          activePost={activePost}
          onClose={() => setIsPostDetailOpen(false)}
          onCommentAdded={refreshPost}
          onOpenOriginalPost={openOriginalPost}
        />
      )}
    </div>  
  );
}
