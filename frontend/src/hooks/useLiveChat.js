import { useEffect, useRef, useState } from "react";

const MAX_MESSAGES = 80;

/**
 * Hook lắng nghe các sự kiện TikTok Live từ Socket.IO
 * và tích lũy messages cho LiveChatOverlay.
 *
 * @param {import('socket.io-client').Socket | null} socket
 * @returns {{ messages: Array }}
 */
export function useLiveChat(socket) {
  const [messages, setMessages] = useState([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const push = (msg) => {
      idCounter.current += 1;
      setMessages((prev) => {
        const next = [...prev, { ...msg, _id: idCounter.current }];
        // Giữ tối đa MAX_MESSAGES để không leak memory
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    };

    const onChat = (data) => push(data);
    const onGift = (data) => push(data);
    const onLike = (data) => push(data);
    const onShare = (data) => push(data);
    const onFollow = (data) => push(data);
    const onMember = (data) => push(data);

    socket.on("tiktok:chat", onChat);
    socket.on("tiktok:gift", onGift);
    socket.on("tiktok:like", onLike);
    socket.on("tiktok:share", onShare);
    socket.on("tiktok:follow", onFollow);
    socket.on("tiktok:member", onMember);

    return () => {
      socket.off("tiktok:chat", onChat);
      socket.off("tiktok:gift", onGift);
      socket.off("tiktok:like", onLike);
      socket.off("tiktok:share", onShare);
      socket.off("tiktok:follow", onFollow);
      socket.off("tiktok:member", onMember);
    };
  }, [socket]);

  return { messages };
}
