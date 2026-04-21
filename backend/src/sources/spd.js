import { ptLocalStringToDate, toPTIso } from "../util/time.js";

const ENDPOINT =
  "https://data.seattle.gov/resource/33kz-ixgy.json" +
  "?dispatch_beat=U2&$order=cad_event_original_time_queued%20DESC&$limit=20";

const KEY = "spd_data_u2";
const TTL = 900;
const WINDOW_MS = 3 * 3600 * 1000;

const RELEVANT = [
  "TRESPASS", "DISTURBANCE", "MARINE", "NARCOTICS",
  "WEAPONS", "ASSAULT", "HAZARD", "PARKS",
];

function isRelevant(call) {
  const combined = (
    (call.initial_call_type || "") + " " + (call.final_call_type || "")
  ).toUpperCase();
  return RELEVANT.some((r) => combined.includes(r));
}

function matchedType(call) {
  const combined = (
    (call.final_call_type || "") + " " + (call.initial_call_type || "")
  ).toUpperCase();
  return RELEVANT.find((r) => combined.includes(r)) || "OTHER";
}

export async function fetchSPDCalls(env) {
  const cached = await env.SWIM_DATA.get(KEY, { type: "json" });
  if (cached) return cached;

  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`SPD ${res.status}`);
  const calls = await res.json();

  const cutoff = Date.now() - WINDOW_MS;
  const alerts = [];
  for (const c of calls) {
    if (!isRelevant(c)) continue;
    const d = ptLocalStringToDate(c.cad_event_original_time_queued || "");
    if (!d || d.getTime() < cutoff) continue;
    alerts.push({
      source: "spd",
      type: matchedType(c),
      status: c.cad_event_clearance_description || "Active",
      time: toPTIso(d),
    });
  }

  await env.SWIM_DATA.put(KEY, JSON.stringify(alerts), { expirationTtl: TTL });
  return alerts;
}
