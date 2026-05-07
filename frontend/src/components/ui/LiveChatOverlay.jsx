import { useEffect, useRef, useState } from "react";
import { useLiveChat } from "../../hooks/useLiveChat";
import ChatMessage from "./chat/ChatMessage";
import { IoChevronDown, IoChevronUp, IoChatbubbles } from "react-icons/io5";

const LiveChatOverlay = ({ socket }) => {
  const { messages } = useLiveChat(socket);
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const connected = !!socket?.connected;

  // Auto-scroll khi có message mới
  useEffect(() => {
    if (!autoScroll || collapsed) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, autoScroll, collapsed]);

  // Detect user scroll lên → tắt auto-scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[9999] flex flex-col w-80">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between rounded-t-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md transition hover:bg-black/80"
      >
        <div className="flex items-center gap-2">
          <IoChatbubbles className="text-pink-400" size={16} />
          <span className="text-xs font-bold text-white tracking-wide">
            TikTok Live Chat
          </span>
          {connected && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {messages.length} msg
          </span>
          {collapsed ? (
            <IoChevronUp className="text-slate-400" size={14} />
          ) : (
            <IoChevronDown className="text-slate-400" size={14} />
          )}
        </div>
      </button>

      {/* Chat body */}
      {!collapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-72 flex-col gap-0.5 overflow-y-auto rounded-b-xl border border-t-0 border-white/10 bg-black/60 px-2 py-2 backdrop-blur-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              {connected
                ? "Đang chờ chat từ TikTok Live..."
                : "Chưa kết nối TikTok Live"}
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg._id} message={msg} />
            ))
          )}

          {/* Nút scroll xuống khi user cuộn lên */}
          {!autoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                const el = scrollRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="sticky bottom-0 mx-auto rounded-full bg-blue-600/80 px-3 py-1 text-[10px] font-semibold text-white shadow-lg transition hover:bg-blue-500"
            >
              ↓ Tin mới
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveChatOverlay;
