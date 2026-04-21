import Skeleton from "./Skeleton.jsx";

// Absolute swim-temperature scale (not relative to the week's min/max).
// 40 °F = solidly brrr → fully blends with bg.
// 75 °F = well past heck-yes peak → fully contrasts with fg.
// This keeps adjacent-similar-temps visually similar and anchors the gradient
// to something meaningful across seasons rather than drifting with the window.
const MIN_TEMP_F = 40;
const MAX_TEMP_F = 75;
const TEMP_RANGE = MAX_TEMP_F - MIN_TEMP_F;

function squareStyle(waterTempF) {
  if (typeof waterTempF !== "number") {
    return { background: "var(--bg2)", color: "var(--fg)" };
  }
  const t = Math.max(0, Math.min(1, (waterTempF - MIN_TEMP_F) / TEMP_RANGE));
  const pct = Math.round(t * 100);
  return {
    background: `color-mix(in srgb, var(--fg) ${pct}%, var(--bg))`,
    color: t > 0.5 ? "var(--bg)" : "var(--fg)",
  };
}

function DayLabel({ children, loading }) {
  return (
    <div className="text-[9px] uppercase leading-normal tracking-[0.5px] text-fg3">
      {loading ? (
        <Skeleton className="inline-block h-[1lh] w-6 align-middle" />
      ) : (
        children
      )}
    </div>
  );
}

function DaySquare({ day, water_temp_f, style }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <DayLabel>{day}</DayLabel>
      <div
        className="flex aspect-square w-full items-center justify-center border border-line text-[10px] font-medium leading-none"
        style={style}
      >
        {water_temp_f != null ? `${water_temp_f}°F` : "—"}
      </div>
    </div>
  );
}

function DaySkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <DayLabel loading />
      <Skeleton className="aspect-square w-full !rounded-none" />
    </div>
  );
}

export default function Forecast7Day({ forecast, loading }) {
  // Graceful fallback: if the backend hasn't shipped forecast_7day yet, hide.
  if (!loading && (!Array.isArray(forecast) || forecast.length === 0)) return null;

  return (
    <div className="mb-4 min-h-[92px]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.5px] text-fg3">
          7-day forecast
        </span>
        <div className="flex items-center gap-1.5 text-[9px] text-fg4">
          <span>{MIN_TEMP_F}°</span>
          <div
            className="h-1.5 w-16 border border-line"
            style={{
              background:
                "linear-gradient(to right, var(--bg) 0%, var(--fg) 100%)",
            }}
          />
          <span>{MAX_TEMP_F}°</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[340px] items-start gap-[2px]">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <DaySkeleton key={i} />)
          : forecast.map((d, i) => (
              <DaySquare
                key={d.date || i}
                {...d}
                style={squareStyle(d.water_temp_f)}
              />
            ))}
      </div>
    </div>
  );
}
