export const ENDPOINT = "https://green2.kingcounty.gov/lake-buoy/DataScrape.aspx";
export const BUOY = "washington";
export const DEPTH_MAX = 1.1;
const PT = "America/Los_Angeles";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function ptParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PT,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  if (p.hour === "24") p.hour = "00";
  return p;
}

function ptOffsetMinAt(date) {
  const p = ptParts(date);
  const localMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((localMs - date.getTime()) / 60000);
}

export function ptNowYM() {
  const p = ptParts(new Date());
  return { year: +p.year, month: +p.month };
}

function ptLocalToUtc(y, mo, d, h, mi, sec) {
  const fake = new Date(Date.UTC(y, mo - 1, d, h, mi, sec));
  return new Date(fake.getTime() - ptOffsetMinAt(fake) * 60000);
}

function parseBuoyTime(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i.exec(s);
  if (!m) return null;
  let [, mo, d, y, h, mi, sec, ap] = m;
  h = +h;
  if (ap.toUpperCase() === "PM" && h !== 12) h += 12;
  if (ap.toUpperCase() === "AM" && h === 12) h = 0;
  return ptLocalToUtc(+y, +mo, +d, h, +mi, +sec);
}

function parseCells(tr) {
  const cells = [];
  const re = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m;
  while ((m = re.exec(tr)) !== null) {
    cells.push(m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
  }
  return cells;
}

function extractRows(html) {
  const rows = [];
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(html)) !== null) rows.push(m[1]);
  return rows;
}

export async function fetchMonth(year, month) {
  const url = `${ENDPOINT}?type=profile&buoy=${BUOY}&year=${year}&month=${month}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Referer: "https://green2.kingcounty.gov/lake-buoy/",
    },
  });
  if (!res.ok) throw new Error(`buoy fetch ${year}-${month} ${res.status}`);
  return res.text();
}

// Returns { all, kept } — `all` is count of successfully-parsed rows before
// depth filter; `kept` is the filtered rows shaped for Supabase upsert.
export function parseMonthHtml(html) {
  const kept = [];
  let all = 0;
  for (const tr of extractRows(html)) {
    const c = parseCells(tr);
    if (c.length < 3) continue;
    const t = parseBuoyTime(c[0]);
    const depth = parseFloat(c[1]);
    const tempC = parseFloat(c[2]);
    if (!t || !isFinite(depth) || !isFinite(tempC)) continue;
    all += 1;
    if (depth >= DEPTH_MAX) continue;
    kept.push({
      buoy: BUOY,
      reading_time: t.toISOString(),
      depth_m: depth,
      temp_c: tempC,
    });
  }
  return { all, kept };
}
