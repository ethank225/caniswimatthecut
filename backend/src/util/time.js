const PT = "America/Los_Angeles";

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

function ptOffsetMinAt(realDate) {
  const p = ptParts(realDate);
  const localMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((localMs - realDate.getTime()) / 60000);
}

export function ptNowParts() {
  const p = ptParts(new Date());
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour, minute: +p.minute, second: +p.second,
  };
}

export function toPTIso(date) {
  const p = ptParts(date);
  const offsetMin = ptOffsetMinAt(date);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${oh}:${om}`;
}

export function ptLocalStringToDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m;
  const fake = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(sec ?? 0)));
  const offMin = ptOffsetMinAt(fake);
  return new Date(fake.getTime() - offMin * 60000);
}
