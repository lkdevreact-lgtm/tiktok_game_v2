import { http } from "./http";

export async function fetchTriggers() {
  const data = await http.get("/api/triggers");
  return data?.triggers || [];
}

export async function createTrigger(payload) {
  const data = await http.post("/api/triggers", payload);
  return data?.trigger;
}

export async function updateTrigger(id, payload) {
  const data = await http.patch(`/api/triggers/${id}`, payload);
  return data?.trigger;
}

export async function deleteTrigger(id) {
  await http.del(`/api/triggers/${id}`);
}
