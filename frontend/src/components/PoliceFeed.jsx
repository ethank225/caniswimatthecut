import { timeAgo, titleCase } from "../lib/format.js";
import Skeleton from "./Skeleton.jsx";

// Reserve vertical space for 2 rows regardless of state, so the layout
// doesn't shift between the loading skeleton, "no activity" empty state,
// and a populated list of N calls.
const RESERVED_HEIGHT_PX = 72;

export default function PoliceFeed({ alerts, loading }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.5px] text-fg3">
          Police activity · beat U2
        </span>
        <span className="text-[10px] text-fg4">data.seattle.gov</span>
      </div>
      <div style={{ minHeight: `${RESERVED_HEIGHT_PX}px` }}>
        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="py-3 text-[12px] text-fg4">No recent activity in beat U2</div>
        ) : (
          <div className="flex flex-col">
            {alerts.map((c, i) => (
              <div
                key={`${c.time}-${c.type}-${i}`}
                className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[13px] last:border-b-0"
              >
                <div>
                  <span className="font-medium text-fg">{titleCase(c.type || "Unknown")}</span>
                  {c.status && <span className="text-[11px] text-fg3"> · {c.status}</span>}
                </div>
                <span className="whitespace-nowrap text-right text-[11px] text-fg4">
                  {timeAgo(c.time)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
