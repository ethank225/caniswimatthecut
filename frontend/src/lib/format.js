export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// The API emits ISO strings with Pacific offset (e.g. "2026-04-20T10:42:00-07:00").
// We pull HH:MM directly so the displayed time stays Seattle-local regardless
// of where the viewer is.
export function formatTime(iso) {
  if (!iso) return "";
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return "";
  let h = +m[1];
  const ampm = h >= 12 ? "p" : "a";
  h = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h}:${m[2]}${ampm}`;
}

export function formatTimestamp(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return "";
  const [, y, mo, d, hr, mi] = m;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let h = +hr;
  const ampm = h >= 12 ? "pm" : "am";
  h = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `updated ${months[+mo - 1]} ${+d}, ${y} · ${h}:${mi}${ampm}`;
}

export function titleCase(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
