import { useEffect, useState } from "react";

import { apiUrl } from "../lib/api.js";
const API_URL = apiUrl("/api/conditions");

const POLL_MS = 5 * 60 * 1000;
const RETRY_MS = 10 * 1000;

export function useConditions() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let retryTimer = null;

    async function load() {
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load conditions:", err);
        setError(err);
        retryTimer = setTimeout(load, RETRY_MS);
      }
    }

    load();
    pollTimer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return { data, error };
}
