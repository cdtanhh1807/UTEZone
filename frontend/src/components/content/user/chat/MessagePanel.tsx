import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import useChat from "./useChat";
import { useAuth } from "./AuthContext";
import accountAPI from "../../../../services/AccountService"; 
import "./MessagePanel.css";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

type Props = {
  otherEmail: string;
};

const MessagePanel: React.FC<Props> = ({ otherEmail }) => {
  const { email: me } = useAuth();
  const { messages, sendMessage } = useChat(otherEmail);

  const [text, setText] = useState("");
  const [userInfo, setUserInfo] = useState<{
    fullName: string;
    avatar: string;
  } | null>(null);

  const [anim, setAnim] = useState(false);

  useEffect(() => {
    setAnim(true);
    const t = setTimeout(() => setAnim(false), 350);
    return () => clearTimeout(t);
  }, [otherEmail]);

  const bodyRef = useRef<HTMLDivElement>(null);

  // ⭐ Scroll ngay lập tức xuống cuối khi messages thay đổi (không lướt)
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Load thông tin user
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await accountAPI.get_account_info(otherEmail);
        setUserInfo({
          fullName: data.fullName,
          avatar: data.avatar
        });
      } catch (err) {
        console.error("Lỗi lấy thông tin user:", err);
      }
    };

    fetchInfo();
  }, [otherEmail]);

  const onSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  const goToProfile = (email: string) => {
    window.location.href = `/profile/${email}`;
  };

  return (
    <div className={`panel ${anim ? "panel-animate" : ""}`}>

      {/* Header */}
      <div className="panel-header">
        <img
          className="postInfoImg"
          src={userInfo?.avatar}
          alt="avatar"
          onClick={() => goToProfile(otherEmail)}
        />

        <div className="postInfoText">
          <div
            className="postInfoName"
            onClick={() => goToProfile(otherEmail)}
          >
            {userInfo?.fullName || "Đang tải..."}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`msg-line ${m.sender_email === me ? "me" : "other"}`}
          >
            <span className="msg-bubble">{m.content}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="panel-input">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="chat-input"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();   // Ngăn xuống dòng
              onSend();
            }
          }}
        />
        <button onClick={onSend}><SendRoundedIcon /></button>
      </div>

    </div>
  );
};

export default MessagePanel;
