import { listGifts, updateGiftActive } from "../services/giftRepository.js";

export async function getGifts(_req, res) {
  try {
    const gifts = await listGifts();
    return res.json({ success: true, gifts });
  } catch (err) {
    console.error("[gift] list failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể lấy danh sách gift.",
    });
  }
}

export async function patchGiftActive(req, res) {
  const giftId = Number(req.params?.giftId);
  if (!Number.isFinite(giftId)) {
    return res.status(400).json({ success: false, reason: "giftId không hợp lệ." });
  }

  if (typeof req.body?.active !== "boolean") {
    return res
      .status(400)
      .json({ success: false, reason: "Thiếu trường 'active' (boolean)." });
  }

  try {
    const gift = await updateGiftActive(giftId, req.body.active);
    if (!gift) {
      return res.status(404).json({ success: false, reason: "Không tìm thấy gift." });
    }
    return res.json({ success: true, gift });
  } catch (err) {
    console.error("[gift] update active failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể cập nhật gift.",
    });
  }
}
