import Header from "../components/Header.jsx";

function Section({ title, source, children }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.5px] text-fg">{title}</h2>
        {source && <span className="text-[10px] text-fg4">{source}</span>}
      </div>
      <div className="space-y-2 text-[13px] leading-[1.55] text-fg2">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="w-20 shrink-0 text-fg4">{label}</span>
      <span className="text-fg3">{children}</span>
    </div>
  );
}

export default function About() {
  return (
    <div className="flex justify-center px-5 pb-20 pt-10">
      <div className="w-full max-w-[480px]">
        <Header />

        <a
          href="#/"
          className="mb-6 inline-block text-[12px] text-fg3 no-underline hover:text-fg"
        >
          ← back
        </a>

        <h1 className="mb-2 text-[36px] font-bold leading-none tracking-[-1px]">
          About the data
        </h1>
        <p className="mb-8 text-[14px] leading-[1.5] text-fg2">
          The verdict is a mash-up of four feeds. Here's where each one comes
          from, how often it updates, and what it actually means.
        </p>

        <Section title="Water temperature" source="green2.kingcounty.gov">
          <p>
            King County maintains a water-quality buoy moored in Lake
            Washington. A sonde lowers from the surface and records temperature,
            DO, conductivity, pH, chlorophyll, and turbidity at every depth on
            the way down — a "profile cast." There are roughly 4–6 casts a day.
          </p>
          <p>
            We keep every row from the upper meter of each cast (depth &lt;
            1.1 m) — the range you'd actually be swimming in. Current water
            temp is the most recent shallow reading.
          </p>
          <Field label="endpoint">DataScrape.aspx → Supabase</Field>
          <Field label="cadence">scraped into Supabase every 15 min</Field>
          <Field label="caveat">
            tagged "provisional" by King County until later QC review
          </Field>
        </Section>

        <Section title="Sewer overflow status" source="kingcounty.gov / ArcGIS">
          <p>
            Seattle's older sewers carry stormwater and sewage in the same
            pipe. When it rains hard, those pipes can overflow into the lake at
            outfalls called CSOs. We flag a CSO if any of three Cut-adjacent
            outfalls is "currently overflowing" or has overflowed in the last
            48 h: Montlake, University, or Canal St (in the Ship Canal).
          </p>
          <p>
            "Stay out for 48 h after an overflow" is the King County / SPU
            posted guidance. CSO status overrides everything else in the
            verdict — if it's active, the answer is no.
          </p>
          <Field label="endpoint">CSO_metadata.CSV (ArcGIS-backed)</Field>
          <Field label="cadence">King County refreshes ~10 min, we cache 30 min</Field>
        </Section>

        <Section title="Weather" source="open-meteo.com">
          <p>
            Air temp, wind, UV, recent rain, and the 3-day rain outlook all
            come from one Open-Meteo call for coordinates 47.6467, -122.3049
            (the Cut). Past 48 h and next 72 h of hourly precipitation are
            summed into the two rain cells. Wind shows current speed; the
            "gust N" sublabel appears when today's peak gust is meaningfully
            higher than the steady wind — that's the boat-chop multiplier.
          </p>
          <p>
            Seattle drizzles constantly, so a low rain threshold would mean the
            site says "maybe" all winter and people stop trusting it. We only
            flag rain when it's heavy enough to overwhelm the storm system:
            above 0.75″ in 48 h is "nope," above 0.30″ is "maybe." The actual
            sewage-into-the-water signal is the CSO feed above — if those
            outfalls are quiet, drizzle isn't the bacteria problem.
          </p>
          <Field label="endpoint">api.open-meteo.com/v1/forecast</Field>
          <Field label="cadence">cached 1 h</Field>
        </Section>

        <Section title="Police activity" source="data.seattle.gov">
          <p>
            Recent SPD dispatch calls in beat U2 (UW / Montlake / the Cut),
            filtered to the call types that might affect a swim:
            disturbances, trespass, marine, narcotics, weapons, assault,
            hazards, parks. Last 3 hours only. Calls show up here as a
            heads-up, not as a verdict input.
          </p>
          <Field label="endpoint">SODA: 33kz-ixgy.json</Field>
          <Field label="cadence">cached 15 min</Field>
        </Section>

        <Section title="Cops at the Cut?" source="community reports">
          <p>
            Two-button community reporting backed by Supabase. Tap "cops here"
            or "all clear"; everyone watching the page sees the timeline
            update within a second via Supabase Realtime. Each device is
            limited to one report every 10 min (rate-limited by hashed IP).
          </p>
          <p>
            Reports are kept for 24 h on the timeline. We never store raw IP
            addresses — just a salted SHA-256 hash, truncated to 16 hex chars.
          </p>
          <Field label="storage">Supabase postgres</Field>
          <Field label="rate limit">1 / IP / 10 min</Field>
        </Section>

        <Section title="The verdict logic">
          <p>First match wins:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>CSO active → <strong className="text-fg">nope</strong></li>
            <li>Rain past 48 h ≥ 0.75″ → <strong className="text-fg">nope</strong></li>
            <li>Rain past 48 h ≥ 0.30″ → <strong className="text-fg">maybe</strong></li>
            <li>Water temp &lt; 50 °F → <strong className="text-fg">brrr</strong></li>
            <li>Water temp &lt; 57 °F → <strong className="text-fg">maybe</strong></li>
            <li>Water temp &lt; 65 °F → <strong className="text-fg">yes</strong></li>
            <li>Water temp ≥ 65 °F → <strong className="text-fg">heck yes</strong></li>
          </ul>
          <p>
            "Heck yes" is the rare event tier — the Cut only crosses 65 °F for
            roughly 6–8 weeks a year, late July through early September. When it
            shows up, that's the time to actually swim.
          </p>
          <p>
            Police alerts and community cop reports are shown separately —
            they don't change the verdict.
          </p>
        </Section>

        <Section title="Stack">
          <Field label="API">Cloudflare Worker (cron + REST)</Field>
          <Field label="scraper">separate Worker → Supabase every 15 min</Field>
          <Field label="cache">Cloudflare KV (CSO / weather / SPD)</Field>
          <Field label="storage">Supabase (buoy readings + reports, realtime)</Field>
          <Field label="frontend">React + Vite + Tailwind</Field>
        </Section>

        <a
          href="#/"
          className="mt-4 inline-block text-[12px] text-fg3 no-underline hover:text-fg"
        >
          ← back
        </a>
      </div>
    </div>
  );
}
