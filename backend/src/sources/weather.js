const ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=47.6467&longitude=-122.3049" +
  "&current=temperature_2m,uv_index,windspeed_10m,windgusts_10m" +
  "&hourly=precipitation,temperature_2m,uv_index,windspeed_10m,windgusts_10m" +
  "&past_hours=48&forecast_hours=168" +
  "&temperature_unit=fahrenheit&precipitation_unit=inch&windspeed_unit=mph";

// Cache briefly so point-in-time values (air temp, wind, UV) reflect
// open-meteo's ~15-min current-conditions refresh rather than hourly
// forecast grid values that can stay rounded to the same integer for hours.
const KEY = "weather_data_v4";
const TTL = 900;

function ptDate(isoGmt) {
  const d = new Date(isoGmt + "Z");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export async function fetchWeather(env) {
  const cached = await env.SWIM_DATA.get(KEY, { type: "json" });
  if (
    cached &&
    cached.uv_index !== undefined &&
    cached.rain_next_72h_inches !== undefined &&
    cached.wind_mph !== undefined
  ) return cached;

  const res = await fetch(ENDPOINT, { cf: { cacheTtl: 600 } });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const body = await res.json();

  const {
    time,
    precipitation,
    temperature_2m,
    uv_index,
    windspeed_10m,
    windgusts_10m,
  } = body.hourly;
  const nowMs = Date.now();
  let nowIdx = 0;
  for (let i = 0; i < time.length; i++) {
    if (Date.parse(time[i] + "Z") > nowMs) break;
    nowIdx = i;
  }

  // Prefer the `current` block for point-in-time values — open-meteo refreshes
  // it more often than the hourly grid, so air temp / UV / wind don't get stuck
  // rounded to the same integer across several hourly-forecast refreshes.
  const current = body.current || {};

  let rain48 = 0;
  for (let i = Math.max(0, nowIdx - 47); i <= nowIdx; i++) {
    rain48 += precipitation[i] || 0;
  }

  let rainNext72 = 0;
  for (let i = nowIdx + 1; i < Math.min(time.length, nowIdx + 73); i++) {
    rainNext72 += precipitation[i] || 0;
  }

  let uvPeak = 0;
  const startOfDay = nowIdx - (new Date(time[nowIdx] + "Z").getUTCHours());
  const endOfDay = Math.min(time.length, startOfDay + 24);
  for (let i = Math.max(0, startOfDay); i < endOfDay; i++) {
    if ((uv_index?.[i] ?? 0) > uvPeak) uvPeak = uv_index[i];
  }

  let gustPeak = 0;
  for (let i = Math.max(0, startOfDay); i < endOfDay; i++) {
    if ((windgusts_10m?.[i] ?? 0) > gustPeak) gustPeak = windgusts_10m[i];
  }

  const uvNow = Math.max(
    0,
    current.uv_index ?? uv_index?.[nowIdx] ?? 0,
  );
  const windNow = Math.max(
    0,
    current.windspeed_10m ?? windspeed_10m?.[nowIdx] ?? 0,
  );
  const airNow = current.temperature_2m ?? temperature_2m?.[nowIdx] ?? null;
  const rainNext72Round = Math.round(rainNext72 * 100) / 100;

  // Group future hours by Pacific date so the 7-day forecast aligns with
  // locally-perceived "tomorrow", "Wednesday", etc.
  const todayPT = ptDate(time[nowIdx]);
  const byDate = new Map();
  for (let i = nowIdx + 1; i < time.length; i++) {
    const date = ptDate(time[i]);
    if (date <= todayPT) continue;
    if (!byDate.has(date)) byDate.set(date, { temps: [], rain: 0 });
    const b = byDate.get(date);
    b.temps.push(temperature_2m[i]);
    b.rain += precipitation[i] || 0;
  }
  const forecast_days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 7)
    .map(([date, { temps, rain }]) => ({
      date,
      air_temp_avg: temps.length
        ? Math.round((temps.reduce((s, t) => s + t, 0) / temps.length) * 10) / 10
        : null,
      rain_total: Math.round(rain * 100) / 100,
    }));

  const result = {
    air_temp_f: airNow != null ? Math.round(airNow) : null,
    rain_48h_inches: Math.round(rain48 * 100) / 100,
    rain_next_72h_inches: rainNext72Round,
    forecast_3day: rainNext72 < 0.1 ? "clear" : "rain expected",
    uv_index: Math.round(uvNow * 10) / 10,
    uv_peak_today: Math.round(uvPeak * 10) / 10,
    wind_mph: Math.round(windNow),
    wind_gust_mph_today: Math.round(gustPeak),
    forecast_days,
  };

  await env.SWIM_DATA.put(KEY, JSON.stringify(result), { expirationTtl: TTL });
  return result;
}
