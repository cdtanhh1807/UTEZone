import React from 'react';
import type { Conversation } from './useConversation';
import "./ConversationList.css";

type Props = {
  list: Conversation[];
  selected: string | null;
  onSelect: (email: string) => void;
};

const ConversationList: React.FC<Props> = ({ list, selected, onSelect }) => (
  <div className="conv-list-container">
    {list.map((c) => {
      const isActive = c.other_email === selected;
      return (
        <div
          key={c.other_email}
          onClick={() => onSelect(c.other_email)}
          className={`conv-item ${isActive ? "active" : ""} ${c.has_new ? "new-msg" : ""}`}
        >
          <div className="conv-row">
            <span className="conv-name">{c.full_name}</span>

            {c.has_new && <span className="conv-dot" />}
          </div>

          {!isActive && (
            <div className="conv-last-msg">
              {c.last_message}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default ConversationList;
