import { http } from "./http";

export async function fetchGifts() {
  const data = await http.get("/api/gifts");
  return data?.gifts || [];
}

export async function setGiftActive(giftId, active) {
  const data = await http.patch(`/api/gifts/${giftId}/active`, { active });
  return data?.gift;
}
