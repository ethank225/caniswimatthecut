import Skeleton from "./Skeleton.jsx";

const THRESHOLD = 0.75;

export default function RainBar({ weather, loading }) {
  if (loading) {
    return (
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-[11px] text-fg3">
          <span>rain · 48h</span>
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="h-[3px] bg-bar-bg" />
      </div>
    );
  }

  const rain = weather?.rain_48h_inches ?? 0;
  const pct = Math.min(100, (rain / THRESHOLD) * 100);

  return (
    <div className="mb-6">
      <div className="mb-1 flex justify-between text-[11px] text-fg3">
        <span>rain · 48h</span>
        <span>{rain.toFixed(2)}″</span>
      </div>
      <div className="h-[3px] bg-bar-bg">
        <div className="h-full bg-fg" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
