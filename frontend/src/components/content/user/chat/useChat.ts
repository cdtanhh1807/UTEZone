import { useEffect, useState } from 'react';
import { messageAPI } from './messageService';
import useWebSocket from './useWebSocket';
import { useAuth } from './AuthContext';

export type Message = {
  id?: string;
  sender_email: string;
  receiver_email: string;
  content: string;
  created_at: string;
  mine: boolean;
};

export default function useChat(otherEmail: string) {
  const { email } = useAuth();
  const realtime = useWebSocket(localStorage.getItem('token') || '');
  const [history, setHistory] = useState<Message[]>([]);

  /* ---------- load history ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await messageAPI.getConversation(otherEmail);
      setHistory(data.map((m: any) => ({ ...m, mine: m.sender_email === email })));
    })();
  }, [otherEmail]);

  /* ---------- mark-read khi vừa mở cuộc ---------- */
  useEffect(() => {
    messageAPI.markRead(otherEmail);
  }, [otherEmail]);

  /* ---------- realtime push tin mới ---------- */
  useEffect(() => {
    if (!realtime.length) return;

    realtime.forEach((m) => {
      const isMatch =
        (m.sender_email === otherEmail && m.receiver_email === email) ||
        (m.sender_email === email && m.receiver_email === otherEmail);

      if (isMatch) {
        setHistory((h) => {
          const exists = h.some((x) => x.id === m.id);
          if (exists) return h;
          return [...h, { ...m, mine: m.sender_email === email }];
        });

        // nếu là tin NHẬN -> đánh dấu đã xem luôn
        if (m.sender_email === otherEmail && m.receiver_email === email) {
          messageAPI.markRead(otherEmail);
        }
      }
    });
  }, [realtime, otherEmail, email]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    const opt: Message = {
      sender_email: email,
      receiver_email: otherEmail,
      content,
      created_at: new Date().toISOString(),
      mine: true,
    };
    setHistory((h) => [...h, opt]);
    await messageAPI.send(otherEmail, content);
  };

  // sort tăng dần thời gian
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return { messages: sorted, sendMessage };
}