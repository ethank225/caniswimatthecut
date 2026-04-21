import { fadeInSequence, SECTION_DELAY } from "../lib/animations.js";
import Skeleton from "./Skeleton.jsx";

function Stat({ value, suffix, label, sublabel, animStyle }) {
  return (
    <div className="flex-1 bg-bg px-2 py-3 text-center" style={animStyle}>
      <div className="text-[20px] font-semibold leading-none">
        {value}
        {suffix && <span className="ml-0.5 text-[13px] font-normal text-fg3">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.5px] text-fg3">{label}</div>
      {sublabel && <div className="text-[9px] text-fg4">{sublabel}</div>}
    </div>
  );
}

function StatSkeleton({ label }) {
  return (
    <div className="flex-1 bg-bg px-2 py-3 text-center">
      <Skeleton className="mx-auto h-5 w-10" />
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.5px] text-fg3">{label}</div>
      <Skeleton className="mx-auto mt-0.5 h-2 w-12" />
    </div>
  );
}

function uvCategory(uv) {
  if (uv < 3) return "low";
  if (uv < 6) return "mod";
  if (uv < 8) return "high";
  if (uv < 11) return "v.high";
  return "extreme";
}

function windCategory(mph) {
  if (mph < 5) return "calm";
  if (mph < 10) return "light";
  if (mph < 15) return "breezy";
  if (mph < 20) return "choppy";
  return "rough";
}

export default function StatsRow({ weather, loading }) {
  if (loading) {
    return (
      <div className="mb-6 flex min-h-[76px] gap-px bg-line">
        <StatSkeleton label="Air" />
        <StatSkeleton label="Wind" />
        <StatSkeleton label="UV" />
        <StatSkeleton label="Next 72h" />
      </div>
    );
  }

  const air = weather?.air_temp_f != null ? Math.round(weather.air_temp_f) : "—";

  const rainNext = weather?.rain_next_72h_inches;
  const rainNextValue =
    rainNext == null ? "—" : rainNext < 0.01 ? "dry" : rainNext.toFixed(2);
  const rainNextSuffix = rainNext != null && rainNext >= 0.01 ? "″" : null;

  const uvNow = weather?.uv_index;
  const uvPeak = weather?.uv_peak_today;
  const uvValue = uvNow != null ? Math.round(uvNow) : "—";
  const uvSub =
    uvNow != null
      ? uvPeak != null && uvPeak > uvNow + 0.5
        ? `${uvCategory(uvNow)} · peak ${Math.round(uvPeak)}`
        : uvCategory(uvNow)
      : null;

  const windNow = weather?.wind_mph;
  const windGust = weather?.wind_gust_mph_today;
  const windValue = windNow != null ? windNow : "—";
  const windSub =
    windNow != null
      ? windGust != null && windGust > windNow + 5
        ? `${windCategory(windNow)} · gust ${windGust}`
        : windCategory(windNow)
      : null;

  const anim = (i) => fadeInSequence(i, { step: 60, base: SECTION_DELAY.stats });

  return (
    <div className="mb-6 flex min-h-[76px] gap-px bg-line">
      <Stat value={air} suffix="°F" label="Air" animStyle={anim(0)} />
      <Stat value={windValue} suffix="mph" label="Wind" sublabel={windSub} animStyle={anim(1)} />
      <Stat value={uvValue} label="UV" sublabel={uvSub} animStyle={anim(2)} />
      <Stat value={rainNextValue} suffix={rainNextSuffix} label="Next 72h" sublabel="rain" animStyle={anim(3)} />
    </div>
  );
}
