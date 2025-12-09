import { useState, useRef, useEffect } from "react";
import "./rightSide.css";
import ChatDialog from "../chat/ChatDialog";

export default function RightSide() {
  const [openMessage, setOpenMessage] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // CLICK RA NGOÀI
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
  );
}
