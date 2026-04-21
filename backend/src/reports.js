import { supabaseFetch, hashIP } from "./supabase.js";

const RATE_LIMIT_MS = 10 * 60 * 1000;
const WINDOW_MS = 24 * 3600 * 1000;

export async function handleReport(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }
  if (typeof body.is_cops !== "boolean") {
    return jsonResponse({ error: "is_cops must be boolean" }, 400, corsHeaders);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await hashIP(ip);

  try {
    const since = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
    const existing = await supabaseFetch(
      env,
      `/rest/v1/reports?ip_hash=eq.${ipHash}&created_at=gte.${since}&select=id`,
      "GET",
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return jsonResponse(
        { error: "Rate limited. Try again in a few minutes." },
        429,
        corsHeaders,
      );
    }

    await supabaseFetch(env, "/rest/v1/reports", "POST", {
      is_cops: body.is_cops,
      ip_hash: ipHash,
    });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  } catch (err) {
    console.error("report insert failed", err);
    return jsonResponse({ error: "Upstream error" }, 502, corsHeaders);
  }
}

export async function handleGetReports(env, corsHeaders) {
  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const data = await supabaseFetch(
      env,
      `/rest/v1/reports?created_at=gte.${since}&order=created_at.asc&select=is_cops,created_at`,
      "GET",
    );

    const copsByHour = new Array(24).fill(0);
    const clearsByHour = new Array(24).fill(0);
    const now = Date.now();
    for (const r of data || []) {
      const age = now - new Date(r.created_at).getTime();
      const hourAgo = Math.floor(age / 3600000);
      if (hourAgo >= 0 && hourAgo < 24) {
        const idx = 23 - hourAgo;
        if (r.is_cops) copsByHour[idx]++;
        else clearsByHour[idx]++;
      }
    }

    const latest = data && data.length > 0 ? data[data.length - 1] : null;
    return jsonResponse(
      {
        cops_by_hour: copsByHour,
        clears_by_hour: clearsByHour,
        latest: latest
          ? { is_cops: latest.is_cops, created_at: latest.created_at }
          : null,
        total_cops: (data || []).filter((r) => r.is_cops).length,
        total_clear: (data || []).filter((r) => !r.is_cops).length,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("reports fetch failed", err);
    return jsonResponse({ error: "Upstream error" }, 502, corsHeaders);
  }
}

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
