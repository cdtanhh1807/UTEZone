import './leftSide.css';
import React, { useState, useEffect, useRef } from 'react';
import PostAddIcon from '@mui/icons-material/PostAdd';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SlowMotionVideoIcon from '@mui/icons-material/SlowMotionVideo';
import AddIcon from '@mui/icons-material/Add';
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

import CreatePost from '../create/createPost';
import CreateStory from '../create/createStory';
import AccountService from '../../../../services/AccountService';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const LeftSide = () => {
  const [openCreatePost, setOpenCreatePost] = useState<boolean>(false);
  const [openCreateStory, setOpenCreateStory] = useState<boolean>(false);
  const [openCreateMenu, setOpenCreateMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
    let currentUserEmail: string | null = null;

    if (token) {
      try {
        interface JwtPayload { 
          sub: string; 
          exp: number; 
        }

        const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
        console.log("decoded token:", decoded);
        currentUserEmail = decoded.sub;

      } catch (err) {
        console.error("❌ Token không hợp lệ:", err);
      }
    }
  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await AccountService.logout(token);
      localStorage.removeItem('token');
      navigate('/');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      alert('Đăng xuất không thành công, vui lòng thử lại.');
    }
  };

  const handleOpenCreatePost = () => {
    setOpenCreateMenu(false);
    setOpenCreatePost(true);
  };

  const handleOpenCreateStory = () => {
    setOpenCreateMenu(false);
    setOpenCreateStory(true);
  };

  // -----------------------------
  // CLICK OUTSIDE TO CLOSE MENU
  // -----------------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setOpenCreateMenu(false);
      }
    };

    if (openCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openCreateMenu]);

  return (
    <>
      <div className="leftSidePart">
        <div className="navLinkPart">
          <div
            className="navLink"
            onClick={() => navigate("/home")}
            style={{ cursor: "pointer" }}
          >
            <HomeIcon sx={{ fontSize: '30px', margin: "0 20px 0 0" }} />
            <div className="navName">Trang chủ</div>
          </div>

          {/* CLICK ĐỂ MỞ CREATE MENU */}
          <div
            className="navLink"
            onClick={() => setOpenCreateMenu(prev => !prev)}
            style={{ cursor: "pointer", position: "relative" }}
          >
            <AddIcon sx={{ fontSize: '30px', margin: "0 20px 0 0" }} />
            <div className="navName">Thêm</div>

            {openCreateMenu && (
              <div className="createMenuDropdown" ref={createMenuRef}>
                <div className="createItem" onClick={handleOpenCreatePost}>
                  <div className="option-create">Bài viết</div>
                  <PostAddIcon />
                </div>
                <div className="createItem" onClick={handleOpenCreateStory}>
                  <div className="option-create">Tin</div>
                  <VideoLibraryIcon />
                </div>
              </div>
            )}
          </div>

          <div className="navLink">
            <ChatBubbleOutlineIcon sx={{ fontSize: '30px', margin: "0 20px 0 0" }} />
            <div className="navName">Tin nhắn</div>
          </div>

          <div className="navLink">
            <PeopleOutlineIcon sx={{ fontSize: '30px', margin: "0 20px 0 0" }} />
            <div className="navName">Follower</div>
          </div>

          <div className="bellowPart">
            <div
              className="navLink"
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: '30px', margin: "0 20px 0 0" }} />
              <div className="navName">Đăng xuất</div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CREATE POST */}
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
        />
      )}

    </>
  );
};

export default LeftSide;
