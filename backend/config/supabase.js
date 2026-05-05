import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong .env của backend."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
