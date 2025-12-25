// Profile.tsx
import { useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import ProfileHeader from "./profileHeader";
import ListPost from "./profilePost";
import ChatDialog from "../chat/ChatDialog";

function Profile() {
  const { email } = useParams<{ email: string }>();
  const [openMessage, setOpenMessage] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="my-profile">
      {/* ===== MAIN CONTENT ===== */}
      <div className="profile-main">
        <div className="header">
          <ProfileHeader email={email} />
        </div>

        <div className="p-post">
          <ListPost email={email} />
        </div>
      </div>

      {/* ===== RIGHT SIDE ===== */}
      <div className="rightSide">
        <button
          className="floating-ribbon"
          onClick={() => setOpenMessage(true)}
        >
          Nhắn tin
        </button>

        {openMessage && (
          <div ref={boxRef} className="chat-fixed">
            <ChatDialog onClose={() => setOpenMessage(false)} />
          </div>
        )}
      </div>
    </div>
  );
}


export default Profile;
