import { supabase } from "../config/supabase.js";

const TABLE = "gifts";
const COLUMNS = "gift_id, gift_name, image, diamonds, max_repeat_count, active";

export async function listGifts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("active", { ascending: false })
    .order("diamonds", { ascending: true, nullsFirst: false })
    .order("gift_id", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateGiftActive(giftId, active) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ active })
    .eq("gift_id", giftId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data;
}
