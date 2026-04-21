// Backfill the last 12 months of King County buoy readings into Supabase.
// Usage:
//   cd buoy-scraper
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node backfill.mjs
//
// Uses the same parse/fetch helpers as the live scraper (src/parse.js) so
// rows match row-for-row. Depth filter is < 1.1 m (see DEPTH_MAX in parse.js).

import { fetchMonth, parseMonthHtml, ptNowYM } from "./src/parse.js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");
  process.exit(1);
}

function monthsBack(n) {
  const { year, month } = ptNowYM();
  const list = [];
  let y = year, m = month;
  for (let i = 0; i < n; i++) {
    list.push({ year: y, month: m });
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
  }
  return list;
}

async function upsertRows(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/buoy_readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`supabase ${res.status}: ${body.slice(0, 300)}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const months = monthsBack(12);
let totalUpserted = 0;
const failed = [];

for (let i = 0; i < months.length; i++) {
  const { year, month } = months[i];
  const tag = `${year}-${String(month).padStart(2, "0")}`;
  try {
    const html = await fetchMonth(year, month);
    const { all, kept } = parseMonthHtml(html);
    const skipped = all - kept.length;
    if (kept.length > 0) await upsertRows(kept);
    console.log(`[${tag}] fetched ${all} rows, upserted ${kept.length}, skipped ${skipped}`);
    totalUpserted += kept.length;
  } catch (e) {
    console.error(`[${tag}] FAILED: ${e.message || e}`);
    failed.push(tag);
  }
  if (i < months.length - 1) await sleep(2000);
}

console.log(
  `\nSummary: ${months.length} months processed, ${totalUpserted} rows upserted, ${failed.length} failed` +
  (failed.length ? `: ${failed.join(", ")}` : ""),
);
