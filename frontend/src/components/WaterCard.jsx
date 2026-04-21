import { formatTime } from "../lib/format.js";
import BuoyGraph from "./BuoyGraph.jsx";
import Skeleton from "./Skeleton.jsx";

export default function WaterCard({ water, loading }) {
  const hasData = !loading && water && water.temp_f != null;

  return (
    <div className="mb-6 min-h-[212px] border border-line p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="relative text-[36px] font-bold leading-none tracking-[-1px]">
          <span className={loading ? "invisible" : undefined}>
            {hasData ? (
              <>
                {water.temp_f.toFixed(1)}
                <span className="text-[18px] font-normal text-fg3">°F</span>
              </>
            ) : (
              "—"
            )}
          </span>
          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center">
              <Skeleton className="h-[70%] w-28" />
            </div>
          )}
        </div>
        <div className="relative text-right text-[12px] leading-[1.6] text-fg3">
          <div className={loading ? "invisible" : undefined}>
            {hasData ? (
              <>
                ↑ {water.high_f != null ? water.high_f.toFixed(1) : "—"}° high
                <br />
                ↓ {water.low_f != null ? water.low_f.toFixed(1) : "—"}° low
              </>
            ) : (
              <>
                ↑ —° high
                <br />
                ↓ —° low
              </>
            )}
          </div>
          {loading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-end justify-center gap-1">
              <Skeleton className="h-[45%] w-20" />
              <Skeleton className="h-[45%] w-20" />
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-3 text-[11px] leading-normal text-fg3">
        <span className={loading ? "invisible" : undefined}>
          {hasData
            ? `${water?.source || "King Co. buoy"}${water?.last_reading ? ` · last reading ${formatTime(water.last_reading)}` : " · no reading today"}`
            : `${water?.source || "King Co. buoy"} · loading reading`}
        </span>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <Skeleton className="h-[60%] w-52" />
          </div>
        )}
      </div>

      <div className="relative mb-1 text-[11px] leading-normal text-fg3">
        <span className={loading ? "invisible" : undefined}>today · 1m depth</span>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <Skeleton className="h-[60%] w-32" />
          </div>
        )}
      </div>

      <BuoyGraph readings={water?.readings || []} loading={loading} />
    </div>
  );
}
