import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "../lib/format.js";
import { fadeInSequence } from "../lib/animations.js";
import Skeleton from "./Skeleton.jsx";

const W = 400;
const H = 72;
const PAD = 20;

function layout(readings) {
  if (!readings.length) return { pts: [], mn: 0, mx: 0, ty: null };
  const temps = readings.map((r) => r.temp_f);
  const rawMin = Math.min(...temps);
  const rawMax = Math.max(...temps);
  const mn = rawMin - 0.5;
  const mx = (rawMax === rawMin ? rawMax + 1 : rawMax) + 0.5;
  const rng = mx - mn;
  const usable = W - PAD * 2;
  const pts = readings.map((r, i) => ({
    x: readings.length === 1 ? W / 2 : PAD + (i * usable) / (readings.length - 1),
    y: H - ((r.temp_f - mn) / rng) * (H - 8) - 4,
    temp: r.temp_f,
    time: formatTime(r.time),
  }));
  const ty = H - ((60 - mn) / rng) * (H - 8) - 4;
  return { pts, mn, mx, ty: ty > 0 && ty < H ? ty : null };
}

export default function BuoyGraph({ readings = [], loading = false, baseDelay = 0 }) {
  const { pts, ty } = useMemo(() => layout(readings), [readings]);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const showData = !loading && readings.length > 0;

  function onMove(cx) {
    if (!showData) return;
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const pct = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    let closest = 0;
    let closestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x / W - pct);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    setHover({ idx: closest, rect: r });
  }

  const hoverPt = hover ? pts[hover.idx] : null;
  const hoverPx = hoverPt && hover ? (hoverPt.x / W) * hover.rect.width : 0;
  const hoverPy = hoverPt && hover ? (hoverPt.y / H) * hover.rect.height : 0;

  return (
    <>
      <div
        ref={wrapRef}
        className={`relative h-[72px] ${showData ? "cursor-crosshair" : ""}`}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => showData && onMove(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (!showData) return;
          e.preventDefault();
          onMove(e.touches[0].clientX);
        }}
        onTouchEnd={() => setHover(null)}
      >
        {loading ? (
          <Skeleton className="h-full w-full !rounded-none" />
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-full w-full"
          >
            {showData && pts.slice(0, -1).map((p, i) => (
              <line
                key={`ln-${i}`}
                x1={p.x}
                y1={p.y}
                x2={pts[i + 1].x}
                y2={pts[i + 1].y}
                stroke="var(--fg4)"
                strokeWidth="1"
                style={fadeInSequence(i, { base: baseDelay })}
              />
            ))}
            {showData && ty != null && (
              <g style={fadeInSequence(pts.length + 1, { base: baseDelay })}>
                <line
                  x1={0}
                  y1={ty}
                  x2={W}
                  y2={ty}
                  stroke="var(--fg4)"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                />
                <text
                  x={W - 2}
                  y={ty - 3}
                  textAnchor="end"
                  fill="var(--fg4)"
                  fontSize="8"
                  fontFamily="inherit"
                >
                  60°F
                </text>
              </g>
            )}
            {showData && pts.map((p, i) => (
              <circle
                key={`c-${i}`}
                cx={p.x}
                cy={p.y}
                r={i === pts.length - 1 ? 4 : 3}
                fill="var(--spark)"
                style={fadeInSequence(i, { base: baseDelay })}
              />
            ))}
          </svg>
        )}
        {hoverPt && (
          <>
            <div
              className="pointer-events-none absolute top-0 h-full w-px bg-line"
              style={{ left: `${hoverPx}px` }}
            />
            <div
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-spark"
              style={{ left: `${hoverPx}px`, top: `${hoverPy}px` }}
            />
            <Tip
              px={hoverPx}
              py={hoverPy}
              text={`${hoverPt.temp.toFixed(1)}°F · ${hoverPt.time}`}
              wrapWidth={hover.rect.width}
            />
          </>
        )}
      </div>

      <div
        className="relative mt-0.5 text-[9px] leading-normal text-fg4"
        style={{ minHeight: "13.5px" }}
      >
        {loading ? (
          <div className="flex items-center justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[9px] w-8" />
            ))}
          </div>
        ) : showData ? (
          pts.map((p, i) => (
            <span
              key={`t-${i}`}
              className={`absolute -translate-x-1/2 whitespace-nowrap ${i === pts.length - 1 ? "font-semibold" : ""}`}
              style={{ left: `${(p.x / W) * 100}%`, ...fadeInSequence(i, { base: baseDelay }) }}
            >
              {p.time}
            </span>
          ))
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </>
  );
}

function Tip({ px, py, text, wrapWidth }) {
  const ref = useRef(null);
  const [tipW, setTipW] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) setTipW(ref.current.offsetWidth);
  }, [text]);

  const margin = 4;
  let left = px;
  if (tipW > 0) {
    const minLeft = tipW / 2 + margin;
    const maxLeft = wrapWidth - tipW / 2 - margin;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap bg-tip-bg px-[7px] py-[3px] text-[11px] text-tip-fg"
      style={{ left: `${left}px`, top: `${py - 4}px`, opacity: tipW > 0 ? 1 : 0 }}
    >
      {text}
    </div>
  );
}
