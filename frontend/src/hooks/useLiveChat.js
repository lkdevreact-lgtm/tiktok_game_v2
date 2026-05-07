import { useEffect, useRef, useState } from "react";

const MAX_MESSAGES = 80;
const DEDUP_WINDOW_MS = 1000; // bỏ qua message trùng trong 1s

// Global counter để debug xem listener được gắn bao nhiêu lần
let _attachCount = 0;

/**
 * Hook lắng nghe các sự kiện TikTok Live từ Socket.IO
 * và tích lũy messages cho LiveChatOverlay.
 * Có deduplication để tránh hiển thị trùng lặp.
 *
 * @param {import('socket.io-client').Socket | null} socket
 * @returns {{ messages: Array }}
 */
export function useLiveChat(socket) {
  const [messages, setMessages] = useState([]);
  const idCounter = useRef(0);
  // Dedup: lưu hash của message gần đây để phát hiện duplicate
  const recentHashesRef = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    _attachCount++;
    const myAttachId = _attachCount;
    console.log(`[useLiveChat] attaching listeners (attach #${myAttachId}), socket.id=${socket.id}`);

    /**
     * Tạo hash từ message — KHÔNG dùng timestamp vì backend có thể
     * gửi cùng 1 event 2 lần với timestamp khác nhau.
     */
    const hashMsg = (msg) => {
      return `${msg.type}|${msg.username}|${msg.comment || ""}|${msg.giftId || ""}|${msg.giftName || ""}|${msg.repeatCount || ""}`;
    };

    const push = (msg) => {
      const hash = hashMsg(msg);

      // Debug: log mỗi event nhận được
      console.log(`[useLiveChat #${myAttachId}] received ${msg.type}:`, hash);

      // Nếu message này đã xuất hiện trong DEDUP_WINDOW_MS → bỏ qua
      if (recentHashesRef.current.has(hash)) {
        console.log(`[useLiveChat #${myAttachId}] DUPLICATE blocked:`, hash);
        return;
      }

      // Đánh dấu hash và tự xoá sau DEDUP_WINDOW_MS
      recentHashesRef.current.add(hash);
      setTimeout(() => {
        recentHashesRef.current.delete(hash);
      }, DEDUP_WINDOW_MS);

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
      console.log(`[useLiveChat] removing listeners (attach #${myAttachId})`);
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
