import "./profileHeader.css";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import AccountService from "../../../../services/AccountService";
import type { UserInfo } from "../../../../types/Account";
import EditProfileModal from "./editProfileModal";
import { FollowButton } from "../relationship/follow";
import { UnFollowButton } from "../relationship/unfollow";
import type { Post } from "../../../../types/Post";
import { postAPI } from "../../../../services/PostService";
import EditIcon from '@mui/icons-material/Edit';

interface ProfileHeaderProps {
  email?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ email }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
   const [posts, setPosts] = useState<Post[]>([]);

  let token = localStorage.getItem("token");
  interface JwtPayload { sub: string; exp: number }
  let decodedEmail: string | null = null;

  if (token) {
    try {
      const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
      decodedEmail = decoded.sub;
    } catch (err) {
      console.error("❌ Token không hợp lệ:", err);
    }
  }
  const currentUserEmail: string | null = email || decodedEmail;

  useEffect(() => {
    const fetchUser = async () => {
      if (!currentUserEmail) {
        console.error("❌ Không có email để fetch thông tin người dùng");
        setLoading(false);
        return;
      }

      try {
        const res = await AccountService.get_account_info(currentUserEmail);
        setUser(res || null);
        let ress;
          ress = await postAPI.getByEmail(currentUserEmail);
        setPosts(ress.post_list || []);
      } catch (err) {
        console.error("❌ Lỗi gọi API account_info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [currentUserEmail]);


  if (loading) return <div>Đang tải...</div>;
  if (!user) return <div>Không tìm thấy thông tin người dùng.</div>;

  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.followed?.length || 0;
  const postsCount = posts?.length || 0;

  const isCurrentUser = decodedEmail === currentUserEmail;

  // Kiểm tra đã follow chưa
  const hasFollowed = user?.followers?.includes(decodedEmail || "") || false;

  return (
    <>
      <div className="profileHeader">
        <div className="header-imageDIv">
          <img className="profile-avatar" src={user.avatar || ""} alt="avatar" />
        </div>

        <div className="profile-info">
          <div className="profile-username-time">
            <span className="profile-username">
              {user.fullName}
            </span>

            {isCurrentUser ? (
              <button
                className="btn-edit-profile"
                onClick={() => setIsModalOpen(true)}
              >
                  <EditIcon sx={{ fontSize: 15 }} />
              </button>
            ) : (
              <>
                {hasFollowed ? (
                <UnFollowButton
                  ownerEmail={decodedEmail || ""}
                  clientEmail={currentUserEmail || ""}
                  onUnFollowSuccess={() => {
                    setUser(prev => prev 
                      ? { 
                          ...prev, 
                          followers: (prev.followers ?? []).filter(f => f !== decodedEmail) 
                        } 
                      : prev
                    );
                  }}
                />
              ) : (
                <FollowButton
                  ownerEmail={decodedEmail || ""}
                  clientEmail={currentUserEmail || ""}
                  onFollowSuccess={() => {
                    setUser(prev => prev 
                      ? { 
                          ...prev, 
                          followers: [...(prev.followers ?? []), decodedEmail || ""] 
                        } 
                      : prev
                    );
                  }}
                />
              )}
                <button className="btn-message">Nhắn tin</button>
              </>
            )}
          </div>

          <div className="profile-overview">
            <div className="number">
              <span className="count">{postsCount}</span>
              <span className="label">Bài viết</span>
            </div>
            <div className="number">
              <span className="count">{followersCount}</span>
              <span className="label">Người theo dõi</span>
            </div>
            <div className="number">
              <span className="count">{followingCount}</span>
              <span className="label">Đang theo dõi</span>
            </div>
          </div>

          <div className="profile-description">
            <span className="full-name">KHOA {user.department || ""}</span>
            <span className="bio">{user.description || "Chưa cập nhật bio"}</span>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default ProfileHeader;
