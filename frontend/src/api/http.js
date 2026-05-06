import { BACKEND_URL } from "../utils/const";

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
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

export const http = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
