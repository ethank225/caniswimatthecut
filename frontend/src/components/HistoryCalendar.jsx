import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "../hooks/useHistory.js";
import { fadeInSequence } from "../lib/animations.js";
import HoverTip from "./HoverTip.jsx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const VERDICT_CLASS = {
  "heck yes": "bg-dot-yes",
  yes: "bg-dot-yes",
  maybe: "bg-dot-maybe",
  brrr: "bg-dot-brrr",
  nope: "bg-bg border border-dot-no-border",
};

function ymdInPT(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function buildGrid(history, days) {
  const todayStr = ymdInPT();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const byDate = new Map((history || []).map((h) => [h.date, h]));

  const cells = [];
  const monthPos = [];
  let cur = new Date(start);
  let lastMonth = -1;
  let weekCol = -1;

  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow === 0) weekCol++;

    const dateStr = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`;
    const isFuture = cur > today;
    const inRange = !isFuture && (today - cur) / 864e5 <= days;
    const entry = byDate.get(dateStr);

    let state = "s-empty";
    let hover = null;
    if (isFuture) state = "s-future";
    else if (inRange) {
      if (entry?.verdict) {
        state = entry.verdict;
        const month = MONTHS[cur.getUTCMonth()];
        hover = `${month} ${cur.getUTCDate()} · ${cap(entry.verdict)}${entry.reason ? ` · ${entry.reason}` : ""}`;
      } else {
        state = "s-default";
      }
    }

    cells.push({ state, hover, key: dateStr, weekCol });

    if (cur.getUTCMonth() !== lastMonth && dow === 0) {
      monthPos.push({ m: cur.getUTCMonth(), w: weekCol });
      lastMonth = cur.getUTCMonth();
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return { cells, monthPos, weekCount: weekCol + 1 };
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cellClasses(state, loading) {
  const base = "aspect-square cursor-default";
  if (state === "s-empty") return `${base} bg-transparent pointer-events-none`;
  if (state === "s-future") return `${base} bg-transparent border border-dashed border-line pointer-events-none`;
  if (state === "s-default") {
    return `${base} bg-bg2 ${loading ? "animate-pulse" : ""}`;
  }
  const variant = VERDICT_CLASS[state] || "bg-bg2";
  return `${base} ${variant} hover:outline hover:outline-1 hover:outline-fg`;
}

function Legend({ cls, label }) {
  return (
    <div className="flex items-center gap-[3px] text-[10px] text-fg3">
      <div className={`h-2 w-2 ${cls}`} />
      {label}
    </div>
  );
}

// Memoized so parent re-renders from `tip` state changes don't re-render cells.
const Cell = memo(function Cell({ state, hover, loading, style, onEnter, onLeave }) {
  return (
    <div
      onMouseEnter={(e) => onEnter(e, hover)}
      onMouseLeave={onLeave}
      className={cellClasses(state, loading)}
      style={style}
    />
  );
});

export default function HistoryCalendar() {
  const { data } = useHistory();
  const days = data?.days ?? 90;
  const { cells, monthPos, weekCount } = useMemo(
    () => buildGrid(data?.history, days),
    [data, days],
  );
  const [tip, setTip] = useState(null);
  const loading = data === null;

  useEffect(() => {
    function onScroll() { setTip(null); }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const onCellEnter = useCallback((e, hover) => {
    if (!hover) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({
      text: hover,
      anchorX: r.left + r.width / 2,
      anchorBottom: r.bottom + 6,
      anchorTop: r.top - 6,
    });
  }, []);
  const onCellLeave = useCallback(() => setTip(null), []);

  // Pre-compute stable style objects. New object identity per render would
  // defeat React.memo on Cell.
  const cellStyles = useMemo(
    () => loading ? null : cells.map((_, i) => fadeInSequence(i, { step: 6, max: 500 })),
    [loading, cells.length],
  );

  const colsTemplate = `repeat(${weekCount}, minmax(0, 1fr))`;

  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <span className="text-[11px] uppercase tracking-[0.5px] text-fg3">90-day history</span>
        <div className="flex gap-2">
          <Legend cls="bg-dot-yes" label="Yes" />
          <Legend cls="bg-dot-maybe" label="Maybe" />
          <Legend cls="bg-dot-brrr" label="Brrr" />
          <Legend cls="bg-bg border border-dot-no-border" label="Nope" />
        </div>
      </div>
      <div className="flex items-stretch gap-1">
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
        >
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="flex items-center text-[9px] text-fg4">
              {i % 2 === 1 ? d : ""}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: colsTemplate,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              aspectRatio: `${weekCount} / 7`,
            }}
          >
            {cells.map((c, i) => (
              <Cell
                key={c.key}
                state={c.state}
                hover={c.hover}
                loading={loading}
                style={cellStyles?.[i]}
                onEnter={onCellEnter}
                onLeave={onCellLeave}
              />
            ))}
          </div>
          <div
            className="mt-1 grid gap-[2px]"
            style={{ gridTemplateColumns: colsTemplate }}
          >
            {monthPos.map((p, i) => {
              const nextW = i < monthPos.length - 1 ? monthPos[i + 1].w : weekCount;
              const span = nextW - p.w;
              if (span < 1) return null;
              return (
                <span
                  key={`${p.m}-${p.w}`}
                  className="text-center text-[9px] text-fg4"
                  style={{ gridColumn: `${p.w + 1} / span ${span}` }}
                >
                  {MONTHS[p.m]}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      {tip && <HoverTip {...tip} />}
    </div>
  );
}
