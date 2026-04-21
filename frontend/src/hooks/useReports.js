import { useCallback, useEffect, useId, useRef, useState } from "react";
import { apiUrl } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";

const POLL_MS = 2 * 60 * 1000;

export function useReports() {
  const [data, setData] = useState(null);
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const inflight = useRef(false);
  const id = useId();

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(apiUrl("/api/reports"), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);

    let channel;
    if (supabase) {
      channel = supabase
        .channel(`reports-feed-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "reports" },
          () => load(),
        )
        .subscribe();
    }

    function onExternalRefresh() {
      load();
    }
    window.addEventListener("reports:refresh", onExternalRefresh);

    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("reports:refresh", onExternalRefresh);
    };
  }, [load, id]);

  const submit = useCallback((isCops) => {
    // Fire-and-forget: don't make the click handler await the POST, otherwise
    // INP is dominated by the network round-trip (worker cold-start + insert
    // regularly pushes it past 6s). Paint the "pending" state immediately, then
    // resolve success/error asynchronously.
    setSubmitState({ status: "pending", message: "" });
    fetch(apiUrl("/api/report"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_cops: isCops }),
    })
      .then((res) => {
        if (res.status === 429) {
          setSubmitState({ status: "rate-limited", message: "Easy — one report per 10 min" });
        } else if (res.ok) {
          setSubmitState({
            status: "success",
            message: isCops ? "Cop report submitted" : "All-clear submitted — thanks!",
          });
          window.dispatchEvent(new CustomEvent("reports:refresh"));
        } else {
          setSubmitState({ status: "error", message: "Something went wrong" });
        }
      })
      .catch(() => {
        setSubmitState({ status: "error", message: "Network error — try again" });
      })
      .finally(() => {
        setTimeout(() => setSubmitState({ status: "idle", message: "" }), 2500);
      });
  }, []);

  return { data, submit, submitState, refresh: load };
}
