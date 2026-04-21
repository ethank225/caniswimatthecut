import { toPTIso } from "../util/time.js";

// The CSO status page at kingcounty.gov embeds an ArcGIS webmap whose
// backing data is a public CSV of all Seattle CSO outfall statuses.
// We hit the CSV directly — the HTML page would be useless to scrape.
const CSV_URL = "https://your.kingcounty.gov/dnrp/library/wastewater/cso/img/CSO_metadata.CSV";

const KEY = "cso_data";
const TTL = 1800;

// Outfalls whose overflow would affect water at the Montlake Cut.
// MONT = Montlake (at the Cut). UNIV = University (Portage Bay, just west).
// CANL = Canal St (Fremont/Ship Canal, upstream via Lake Union).
const CUT_RELEVANT = new Set(["MONT", "UNIV", "CANL"]);

const ACTIVE_STATUSES = new Set(["CurrentlyOverflowing", "OverflowLast48hrs"]);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const header = lines.shift().split(",");
  const idx = {
    tag: header.indexOf("CSO_TagName"),
    name: header.indexOf("Name"),
    status: header.indexOf("Status"),
  };
  const rows = [];
  for (const line of lines) {
    const cells = line.split(",");
    if (cells[idx.tag]?.startsWith("CSO_Status")) continue;
    rows.push({
      tag: cells[idx.tag],
      name: cells[idx.name],
      status: cells[idx.status],
    });
  }
  return rows;
}

export async function fetchCSOStatus(env) {
  const cached = await env.SWIM_DATA.get(KEY, { type: "json" });
  if (cached && cached.active !== null && !cached.error) return cached;

  let result;
  try {
    const res = await fetch(CSV_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/csv,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://kingcounty.maps.arcgis.com/",
      },
    });
    if (!res.ok) throw new Error(`CSO ${res.status}`);
    const rows = parseCSV(await res.text());

    const activeCut = rows.filter(
      (r) => CUT_RELEVANT.has(r.tag) && ACTIVE_STATUSES.has(r.status),
    );
    const activeAnywhere = rows.filter((r) => ACTIVE_STATUSES.has(r.status));

    result = {
      active: activeCut.length > 0,
      active_outfalls: activeCut.map((r) => ({ tag: r.tag, name: r.name, status: r.status })),
      active_elsewhere_count: activeAnywhere.length - activeCut.length,
      last_checked: toPTIso(new Date()),
    };
  } catch (e) {
    result = { active: null, last_checked: toPTIso(new Date()), error: String(e.message || e) };
  }

  await env.SWIM_DATA.put(KEY, JSON.stringify(result), { expirationTtl: TTL });
  return result;
}
