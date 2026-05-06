import {
  connectToTikTokLive,
  disconnectFromTikTokLive,
  getConnection,
  isConnected,
  normalizeUsername,
  validateUsername,
} from "../services/tiktokLiveService.js";
import { upsertConnectedUser } from "../services/tiktokUserRepository.js";
import { attachTikTokEvents } from "../socket/tiktokEventHandler.js";

export async function connectTikTok(req, res) {
  const username = normalizeUsername(req.body?.username);
  const validationError = validateUsername(username);
  if (validationError) {
    return res.status(400).json({ success: false, reason: validationError });
  }

  try {
    const result = await connectToTikTokLive(username);

    // Gắn Socket.IO event handlers lên connection để broadcast live events
    const conn = getConnection(username);
    if (conn) attachTikTokEvents(conn, username);

    let user = null;
    try {
      user = await upsertConnectedUser(username);
    } catch (dbErr) {
      // DB lỗi không nên chặn người dùng vào game khi đã connect TikTok thành công.
      console.error("[tiktok] upsertConnectedUser failed:", dbErr);
    }

    return res.json({
      success: true,
      username,
      reused: result.reused,
      roomId: result.roomId,
      roomInfo: result.roomInfo,
      user,
    });
  } catch (err) {
    console.error("[tiktok] connect failed:", err);
    return res.status(502).json({
      success: false,
      reason: err.message || "Không thể kết nối tới TikTok Live.",
    });
  }
}

export async function disconnectTikTok(req, res) {
  const username = normalizeUsername(req.body?.username);
  const validationError = validateUsername(username);
  if (validationError) {
    return res.status(400).json({ success: false, reason: validationError });
  }

  try {
    const removed = await disconnectFromTikTokLive(username);
    return res.json({ success: true, disconnected: removed });
  } catch (err) {
    console.error("[tiktok] disconnect failed:", err);
    return res
      .status(500)
      .json({ success: false, reason: err.message || "Disconnect lỗi." });
  }
}

export function getTikTokStatus(req, res) {
  const username = normalizeUsername(req.query?.username);
  if (!username) {
    return res.status(400).json({ success: false, reason: "Thiếu username." });
  }
  return res.json({ success: true, username, connected: isConnected(username) });
}
