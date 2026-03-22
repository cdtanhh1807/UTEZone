import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import useChat from "./useChat";
import { useAuth } from "./AuthContext";
import accountAPI from "../../../../services/AccountService";
import "./MessagePanel.css";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";

type Props = {
  otherEmail: string;
};

const MessagePanel: React.FC<Props> = ({ otherEmail }) => {
  const { email: me } = useAuth();
  const { messages, sendMessage } = useChat(otherEmail);
  const [images, setImages] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);

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
          avatar: data.avatar,
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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setImages((prev) => [...prev, ...selected]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
  };

  return (
    <div className={`panel ${anim ? "panel-animate" : ""}`}>
      {/* Header */}
      <div className="panel-header">
        <img
          className="postInfoImg"
          src={userInfo?.avatar}
          alt="avatar"
          style={{ cursor: "pointer" }}
          onClick={() => goToProfile(otherEmail)}
        />

        <div className="postInfoText">
          <div
            className="postInfoName"
            style={{ cursor: "pointer" }}
            onClick={() => goToProfile(otherEmail)}
          >
            {userInfo?.fullName}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body" ref={bodyRef}>
        {messages.slice(1).map((m, i) => (
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
        {/* upload image */}
        <label className="upload-icon">
          <ImageOutlinedIcon />
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleImageUpload}
          />
        </label>

        {/* upload file */}
        <label className="upload-icon">
          <AttachFileOutlinedIcon />
          <input type="file" multiple onChange={handleFileUpload} />
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="chat-input"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <button onClick={onSend}>
          <SendRoundedIcon />
        </button>
      </div>
    </div>
  );
};

export default MessagePanel;
