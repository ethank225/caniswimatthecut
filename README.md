# caniswimatthecut

A small dashboard that answers exactly one question: **can I swim at the Montlake Cut today?**

Pulls live water temperature, weather, sewer-overflow status, and SPD activity for the UW / Montlake area, runs a verdict cascade, and shows a single answer (`Heck yes.` / `Yes.` / `Maybe.` / `Brrr.` / `Nope.`) with the supporting numbers and a 90-day history grid.

Live at [caniswimatthecut.com](https://caniswimatthecut.com) (eventually). Built as a Cloudflare Worker + Cloudflare Pages site backed by KV and Supabase.

## Stack

| Layer | Tech |
|-------|------|
| API | Cloudflare Worker (cron + REST) |
| Buoy scraper | Separate Cloudflare Worker (15 min cron → Supabase) |
| Frontend | React 18 + Vite + Tailwind |
| Storage | Supabase Postgres (buoy readings + reports, Realtime); Cloudflare KV (weather / CSO / SPD) |
| Hosting | Cloudflare Pages (static) + Workers (API) |

## Repo layout

```
backend/                     Cloudflare Worker (API)
  src/
    index.js                 routes + scheduled handler
    verdict.js               threshold cascade (single source of truth)
    reports.js               POST /api/report, GET /api/reports
    supabase.js              REST helper + IP hashing
    sources/
      buoy.js                reads latest shallow readings from Supabase
      cso.js                 King County CSO CSV (ArcGIS-backed, KV-cached)
      spd.js                 data.seattle.gov SODA API (KV-cached)
      weather.js             Open-Meteo (temp/wind/UV/rain, KV-cached)
      history.js             90 days from Supabase + Open-Meteo archive
    util/time.js             Pacific-time helpers
  wrangler.toml

buoy-scraper/                Cloudflare Worker (15 min cron → Supabase)
  src/
    index.js                 scraper + dedup
    parse.js                 shared HTML/timezone helpers
  backfill.mjs               Node one-shot: last 12 months → Supabase
  wrangler.toml

frontend/                    React + Vite + Tailwind
  src/
    App.jsx                  hash-based router
    pages/
      Home.jsx               dashboard
      About.jsx              data-source explainer
    components/              one file per section
    hooks/
      useConditions.js       /api/conditions + 5 min poll
      useReports.js          /api/reports + Supabase Realtime
      useHistory.js          /api/history + 6 h refresh
    lib/
      api.js                 base-URL helper
      supabase.js            client (null if not configured)
      format.js              timeAgo / formatTime / formatTimestamp
  public/favicon.svg
  tailwind.config.js
```

## Endpoints

| Method | Path | Cache |
|--------|------|-------|
| `GET` | `/api/conditions` | fresh per-request; weather / CSO / SPD each have their own per-source KV cache (1 h / 30 min / 15 min); buoy reads Supabase live |
| `GET` | `/api/history` | fresh per-request; reads Supabase `buoy_readings` + Open-Meteo archive (edge-cached 1 h) |
| `GET` | `/api/reports` | uncached; queries Supabase per-request |
| `POST` | `/api/report` | rate-limited to 1 / IP-hash / 10 min |
| `GET` | `/api/health` | trivial liveness check |
| `GET` | `/api/debug` | per-probe status + latency for CSO + Supabase |

## Verdict logic

First match wins (see `backend/src/verdict.js`):

```
CSO active             → nope
Rain past 48 h ≥ 0.75″ → nope
Rain past 48 h ≥ 0.30″ → maybe
Water < 50 °F          → brrr
Water < 57 °F          → maybe
Water < 65 °F          → yes
Water ≥ 65 °F          → heck yes
```

Police alerts and community cop reports are shown but never affect the verdict.

## Local setup

### Prereqs
- Node 18+
- A Cloudflare account (free tier is plenty)
- A Supabase project (free tier)

### Backend (API)

```bash
cd backend
npm install

# Create the KV namespace (still used for weather / CSO / SPD per-source caches)
# and paste the returned id into wrangler.toml.
npx wrangler kv namespace create SWIM_DATA

# Drop your secrets into a .dev.vars file (git-ignored)
cp .dev.vars.example .dev.vars
# edit .dev.vars: SUPABASE_URL + SUPABASE_ANON_KEY (anon — read-only, respects RLS)

# Run with --remote so outbound fetches use Cloudflare's network
# (King County's WAF blocks workerd's local TLS fingerprint).
npx wrangler dev --remote
```

The Worker is now at `http://localhost:8787`. Hit `/api/conditions` to exercise every source end-to-end:

```bash
curl -s http://localhost:8787/api/conditions | python3 -m json.tool
```

### Buoy scraper

The buoy scraper is a second Worker that runs on its own 15 min cron and writes into Supabase `buoy_readings`. The API reads from that table — the scraper is the only thing that hits King County.

```bash
cd buoy-scraper
# no npm install needed — no deps

cp .dev.vars.example .dev.vars
# edit .dev.vars: SUPABASE_URL + SUPABASE_SERVICE_KEY (service role — bypasses RLS, write access)

npx wrangler dev --remote
# hit http://localhost:8787/ in a browser to trigger a one-off scrape
```

To backfill the last 12 months of history in one shot (runs in Node, no Cloudflare involved):

```bash
cd buoy-scraper
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node backfill.mjs
```

### Supabase

In the Supabase SQL editor, run:

```sql
-- Buoy readings: written by buoy-scraper, read by backend API.
create table buoy_readings (
  buoy text not null,
  reading_time timestamptz not null,
  depth_m real,
  temp_c real,
  primary key (buoy, reading_time)
);
alter table buoy_readings enable row level security;
create policy "public read" on buoy_readings for select using (true);
-- Writes use the service-role key, which bypasses RLS.

-- Community reports.
create table reports (
  id uuid primary key default gen_random_uuid(),
  is_cops boolean not null,
  ip_hash text,
  created_at timestamptz default now()
);
create index idx_reports_created_at on reports(created_at desc);
alter publication supabase_realtime add table reports;

alter table reports enable row level security;
create policy "Anyone can read reports" on reports for select using (true);
create policy "Anyone can insert with rate limit" on reports for insert with check (true);
```

The Worker enforces the 10-min-per-IP rate limit in JS; the policy just allows anon inserts to reach the table.

### Frontend

```bash
cd frontend
npm install

# Point Vite at your local API + Supabase project
cat > .env.development <<EOF
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
EOF

npm run dev
```

Open <http://localhost:5173> (Vite will pick a higher port if 5173 is taken).

## Deploying

```bash
# Backend API — set production secrets once, then deploy
cd backend
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler deploy

# Buoy scraper — separate Worker, separate secrets (service-role key)
cd ../buoy-scraper
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler deploy

# Frontend — build + push to Pages
cd ../frontend
cat > .env.production <<EOF
VITE_API_URL=https://caniswimatthecut-api.ekawah.workers.dev
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
EOF
npm run build
npx wrangler pages deploy dist --project-name caniswimatthecut
```

Add `caniswimatthecut.com` as a custom domain on the Pages project when DNS is ready.

## Why some choices

- **`--remote` for local dev.** King County's F5 BIG-IP WAF blocks workerd's local TLS fingerprint. Running on Cloudflare's edge gets you a trusted IP / TLS stack and the King County endpoints stop returning 502s.
- **CSV instead of HTML scraping for CSO.** The CSO status page is just an iframe wrapper around an ArcGIS webmap. The map's CSV layer (`your.kingcounty.gov/.../CSO_metadata.CSV`) is a clean structured feed; scraping the page would be useless.
- **Rate limit in JS, not RLS.** Doing it server-side via the Worker means we can hash the real `cf-connecting-ip` (never exposed to the browser) instead of relying on Postgres-side IP detection.
- **Buoy data in Supabase, not KV.** Live reads, the 90-day history grid, and the raw time-series all want the same rows. A Postgres table with `(buoy, reading_time)` PK gives deduped inserts (`Prefer: resolution=merge-duplicates`), cheap range queries for history, and decouples scraper writes from API reads. KV is wrong for time-series.
- **Scraper is a separate Worker.** One job, one cron, its own service-role secret. The API never needs King County credentials or User-Agents; it only reads Supabase.

## Data sources

| Source | URL | Cadence |
|--------|-----|---------|
| Water temp | `green2.kingcounty.gov/lake-buoy/DataScrape.aspx` | `buoy-scraper/` (separate Worker) scrapes every 15 min → Supabase `buoy_readings` |
| CSO | `your.kingcounty.gov/.../CSO_metadata.CSV` | KC refreshes ~10 min, we cache 30 min in KV |
| SPD | `data.seattle.gov/resource/33kz-ixgy.json` | KV-cached 15 min |
| Weather | `api.open-meteo.com/v1/forecast` | KV-cached 1 h |
| Rain history | `archive-api.open-meteo.com/v1/archive` | edge-cached 1 h via `cf.cacheTtl` |

See `frontend/src/pages/About.jsx` (rendered at `#/about`) for the user-facing version.
