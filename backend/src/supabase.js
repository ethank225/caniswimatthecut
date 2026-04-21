export async function supabaseFetch(env, path, method, body) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase not configured (SUPABASE_URL / SUPABASE_ANON_KEY)");
  }
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers.Prefer = "return=minimal";
  const res = await fetch(env.SUPABASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === "GET") {
    const data = await res.json();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(data)}`);
    return data;
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return null;
}

// 16-char hex, salted so the raw IP isn't recoverable from the DB.
export async function hashIP(ip) {
  const data = new TextEncoder().encode(ip + "caniswimatthecut-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
