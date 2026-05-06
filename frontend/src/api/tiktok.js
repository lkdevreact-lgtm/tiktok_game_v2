import { http } from "./http";

export function connectTikTok(username) {
  return http.post("/api/tiktok/connect", { username });
}

export function disconnectTikTok(username) {
  return http.post("/api/tiktok/disconnect", { username });
}
