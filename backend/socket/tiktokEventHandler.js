import { getIO } from "./socketManager.js";

/**
 * Trích xuất thông tin user từ event data của tiktok-live-connector.
 * v2 có thể trả user info ở root hoặc nested trong .user
 */
function pickAvatar(u = {}) {
  if (typeof u === "string") return u;
  return (
    u.profilePictureUrl ||
    u.profilePicture?.urls?.[0] ||
    u.profilePicture?.urlList?.[0] ||
    u.profilePicture?.url_list?.[0] ||
    u.avatarThumb?.urls?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarThumb?.url_list?.[0] ||
    u.avatarMedium?.urls?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    u.avatarMedium?.url_list?.[0] ||
    u.avatarLarger?.urls?.[0] ||
    u.avatarLarger?.urlList?.[0] ||
    u.avatarLarger?.url_list?.[0] ||
    ""
  );
}

function extractUser(data) {
  const user = data.user || data;
  return {
    username: user.uniqueId || user.unique_id || data.uniqueId || "",
    nickname: user.nickname || data.nickname || "",
    profilePictureUrl: pickAvatar(user) || pickAvatar(data),
  };
}

// Danh sách event names mà chúng ta gắn listener lên TikTok connection.
// Dùng để removeAllListeners trước khi gắn mới → tránh duplicate.
const MANAGED_EVENTS = ["chat", "gift", "like", "share", "follow", "member"];

/**
 * Gắn event listeners lên TikTokLiveConnection,
 * broadcast tất cả sự kiện (chat, gift, like, share, follow, member)
 * tới tất cả clients qua Socket.IO.
 *
 * Luôn xoá listeners cũ trước khi gắn mới → KHÔNG BAO GIỜ bị duplicate.
 *
 * @param {import('tiktok-live-connector').TikTokLiveConnection} connection
 * @param {string} username
 */
export function attachTikTokEvents(connection, username) {
  const io = getIO();
  if (!io) {
    console.warn("[tiktokEventHandler] Socket.IO chưa khởi tạo, bỏ qua.");
    return;
  }

  // ⚡ XOÁ TẤT CẢ listeners cũ cho các events chúng ta quản lý
  // → triệt để tránh duplicate dù hàm này bị gọi nhiều lần
  for (const evt of MANAGED_EVENTS) {
    connection.removeAllListeners(evt);
  }
  console.log(`[tiktokEventHandler] cleared old listeners, attaching fresh for @${username}`);

  // ── Chat (comment) ──────────────────────────────────────
  connection.on("chat", (data) => {
    // console.log("[tiktok:chat] raw keys:", Object.keys(data));
    const user = extractUser(data);
    io.emit("tiktok:chat", {
      type: "chat",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      comment: data.comment || data.content || "",
      timestamp: Date.now(),
    });
  });

  // ── Gift ────────────────────────────────────────────────
  connection.on("gift", (data) => {
    console.log("[tiktok:gift] raw data:", JSON.stringify({
      giftId: data.giftId,
      giftName: data.giftName,
      describe: data.describe,
      gift_name: data.gift_name,
      giftType: data.giftType,
      repeatEnd: data.repeatEnd,
      repeatCount: data.repeatCount,
      diamondCount: data.diamondCount,
    }));
    // tiktok-live-connector gửi gift với repeatEnd = true khi streak kết thúc
    // hoặc gift loại 1 (non-streak) luôn có repeatEnd = true
    if (data.giftType === 1 && !data.repeatEnd) return;

    const user = extractUser(data);
    const giftName = data.giftName || data.gift_name || data.describe || data.giftDetails?.giftName || "Gift";
    const giftPicture = data.giftPictureUrl || data.giftDetails?.giftPictureUrl || data.image?.url_list?.[0] || data.image?.urlList?.[0] || "";

    io.emit("tiktok:gift", {
      type: "gift",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      giftId: data.giftId,
      giftName,
      giftPictureUrl: giftPicture,
      diamondCount: data.diamondCount || data.diamond_count || 0,
      repeatCount: data.repeatCount || data.repeat_count || 1,
      timestamp: Date.now(),
    });
  });

  // ── Like ────────────────────────────────────────────────
  connection.on("like", (data) => {
    const user = extractUser(data);
    io.emit("tiktok:like", {
      type: "like",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      likeCount: data.likeCount || data.like_count || 1,
      timestamp: Date.now(),
    });
  });

  // ── Share ───────────────────────────────────────────────
  connection.on("share", (data) => {
    const user = extractUser(data);
    io.emit("tiktok:share", {
      type: "share",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      timestamp: Date.now(),
    });
  });

  // ── Follow ──────────────────────────────────────────────
  connection.on("follow", (data) => {
    const user = extractUser(data);
    io.emit("tiktok:follow", {
      type: "follow",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      timestamp: Date.now(),
    });
  });

  // ── Member join (ai đó vào live) ───────────────────────
  connection.on("member", (data) => {
    const user = extractUser(data);
    io.emit("tiktok:member", {
      type: "member",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      timestamp: Date.now(),
    });
  });

  console.log(`[tiktokEventHandler] attached events for @${username}`);
}
