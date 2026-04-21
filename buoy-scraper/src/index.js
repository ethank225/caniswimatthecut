import { BUOY, fetchMonth, parseMonthHtml, ptNowYM } from "./parse.js";

async function scrapeAndUpsert(env) {
  const { year, month } = ptNowYM();
  const html = await fetchMonth(year, month);
  const { kept: rows } = parseMonthHtml(html);

  if (rows.length === 0) return { inserted: 0, skipped: 0, sample: [] };

  const latestUrl =
    `${env.SUPABASE_URL}/rest/v1/buoy_readings` +
    `?buoy=eq.${BUOY}&select=reading_time&order=reading_time.desc&limit=1`;
  const latestRes = await fetch(latestUrl, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!latestRes.ok) {
    const body = await latestRes.text();
    console.error("supabase latest query failed", latestRes.status, body);
    throw new Error(`supabase latest ${latestRes.status}`);
  }
  const latestRows = await latestRes.json();
  const latestStored = latestRows[0]?.reading_time ?? null;
  // Compare as ms-since-epoch — PostgREST returns "…+00:00" while
  // Date#toISOString() returns "….000Z", so string compare misreports equal
  // timestamps as unequal and re-inserts the most recent row every tick.
  const latestMs = latestStored ? new Date(latestStored).getTime() : null;

  const newRows = latestMs != null
    ? rows.filter((r) => new Date(r.reading_time).getTime() > latestMs)
    : rows;

  if (newRows.length === 0) {
    return { inserted: 0, skipped: rows.length, latest_stored: latestStored, sample: [] };
  }

  const supaRes = await fetch(`${env.SUPABASE_URL}/rest/v1/buoy_readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(newRows),
  });
  if (!supaRes.ok) {
    const body = await supaRes.text();
    console.error("supabase upsert failed", supaRes.status, body);
    throw new Error(`supabase ${supaRes.status}`);
  }

  return {
    inserted: newRows.length,
    skipped: rows.length - newRows.length,
    latest_stored: latestStored,
    sample: newRows.slice(0, 3),
  };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scrapeAndUpsert(env));
  },
  async fetch(request, env) {
    try {
      const result = await scrapeAndUpsert(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(String(e.message || e), { status: 500 });
    }
  },
};
