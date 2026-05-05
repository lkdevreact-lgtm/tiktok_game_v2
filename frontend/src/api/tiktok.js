const RAW_BACKEND = import.meta.env.VITE_BACKEND_URL;
const BACKEND_URL = (RAW_BACKEND && RAW_BACKEND.trim()) || "http://localhost:8888";

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Không thể kết nối tới backend. Kiểm tra server có đang chạy không.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // body rỗng hoặc không phải JSON
  }

  if (!res.ok || (data && data.success === false)) {
    const reason = (data && data.reason) || `Lỗi máy chủ (${res.status})`;
    const error = new Error(reason);
    error.payload = data;
    error.status = res.status;
    throw error;
  }
  return data;
}

export function connectTikTok(username) {
  return postJson("/api/tiktok/connect", { username });
}

export function disconnectTikTok(username) {
  return postJson("/api/tiktok/disconnect", { username });
}
