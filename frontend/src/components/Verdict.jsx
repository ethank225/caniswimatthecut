import { fadeInSequence } from "../lib/animations.js";
import Skeleton from "./Skeleton.jsx";

export default function Verdict({ verdict, reason, loading, error }) {
  const word = verdict ? verdict.charAt(0).toUpperCase() + verdict.slice(1) + "." : "";
  const reasonText = error
    ? "Could not load current conditions. Retrying…"
    : reason || "";

  return (
    <div className="mb-8">
      <div className="relative mb-2 text-[72px] font-bold leading-none tracking-[-2px]">
        <span
          className={loading ? "invisible" : undefined}
          style={loading ? undefined : fadeInSequence(0)}
        >
          {word || "Loading."}
        </span>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <Skeleton className="h-[70%] w-40" />
          </div>
        )}
      </div>
      <div className="relative min-h-[42px] text-[15px] leading-[1.4] text-fg2">
        <span
          className={loading ? "invisible" : undefined}
          style={loading ? undefined : fadeInSequence(1)}
        >
          {reasonText || "Getting current conditions…"}
        </span>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <Skeleton className="h-[30%] w-72 max-w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
