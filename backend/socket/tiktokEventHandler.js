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

// Track connections that already have listeners attached to prevent duplicates
const attachedConnections = new WeakSet();

/**
 * Gắn event listeners lên TikTokLiveConnection,
 * broadcast tất cả sự kiện (chat, gift, like, share, follow, member)
 * tới tất cả clients qua Socket.IO.
 *
 * Sẽ skip nếu connection đã được gắn listeners rồi (tránh duplicate).
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

  // Nếu connection này đã được gắn listeners → skip để tránh duplicate
  if (attachedConnections.has(connection)) {
    console.log(`[tiktokEventHandler] events already attached for @${username}, skipping.`);
    return;
  }
  attachedConnections.add(connection);

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
    // console.log("[tiktok:gift] raw keys:", Object.keys(data));
    // tiktok-live-connector gửi gift với repeatEnd = true khi streak kết thúc
    // hoặc gift loại 1 (non-streak) luôn có repeatEnd = true
    if (data.giftType === 1 && !data.repeatEnd) return;

    const user = extractUser(data);
    io.emit("tiktok:gift", {
      type: "gift",
      username: user.username,
      nickname: user.nickname,
      profilePictureUrl: user.profilePictureUrl,
      giftId: data.giftId,
      giftName: data.giftName || data.describe || "Gift",
      giftPictureUrl: data.giftPictureUrl || data.image?.url_list?.[0] || "",
      diamondCount: data.diamondCount,
      repeatCount: data.repeatCount || 1,
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
