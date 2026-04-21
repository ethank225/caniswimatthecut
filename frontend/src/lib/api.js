const BASE =
  import.meta.env.VITE_API_URL ||
  "https://caniswimatthecut-api.ekawah.workers.dev";

export function apiUrl(path) {
  return BASE.replace(/\/$/, "") + path;
}
