import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null client if not configured — components can fall back gracefully to polling.
export const supabase =
  URL && KEY && !URL.includes("your-project")
    ? createClient(URL, KEY, { auth: { persistSession: false } })
    : null;
