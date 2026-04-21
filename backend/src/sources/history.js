// Requires env.SUPABASE_URL and env.SUPABASE_ANON_KEY. Raw buoy data is
// scraped into Supabase by buoy-scraper/; this file just reads the last 90
// days of shallow readings and joins them with Open-Meteo rain archive.
import { ptNowParts, toPTIso } from "../util/time.js";
import {
  RAIN_NOPE,
  RAIN_MAYBE,
  TEMP_BRRR,
  TEMP_COLD_MAYBE,
  TEMP_HECK_YES,
} from "../verdict.js";

const DAYS = 90;
const BUOY = "washington";
const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";

async function fetchBuoyTempsByDate(env, sinceISO) {
  const url =
    `${env.SUPABASE_URL}/rest/v1/buoy_readings` +
    `?buoy=eq.${BUOY}&depth_m=lt.1.1` +
    `&reading_time=gte.${encodeURIComponent(sinceISO)}` +
    `&select=reading_time,temp_c&order=reading_time.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("supabase history query failed", res.status, body);
    throw new Error(`supabase ${res.status}`);
  }
  const rows = await res.json();
  const byDate = new Map();
  for (const row of rows) {
    // Bucket by PT calendar date — matches how `dates[]` below is formatted.
    const date = toPTIso(new Date(row.reading_time)).slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(row.temp_c);
  }
  return byDate;
}

async function fetchRainArchive(startISO, endISO) {
  const url =
    `${ARCHIVE_ENDPOINT}?latitude=47.6467&longitude=-122.3049` +
    `&start_date=${startISO}&end_date=${endISO}` +
    `&hourly=precipitation&precipitation_unit=inch&timezone=America%2FLos_Angeles`;
  const res = await fetch(url, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error(`archive ${res.status}`);
  const body = await res.json();
  const times = body.hourly?.time ?? [];
  const precip = body.hourly?.precipitation ?? [];
  return { times, precip };
}

function rain48hByDate(times, precip, dates) {
  const tsByDate = new Map(dates.map((d) => [d, []]));
  for (let i = 0; i < times.length; i++) {
    const day = times[i].slice(0, 10);
    if (tsByDate.has(day)) tsByDate.get(day).push({ idx: i });
  }
  const result = new Map();
  for (const date of dates) {
    const dayEntries = tsByDate.get(date);
    if (!dayEntries || dayEntries.length === 0) {
      result.set(date, 0);
      continue;
    }
    const startIdx = Math.max(0, dayEntries[0].idx - 48);
    const endIdx = dayEntries[0].idx;
    let sum = 0;
    for (let i = startIdx; i < endIdx; i++) sum += precip[i] || 0;
    result.set(date, sum);
  }
  return result;
}

function computeDailyVerdict(tempF, rain48h) {
  if (rain48h >= RAIN_NOPE) return { verdict: "nope", reason: `${rain48h.toFixed(2)}" rain` };
  if (rain48h >= RAIN_MAYBE) return { verdict: "maybe", reason: `${rain48h.toFixed(2)}" rain` };
  if (tempF == null) return null;
  if (tempF < TEMP_BRRR) return { verdict: "brrr", reason: `${tempF.toFixed(0)}°F` };
  if (tempF < TEMP_COLD_MAYBE) return { verdict: "maybe", reason: `${tempF.toFixed(0)}°F` };
  if (tempF < TEMP_HECK_YES) return { verdict: "yes", reason: `${tempF.toFixed(0)}°F` };
  return { verdict: "heck yes", reason: `${tempF.toFixed(0)}°F` };
}

function ymd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function fetchHistory(env) {
  const now = ptNowParts();
  const today = new Date(Date.UTC(now.year, now.month - 1, now.day));
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));

  const dates = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(ymd(d));
  }

  let dailyTempsC = new Map();
  try {
    dailyTempsC = await fetchBuoyTempsByDate(env, start.toISOString());
  } catch (e) {
    console.error("history buoy query failed", e);
  }

  let rainByDate = new Map();
  try {
    const archive = await fetchRainArchive(ymd(start), ymd(today));
    rainByDate = rain48hByDate(archive.times, archive.precip, dates);
  } catch (e) {
    console.error("history rain fetch failed", e);
  }

  const history = dates.map((date) => {
    const tempsC = dailyTempsC.get(date) || [];
    const meanC = tempsC.length ? tempsC.reduce((s, t) => s + t, 0) / tempsC.length : null;
    const tempF = meanC != null ? meanC * 9 / 5 + 32 : null;
    const rain48 = rainByDate.get(date) ?? 0;
    const v = computeDailyVerdict(tempF, rain48);
    return {
      date,
      verdict: v?.verdict ?? null,
      reason: v?.reason ?? null,
      temp_f: tempF != null ? Math.round(tempF * 10) / 10 : null,
      rain_48h_inches: Math.round(rain48 * 100) / 100,
    };
  });

  return {
    history,
    days: DAYS,
    generated_at: toPTIso(new Date()),
  };
}
