import React, { useEffect, useState } from "react";
import { announceAPI } from "../../../../services/AnnounceService";
import AccountService from "../../../../services/AccountService";
import "./notificationModal.css";
import { jwtDecode } from "jwt-decode";
import AppealModal from "../appeal/appealModal";

interface Announce {
  _id: string;
  receiverEmail: string;
  senderEmail: string;
  type: string;
  contentAnnounce: string;
  isRead: boolean;
  createdAt: string;
  contentId?: string;
  contentParentId?: string;
  content?: string;
  policyName?: string | null;
}

interface SenderInfo {
  fullName: string;
  avatar: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Announce[]>([]);
  const [senderInfoMap, setSenderInfoMap] = useState<Record<string, SenderInfo>>({});
  const [loading, setLoading] = useState(false);

  // --- STATE MỚI ---
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Announce | null>(null);

  const token = localStorage.getItem("token");
  let currentUserEmail: string | null = null;

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

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    announceAPI
      .getAllAnnounce()
      .then(async (res) => {
        let dataArray: Announce[] = Array.isArray(res.announce_list)
          ? res.announce_list
          : [];

        if (currentUserEmail) {
          dataArray = dataArray.filter((item) => item.senderEmail !== currentUserEmail);
        }

        setNotifications(dataArray.reverse());

        const senderEmails = Array.from(new Set(dataArray.map((item) => item.senderEmail)));
        const infoMap: Record<string, SenderInfo> = {};

        await Promise.all(
          senderEmails.map(async (email) => {
            try {
              const resAcc = await AccountService.get_account_info(email);
              infoMap[email] = {
                fullName: resAcc.fullName,
                avatar: resAcc.avatar,
              };
            } catch {
              infoMap[email] = { fullName: email, avatar: "" };
            }
          })
        );

        setSenderInfoMap(infoMap);
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentUserEmail]);

  if (!isOpen) return null;

  const handleNotificationClick = (item: Announce) => {
    if (item.type === "report") {
      setSelectedReport(item);
      setIsAppealModalOpen(true);
      return;
    }

    if (item.type === "post") {
      console.log("🔵 Mở bài viết theo contentId:", item.contentId);
      return;
    }

    if (item.type === "comment") {
      console.log("🟢 Mở bình luận theo contentParentId:", item.contentParentId);
      return;
    }
  };

  return (
    <>
      <div className="notificationContainer" onClick={onClose}>
        <div className="notificationModal" onClick={(e) => e.stopPropagation()}>
          <h3>Thông báo</h3>

          <div className="notificationList">
            {loading && <p>Đang tải...</p>}
            {!loading && notifications.length === 0 && <p>Chưa có thông báo</p>}

            {!loading &&
              notifications.map((item) => {
                const sender = senderInfoMap[item.senderEmail];

                return (
                  <div
                    className="notificationItem"
                    key={item._id}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {sender?.avatar && (
                      <img src={sender.avatar} alt={sender.fullName} className="notificationAvatar" />
                    )}

                    <div className="notificationContent">
                      <p>{item.contentAnnounce}</p>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* --- APPEAL MODAL --- */}
      <AppealModal
        isOpen={isAppealModalOpen}
        reportData={selectedReport}
        onClose={() => setIsAppealModalOpen(false)}
        onSubmit={(appealText) => {
          console.log("📨 gửi khiếu nại:", appealText, selectedReport);
          alert("Đã gửi khiếu nại!");
        }}
      />
    </>
  );
};

export default NotificationModal;
