export const RAIN_NOPE = 0.75;
export const RAIN_MAYBE = 0.30;
export const TEMP_BRRR = 50;
export const TEMP_COLD_MAYBE = 57;
export const TEMP_HECK_YES = 65;

export function computeVerdict(waterTempF, rain48h, csoActive) {
  if (csoActive === true)
    return { verdict: "nope", reason: "Sewer overflow active. Do not swim." };
  if (rain48h >= RAIN_NOPE)
    return { verdict: "nope", reason: `${rain48h.toFixed(2)}" rain in 48h. Bacteria risk.` };
  if (rain48h >= RAIN_MAYBE)
    return { verdict: "maybe", reason: `${rain48h.toFixed(2)}" rain recently. Borderline.` };
  if (waterTempF === null || waterTempF === undefined)
    return { verdict: "maybe", reason: "No temperature data available." };
  if (waterTempF < TEMP_BRRR)
    return { verdict: "brrr", reason: `${waterTempF.toFixed(0)}°F. Wetsuit territory.` };
  if (waterTempF < TEMP_COLD_MAYBE)
    return { verdict: "maybe", reason: `${waterTempF.toFixed(0)}°F. Cold but doable.` };
  if (waterTempF < TEMP_HECK_YES)
    return { verdict: "yes", reason: `${waterTempF.toFixed(0)}°F. Get in there.` };
  return { verdict: "heck yes", reason: `${waterTempF.toFixed(0)}°F. Peak Cut summer.` };
}
