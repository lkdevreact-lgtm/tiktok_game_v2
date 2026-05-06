import { supabase } from "../config/supabase.js";

const TABLE = "triggers";
const COLUMNS =
  "id, name, event_type, match_value, threshold, gift_id, npc_type, npc_count, active, created_at, updated_at";

export async function listTriggers() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("active", { ascending: false })
    .order("event_type", { ascending: true })
    .order("threshold", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTrigger(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrigger(id, payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTrigger(id) {
  const { error, count } = await supabase
    .from(TABLE)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count || 0) > 0;
}
