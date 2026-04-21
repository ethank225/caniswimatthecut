import { timeAgo, titleCase } from "../lib/format.js";
import Skeleton from "./Skeleton.jsx";

// Cap visible alerts to keep the feed height bounded; beyond this we show
// a "+N more" row. Reserved height covers 3 rows — the +N row extends past
// the minimum when shown.
const MAX_VISIBLE = 3;
const RESERVED_HEIGHT_PX = 111;

export default function PoliceFeed({ alerts, loading }) {
  const visible = alerts ? alerts.slice(0, MAX_VISIBLE) : [];
  const extra = alerts && alerts.length > MAX_VISIBLE ? alerts.length - MAX_VISIBLE : 0;

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
            {Array.from({ length: MAX_VISIBLE }).map((_, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-3 text-[12px] text-fg4">No recent activity in beat U2</div>
        ) : (
          <div className="flex flex-col">
            {visible.map((c, i) => (
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
            {extra > 0 && (
              <div className="py-2 text-[11px] text-fg4">
                +{extra} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
