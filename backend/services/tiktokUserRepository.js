import { supabase } from "../config/supabase.js";

const TABLE = "tiktok_connected_users";

export async function upsertConnectedUser(username) {
  const now = new Date().toISOString();

  const { data: existing, error: selectError } = await supabase
    .from(TABLE)
    .select("id, username, connected_at, last_seen")
    .eq("username", username)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ last_seen: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ username, connected_at: now, last_seen: now })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findConnectedUser(username) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, username, connected_at, last_seen")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}
