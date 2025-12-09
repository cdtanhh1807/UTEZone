import "./ChatDialog.css";
import React, { useState, useRef, useEffect } from 'react';
import ConversationList from './ConversationList';
import MessagePanel from './MessagePanel';
import useConversations from './useConversation';
import { messageAPI } from './messageService';

type Props = {
  onClose: () => void;
};

const ChatDialog: React.FC<Props> = ({ onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { list, loading, refetch } = useConversations(selected);

  const handleSelect = async (email: string) => {
    setSelected(email);
    await messageAPI.markRead(email);
    refetch();
  };

  // ⭐ Auto chọn conversation đầu tiên
  useEffect(() => {
    if (list.length > 0 && !selected) {
      handleSelect(list[0].other_email);  // ← SỬA Ở ĐÂY
    }
  }, [list]);

  if (loading) return <div className="loading-box">Đang tải...</div>;

  return (
    <div ref={dialogRef} className="chat-dialog">
      <ConversationList
        list={list}
        selected={selected}
        onSelect={handleSelect}
      />

      {selected && <MessagePanel otherEmail={selected} />}
    </div>
  );
};

export default ChatDialog;
