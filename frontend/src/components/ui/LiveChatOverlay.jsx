import { useEffect, useRef, useState, useCallback } from "react";
import { useLiveChat } from "../../hooks/useLiveChat";
import ChatMessage from "./chat/ChatMessage";
import { IoChevronDown, IoChevronUp, IoChatbubbles } from "react-icons/io5";

const LiveChatOverlay = ({ socket }) => {
  const { messages } = useLiveChat(socket);
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const connected = !!socket?.connected;

  // Drag state
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Set initial position (bottom-right)
  useEffect(() => {
    if (initialized || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPos({
      x: window.innerWidth - rect.width - 16,
      y: window.innerHeight - rect.height - 16,
    });
    setInitialized(true);
  }, [initialized]);

  // Drag handlers (chỉ kéo bằng header)
  const onPointerDown = useCallback((e) => {
    if (!panelRef.current) return;
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

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
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        touchAction: "none",
      }}
      className="pointer-events-auto flex w-80 flex-col select-none"
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: dragging.current ? "grabbing" : "grab" }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between rounded-t-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md transition hover:bg-black/80"
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
      </div>

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
