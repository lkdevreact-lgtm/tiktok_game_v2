import {
  listTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
} from "../services/triggerRepository.js";

const EVENT_TYPES = new Set(["comment", "like", "share", "gift", "follow"]);

function sanitizeBody(body, { partial = false } = {}) {
  const out = {};
  const errors = [];

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.push("name phải là chuỗi không rỗng.");
    } else {
      out.name = body.name.trim();
    }
  } else if (!partial) {
    errors.push("Thiếu trường 'name'.");
  }

  if (body.event_type !== undefined) {
    if (!EVENT_TYPES.has(body.event_type)) {
      errors.push(`event_type phải thuộc: ${[...EVENT_TYPES].join(", ")}.`);
    } else {
      out.event_type = body.event_type;
    }
  } else if (!partial) {
    errors.push("Thiếu trường 'event_type'.");
  }

  if (body.match_value !== undefined) {
    out.match_value =
      body.match_value === null || body.match_value === ""
        ? null
        : String(body.match_value);
  }

  if (body.threshold !== undefined) {
    const n = Number(body.threshold);
    if (!Number.isFinite(n) || n < 1) {
      errors.push("threshold phải là số nguyên >= 1.");
    } else {
      out.threshold = Math.floor(n);
    }
  } else if (!partial) {
    out.threshold = 1;
  }

  if (body.gift_id !== undefined) {
    if (body.gift_id === null || body.gift_id === "") {
      out.gift_id = null;
    } else {
      const n = Number(body.gift_id);
      if (!Number.isFinite(n)) {
        errors.push("gift_id không hợp lệ.");
      } else {
        out.gift_id = Math.floor(n);
      }
    }
  }

  if (body.npc_type !== undefined) {
    if (typeof body.npc_type !== "string" || !body.npc_type.trim()) {
      errors.push("npc_type phải là chuỗi không rỗng.");
    } else {
      out.npc_type = body.npc_type.trim();
    }
  } else if (!partial) {
    errors.push("Thiếu trường 'npc_type'.");
  }

  if (body.npc_count !== undefined) {
    const n = Number(body.npc_count);
    if (!Number.isFinite(n) || n < 1) {
      errors.push("npc_count phải là số nguyên >= 1.");
    } else {
      out.npc_count = Math.floor(n);
    }
  } else if (!partial) {
    out.npc_count = 1;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      errors.push("active phải là boolean.");
    } else {
      out.active = body.active;
    }
  }

  return { value: out, errors };
}

export async function getTriggers(_req, res) {
  try {
    const triggers = await listTriggers();
    return res.json({ success: true, triggers });
  } catch (err) {
    console.error("[trigger] list failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể lấy danh sách trigger.",
    });
  }
}

export async function postTrigger(req, res) {
  const { value, errors } = sanitizeBody(req.body || {});
  if (errors.length) {
    return res.status(400).json({ success: false, reason: errors.join(" ") });
  }
  try {
    const trigger = await createTrigger(value);
    return res.status(201).json({ success: true, trigger });
  } catch (err) {
    console.error("[trigger] create failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể tạo trigger.",
    });
  }
}

export async function putTrigger(req, res) {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, reason: "id không hợp lệ." });
  }

  const { value, errors } = sanitizeBody(req.body || {}, { partial: true });
  if (errors.length) {
    return res.status(400).json({ success: false, reason: errors.join(" ") });
  }
  if (Object.keys(value).length === 0) {
    return res
      .status(400)
      .json({ success: false, reason: "Không có trường nào để cập nhật." });
  }

  try {
    const trigger = await updateTrigger(id, value);
    if (!trigger) {
      return res
        .status(404)
        .json({ success: false, reason: "Không tìm thấy trigger." });
    }
    return res.json({ success: true, trigger });
  } catch (err) {
    console.error("[trigger] update failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể cập nhật trigger.",
    });
  }
}

export async function removeTrigger(req, res) {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, reason: "id không hợp lệ." });
  }

  try {
    const ok = await deleteTrigger(id);
    if (!ok) {
      return res
        .status(404)
        .json({ success: false, reason: "Không tìm thấy trigger." });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("[trigger] delete failed:", err);
    return res.status(500).json({
      success: false,
      reason: err.message || "Không thể xoá trigger.",
    });
  }
}
