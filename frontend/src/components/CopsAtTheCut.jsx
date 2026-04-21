import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useReports } from "../hooks/useReports.js";
import { timeAgo } from "../lib/format.js";
import { fadeInSequence } from "../lib/animations.js";
import HoverTip from "./HoverTip.jsx";
import Skeleton from "./Skeleton.jsx";

function summarize(data) {
  const empty = new Array(24).fill(0);
  if (!data) {
    return {
      cops: empty,
      clears: empty,
      totalCops: 0,
      totalClear: 0,
      status: { text: "Loading…", ago: "", active: false },
    };
  }
  const { latest, total_cops = 0, total_clear = 0 } = data;
  let cops = data.cops_by_hour;
  let clears = data.clears_by_hour;
  // Backward-compat with the old signed `hours` field.
  if (!cops && !clears && Array.isArray(data.hours)) {
    cops = data.hours.map((v) => (v > 0 ? v : 0));
    clears = data.hours.map((v) => (v < 0 ? -v : 0));
  }
  let status;
  if (!latest) {
    status = { text: "No reports today", ago: "", active: false };
  } else if (latest.is_cops) {
    status = { text: "Cops reported at the Cut", ago: timeAgo(latest.created_at), active: true };
  } else {
    status = { text: "All clear", ago: `last report ${timeAgo(latest.created_at)}`, active: false };
  }
  return {
    cops: cops || empty,
    clears: clears || empty,
    totalCops: total_cops,
    totalClear: total_clear,
    status,
  };
}

function cellClasses(count) {
  const hover = "hover:outline hover:outline-1 hover:outline-fg";
  if (count === 0) return `bg-[var(--heat-0)] ${hover}`;
  if (count === 1) return `bg-[var(--heat-1)] text-[var(--heat-1-fg)] ${hover}`;
  return `bg-[var(--heat-2)] text-[var(--heat-2-fg)] ${hover}`;
}

function hourLabel(cellIndex) {
  const hoursAgo = 23 - cellIndex;
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() - hoursAgo);
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h}${ampm}`;
}

function tipText(kind, count, cellIndex) {
  const time = hourLabel(cellIndex);
  if (kind === "cops") {
    if (count === 0) return `${time} · no cop reports`;
    return `${time} · ${count} cop report${count !== 1 ? "s" : ""}`;
  }
  if (count === 0) return `${time} · no all-clears`;
  return `${time} · ${count} all-clear${count !== 1 ? "s" : ""}`;
}

// Memoized so re-renders from `tip` state don't re-render any of the 24 cells.
const HeatCell = memo(function HeatCell({ index, kind, value, style, onEnter, onLeave }) {
  return (
    <div
      onMouseEnter={(e) => onEnter(e, kind, value, index)}
      onMouseLeave={onLeave}
      className={`flex aspect-square flex-1 cursor-default items-center justify-center text-[9px] font-medium ${cellClasses(value)}`}
      style={style}
    >
      {value > 0 ? value : ""}
    </div>
  );
});

const HeatRow = memo(function HeatRow({ label, kind, values, onCellEnter, onCellLeave, rowBase = 0 }) {
  // Pre-compute stable style objects so HeatCell's memo isn't defeated by new refs each render.
  const styles = useMemo(
    () => values.map((_, i) => fadeInSequence(i, { step: 14, max: 350, base: rowBase })),
    [values.length, rowBase],
  );
  return (
    <div className="mb-[2px] flex items-center gap-2">
      <div className="w-10 shrink-0 text-right text-[9px] uppercase tracking-[0.5px] text-fg3">
        {label}
      </div>
      <div className="flex flex-1 justify-end gap-[2px]">
        {values.map((v, i) => (
          <HeatCell
            key={i}
            index={i}
            kind={kind}
            value={v}
            style={styles[i]}
            onEnter={onCellEnter}
            onLeave={onCellLeave}
          />
        ))}
      </div>
    </div>
  );
});

function HeatRowSkeleton({ label }) {
  return (
    <div className="mb-[2px] flex items-center gap-2">
      <div className="w-10 shrink-0 text-right text-[9px] uppercase tracking-[0.5px] text-fg3">
        {label}
      </div>
      <Skeleton className="aspect-[24/1] flex-1 !rounded-none" />
    </div>
  );
}

export default function CopsAtTheCut() {
  const { data } = useReports();
  const loading = data === null;
  // Stable refs so HeatRow's memo can skip re-renders when `tip` changes.
  const { cops, clears, totalCops, totalClear, status } = useMemo(() => summarize(data), [data]);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    function onScroll() { setTip(null); }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const onCellEnter = useCallback((e, kind, count, cellIndex) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({
      text: tipText(kind, count, cellIndex),
      anchorX: r.left + r.width / 2,
      anchorBottom: r.bottom + 6,
      anchorTop: r.top - 6,
    });
  }, []);
  const onCellLeave = useCallback(() => setTip(null), []);

  return (
    <div className="mb-6 min-h-[160px]">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.5px] text-fg3">Cops at the Cut?</span>
        <span className="text-[10px] text-fg4">community reports</span>
      </div>

      <div className="mb-3 flex items-center gap-2.5 py-3">
        {loading ? (
          <>
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
          </>
        ) : (
          <>
            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.active ? "bg-fg" : "bg-fg4"}`}
              style={fadeInSequence(0)}
            />
            <span className="text-[14px] font-medium" style={fadeInSequence(1)}>{status.text}</span>
            <span className="ml-auto text-[11px] text-fg3" style={fadeInSequence(2)}>{status.ago}</span>
          </>
        )}
      </div>

      {loading ? (
        <>
          <HeatRowSkeleton label="cops" />
          <HeatRowSkeleton label="clear" />
        </>
      ) : (
        <>
          <HeatRow
            label="cops"
            kind="cops"
            values={cops}
            onCellEnter={onCellEnter}
            onCellLeave={onCellLeave}
            rowBase={120}
          />
          <HeatRow
            label="clear"
            kind="clears"
            values={clears}
            onCellEnter={onCellEnter}
            onCellLeave={onCellLeave}
            rowBase={220}
          />
        </>
      )}

      <div className="mb-2 mt-1 flex items-center gap-2">
        <div className="w-10 shrink-0" />
        <div className="flex flex-1 justify-between text-[9px] text-fg4">
          <span>24h ago</span>
          <span>now</span>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-4 w-56" />
      ) : (
        <div className="text-[11px] text-fg3">
          {totalCops} cop report{totalCops !== 1 ? "s" : ""} · {totalClear} all-clear{totalClear !== 1 ? "s" : ""} · past 24h
        </div>
      )}

      {tip && <HoverTip {...tip} />}
    </div>
  );
}
