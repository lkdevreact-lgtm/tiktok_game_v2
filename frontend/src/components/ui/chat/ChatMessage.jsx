import ChatAvatar from "./ChatAvatar";

/**
 * Render 1 message trong LiveChatOverlay.
 * Tuỳ theo type mà hiển thị khác nhau.
 */
const ChatMessage = ({ message }) => {
  switch (message.type) {
    case "chat":
      return <ChatBubble msg={message} />;
    case "gift":
      return <GiftBubble msg={message} />;
    case "like":
      return <EventBubble msg={message} text="đã thả ❤️" color="text-pink-400" />;
    case "share":
      return <EventBubble msg={message} text="đã chia sẻ livestream 🔗" color="text-blue-400" />;
    case "follow":
      return <EventBubble msg={message} text="đã follow 🎉" color="text-purple-400" />;
    case "member":
      return <EventBubble msg={message} text="đã tham gia 👋" color="text-slate-400" />;
    default:
      return null;
  }
};

/* ── Chat (comment) ────────────────────────────────────── */
const ChatBubble = ({ msg }) => (
  <div className="group flex items-start gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
    <ChatAvatar src={msg.profilePictureUrl} alt={msg.nickname} />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-1.5">
        <span className="truncate text-xs font-bold text-cyan-300">
          {msg.nickname}
        </span>
        <span className="shrink-0 text-[10px] text-slate-500">
          @{msg.username}
        </span>
      </div>
      <p className="mt-0.5 break-words text-xs text-white/90 leading-relaxed">
        {msg.comment}
      </p>
    </div>
  </div>
);

/* ── Gift ──────────────────────────────────────────────── */
const GiftBubble = ({ msg }) => (
  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
    <ChatAvatar src={msg.profilePictureUrl} alt={msg.nickname} />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-1.5">
        <span className="truncate text-xs font-bold text-amber-300">
          {msg.nickname}
        </span>
        <span className="shrink-0 text-[10px] text-slate-500">
          @{msg.username}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
        <span className="text-amber-200">
          🎁 Tặng {msg.repeatCount > 1 ? `x${msg.repeatCount} ` : ""}
        </span>
        {msg.giftPictureUrl && (
          <img
            src={msg.giftPictureUrl}
            alt={msg.giftName}
            className="h-4 w-4 object-contain"
          />
        )}
        <span className="font-semibold text-amber-100">{msg.giftName}</span>
        {msg.diamondCount > 0 && (
          <span className="text-[10px] text-amber-400/70">
            ({msg.diamondCount}💎)
          </span>
        )}
      </div>
    </div>
  </div>
);

/* ── Event chung (like, share, follow, member) ─────────── */
const EventBubble = ({ msg, text, color }) => (
  <div className="flex items-center gap-2 px-1.5 py-0.5">
    <ChatAvatar src={msg.profilePictureUrl} alt={msg.nickname} size="sm" />
    <p className={`text-[11px] ${color}`}>
      <span className="font-semibold text-white/70">{msg.nickname}</span>{" "}
      {text}
    </p>
  </div>
);

export default ChatMessage;
