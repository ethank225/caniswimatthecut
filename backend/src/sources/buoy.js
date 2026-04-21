// Requires env.SUPABASE_URL and env.SUPABASE_ANON_KEY (set via `wrangler secret put`).
// Uses the anon key — read-only, respects RLS. Raw scraping lives in buoy-scraper/.
import { toPTIso } from "../util/time.js";

const BUOY = "washington";

const EMPTY = {
  temp_f: null, temp_c: null, high_f: null, low_f: null,
  source: "King Co. buoy", last_reading: null, readings: [],
};

export async function fetchBuoyData(env) {
  const url =
    `${env.SUPABASE_URL}/rest/v1/buoy_readings` +
    `?buoy=eq.${BUOY}&depth_m=lt.1.1&select=reading_time,temp_c` +
    `&order=reading_time.desc&limit=8`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("supabase buoy_readings query failed", res.status, body);
    throw new Error(`supabase ${res.status}`);
  }
  const rows = await res.json();
  if (rows.length === 0) return EMPTY;

  // Supabase returns newest-first; flip to oldest-first because index.js reads
  // readings[last] as current, and BuoyGraph plots left→right as oldest→newest.
  const asc = rows.slice().reverse();
  const readings = asc.map((r) => ({
    time: toPTIso(new Date(r.reading_time)),
    temp_f: Math.round((r.temp_c * 9 / 5 + 32) * 10) / 10,
  }));
  const latest = asc[asc.length - 1];
  const temps = readings.map((r) => r.temp_f);
  return {
    temp_f: readings[readings.length - 1].temp_f,
    temp_c: Math.round(latest.temp_c * 10) / 10,
    high_f: Math.max(...temps),
    low_f: Math.min(...temps),
    source: "King Co. buoy",
    last_reading: readings[readings.length - 1].time,
    readings,
  };
}
