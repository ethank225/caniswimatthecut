import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api.js";

const REFRESH_MS = 6 * 3600 * 1000;

export function useHistory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(apiUrl("/api/history"), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load history:", err);
        setError(err);
      }
    }

    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { data, error };
}
