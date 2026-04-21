import { fetchBuoyData } from "./sources/buoy.js";
import { fetchCSOStatus } from "./sources/cso.js";
import { fetchSPDCalls } from "./sources/spd.js";
import { fetchWeather } from "./sources/weather.js";
import { computeVerdict } from "./verdict.js";
import { toPTIso } from "./util/time.js";
import { handleReport, handleGetReports } from "./reports.js";
import { fetchHistory } from "./sources/history.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);

    if (url.pathname === "/api/conditions") {
      const data = await collectAndCompute(env);
      return json(data);
    }

    if (url.pathname === "/api/report" && request.method === "POST") {
      return handleReport(request, env, CORS);
    }

    if (url.pathname === "/api/reports" && request.method === "GET") {
      return handleGetReports(env, CORS);
    }

    if (url.pathname === "/api/history" && request.method === "GET") {
      try {
        const data = await fetchHistory(env);
        return json(data);
      } catch (e) {
        console.error("history fetch failed", e);
        return json({ error: "Could not load history" }, 502);
      }
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, time: toPTIso(new Date()) });
    }

    if (url.pathname === "/api/debug") {
      const probes = [
        ["cso", "https://your.kingcounty.gov/dnrp/library/wastewater/cso/img/CSO_metadata.CSV", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0",
          },
        }],
        ["supabase (buoy_readings)", `${env.SUPABASE_URL}/rest/v1/buoy_readings?limit=1`, {
          method: "HEAD",
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
        }],
      ];
      const results = {};
      for (const [name, u, opts] of probes) {
        const t0 = Date.now();
        try {
          const r = await fetch(u, opts);
          const body = await r.text();
          results[name] = {
            ok: r.ok,
            status: r.status,
            latency_ms: Date.now() - t0,
            headers: Object.fromEntries(r.headers),
            body_len: body.length,
            body_head: body.slice(0, 300),
          };
        } catch (e) {
          results[name] = {
            ok: false,
            latency_ms: Date.now() - t0,
            error: String(e.message || e),
          };
        }
      }
      return json(results);
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(collectAndCompute(env));
  },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildForecast7Day(forecastDays, currentWaterF) {
  if (!Array.isArray(forecastDays) || forecastDays.length === 0) return null;
  if (currentWaterF == null) return null;
  const result = [];
  let waterF = currentWaterF;
  for (let i = 0; i < Math.min(7, forecastDays.length); i++) {
    const d = forecastDays[i];
    const airF = d.air_temp_avg != null ? d.air_temp_avg : waterF;
    const drift = Math.sign(airF - waterF) * 0.5;
    const change = Math.max(-1, Math.min(1, drift));
    waterF = waterF + change;
    const [y, mo, day] = d.date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, day));
    const { verdict } = computeVerdict(waterF, d.rain_total ?? 0, false);
    result.push({
      day: DAY_NAMES[dt.getUTCDay()],
      date: d.date,
      water_temp_f: Math.round(waterF),
      rain_inches: Math.round((d.rain_total ?? 0) * 100) / 100,
      verdict,
    });
  }
  return result;
}

async function collectAndCompute(env) {
  const [buoy, cso, spd, weather] = await Promise.allSettled([
    fetchBuoyData(env),
    fetchCSOStatus(env),
    fetchSPDCalls(env),
    fetchWeather(env),
  ]);

  const buoyData = buoy.status === "fulfilled" ? buoy.value : null;
  const csoData = cso.status === "fulfilled" ? cso.value : { active: null, last_checked: toPTIso(new Date()) };
  const spdData = spd.status === "fulfilled" ? spd.value : [];
  const weatherData = weather.status === "fulfilled" ? weather.value : null;

  const waterTempF = buoyData?.readings?.length
    ? buoyData.readings[buoyData.readings.length - 1].temp_f
    : null;
  const rain48h = weatherData?.rain_48h_inches ?? 0;

  const { verdict, reason } = computeVerdict(waterTempF, rain48h, csoData.active);
  const forecast7day = buildForecast7Day(weatherData?.forecast_days, waterTempF);

  return {
    verdict,
    reason,
    water: buoyData || {
      temp_f: null, temp_c: null, high_f: null, low_f: null,
      source: "King Co. buoy", last_reading: null, readings: [],
    },
    weather: weatherData || { air_temp_f: null, rain_48h_inches: 0, forecast_3day: "unknown" },
    cso: csoData,
    alerts: spdData,
    forecast_7day: forecast7day,
    updated_at: toPTIso(new Date()),
  };
}
