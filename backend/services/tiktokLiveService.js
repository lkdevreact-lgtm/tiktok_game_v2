import { TikTokLiveConnection } from "tiktok-live-connector";

// Map<username, TikTokLiveConnection>: giữ kết nối đang sống để FE
// gọi /connect là kết nối thật, gọi /disconnect là đóng đúng instance.
const activeConnections = new Map();

const USERNAME_REGEX = /^[a-zA-Z0-9._]{2,24}$/;

export function normalizeUsername(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(username) {
  if (!username) return "Username không được để trống.";
  if (!USERNAME_REGEX.test(username)) {
    return "Username TikTok không hợp lệ (2-24 ký tự, chỉ gồm chữ, số, dấu chấm hoặc gạch dưới).";
  }
  return null;
}

// Phân loại lỗi từ tiktok-live-connector thành lý do người dùng đọc được.
function describeError(err) {
  const raw = (err && (err.message || err.toString())) || "Lỗi không xác định";
  const lower = raw.toLowerCase();

  if (lower.includes("user_not_found") || lower.includes("usernotfound")) {
    return "Không tìm thấy người dùng TikTok với username này.";
  }
  if (lower.includes("offline") || lower.includes("not live") || lower.includes("isn't online") || lower.includes("not online")) {
    return "Người dùng này hiện không livestream.";
  }
  if (lower.includes("already connected") || lower.includes("already_connected")) {
    return "Đã có một phiên kết nối tới username này đang chạy.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Bị giới hạn tốc độ bởi TikTok, vui lòng thử lại sau ít phút.";
  }
  if (lower.includes("timeout")) {
    return "Hết thời gian chờ khi kết nối tới TikTok Live.";
  }
  if (lower.includes("captcha")) {
    return "TikTok yêu cầu captcha — vui lòng thử lại sau.";
  }
  if (lower.includes("sign") && (lower.includes("server") || lower.includes("api"))) {
    return "Sign server (Euler) đang gặp sự cố, vui lòng thử lại sau.";
  }
  return raw;
}

export function getConnection(username) {
  return activeConnections.get(username) || null;
}

export function isConnected(username) {
  const conn = activeConnections.get(username);
  return Boolean(conn && conn.isConnected);
}

export async function connectToTikTokLive(username) {
  const existing = activeConnections.get(username);
  if (existing && existing.isConnected) {
    return {
      reused: true,
      roomId: existing.roomId,
      roomInfo: existing.roomInfo || null,
    };
  }

  const connection = new TikTokLiveConnection(username, {
    processInitialData: false,
    fetchRoomInfoOnConnect: true,
  });

  // Dọn map khi disconnect (do user gọi hoặc do TikTok ngắt).
  connection.on("disconnected", () => {
    if (activeConnections.get(username) === connection) {
      activeConnections.delete(username);
    }
  });

  try {
    const state = await connection.connect();
    activeConnections.set(username, connection);
    return {
      reused: false,
      roomId: state?.roomId || connection.roomId,
      roomInfo: connection.roomInfo || null,
    };
  } catch (err) {
    activeConnections.delete(username);
    const reason = describeError(err);
    const error = new Error(reason);
    error.cause = err;
    throw error;
  }
}

export async function disconnectFromTikTokLive(username) {
  const connection = activeConnections.get(username);
  if (!connection) return false;
  try {
    await connection.disconnect();
  } finally {
    activeConnections.delete(username);
  }
  return true;
}
