# Building Intelligence LU

> A commune-level building-stock intelligence dashboard for SECO Luxembourg inspectors.
> Built as part of the SECO Group AI & Data Engineer take-home challenge.

<!-- TODO: add screenshot/GIF of the running app before submitting -->

Luxembourg has 100 communes and a finite number of inspectors. This dashboard turns
open government data into a single risk-ranked map so inspection campaigns can start
with the communes whose building stock most likely needs attention — instead of a
spreadsheet and institutional memory.

---

## What problem are you solving, and for whom?

**For:** a SECO Luxembourg inspection planner deciding where to focus periodic-control
and IDI (decennial-insurance) inspection campaigns.

**The problem:** SECO inspects buildings one at a time, but campaigns are planned at the
territory level. Today that prioritisation leans on experience and ad-hoc data gathering —
someone manually cross-references census tables, permit statistics, and local knowledge to
guess which areas have the oldest, least-renovated, or most-vacant stock. That is slow,
hard to justify, and easy to bias.

This tool collapses that work into one view: every commune coloured by a transparent
building-stock risk index, clickable for the underlying numbers and an AI-written
inspector briefing. A planner can open it and immediately see that the rural north
(Weiswampach, Wincrange) carries more building-stock risk than the fast-growing centre,
and act on it.

## Why is this relevant to SECO?

SECO Luxembourg is the country's reference for independent technical control — IDI
insurance technical control, periodic building inspections, and conformity assessment.
Its core economics depend on directing scarce expert inspector time where building risk
is highest. Aging stock, deferred maintenance, and low renovation activity are precisely
the conditions that produce the structural, asbestos, and envelope defects SECO is hired
to catch.

A commune-level risk map is a natural front door to that work: it makes campaign
prioritisation defensible (every score traces back to public data and a documented
formula), repeatable (re-run the pipeline when new census/permit data lands), and fast
(no per-inspection data hunting). It is deliberately a *decision-support* layer on top of
open data — not a replacement for SECO's expert judgement.

## Data sources

| Source | Provider | What it contributes | License |
|--------|----------|---------------------|---------|
| Commune administrative boundaries (GeoJSON) | ACT / geoportail.lu | Polygon geometry for the choropleth | CC0 |
| 2021 Census — Housing (`DF_B1707`, `DF_B1706`) | STATEC (lustat SDMX API) | Dwellings, occupancy/vacancy and building-type mix per commune; construction era at national level | CC0 |
| Building permits time series (`DF_D4123`) | STATEC (lustat SDMX API) | Residential permit counts per canton, 2010–2025 — a renovation/construction-activity proxy | CC0 |

**How they are joined.** The census and permit tables are fetched live from STATEC's
[lustat SDMX REST API](https://lustat.statec.lu) as labelled CSV. Census housing metrics
are keyed to communes by name (with a small alias table for the 2 renamed and 2 merged
communes since the census vintage) and joined onto the boundary polygons. Permit data is
only published at **canton** granularity, so each commune inherits its canton's permit
trend — an accepted limitation, noted below. No spatial library (GDAL/geopandas) is
needed: the join is name-based and the geometry passes through untouched.

## Technical decisions and trade-offs

### The most important data decision

The original plan was a risk model driven by **construction era per commune** (share of
pre-1960 stock, etc.). After querying every relevant STATEC dataflow and checking the
INSPIRE building register, that data **does not exist at commune grain**: STATEC publishes
construction era only nationally (`DF_B1706`, `GEO = _Z`), and the INSPIRE building
footprints carry geometry and identifiers but no construction date. Rather than fabricate
it, the risk model was **reframed around the strongest signals that *are* available at
commune level**, and construction era is shown as a national-context chart only. This is
the honest, defensible version of the product given open Luxembourg data.

### The risk index

Each commune gets a composite score from three normalised signals:

```
composite = 0.45 · vacancy_rate              # vacant/under-used stock → deferred maintenance
          + 0.35 · small_building_share       # dispersed single/two-dwelling → older detached housing
          + 0.20 · low_permit_trend           # declining canton permits → little renovation/new build
risk_score = minmax(composite) · 100          # stretched to a 0–100 relative prioritisation index
```

`risk_score` is a **relative** index (0 = lowest building-stock risk in Luxembourg today,
100 = highest), not an absolute probability. The weights are a transparent heuristic, not a
trained model — appropriate for the data and the scope, and documented so SECO experts can
challenge them. Current distribution across 100 communes: **52 low · 43 medium · 5 high**.

### What I chose and why
- **React + Vite + Leaflet** over Next.js/Mapbox: simplest deploy, Leaflet needs no API token.
- **Static GeoJSON, precomputed by the pipeline** over a live DB: the map loads with zero
  query latency, and the data is reproducible and reviewable in the repo.
- **Node serverless functions on Vercel**: one platform for the static front end and the API.
- **Gemini 2.5 Flash** for narratives: cheap, fast, and good enough for a 3-sentence inspector
  briefing. (The spec named 1.5 Flash, but it is now 404'd; 2.0-flash returns zero free-tier
  quota on an EU key — 2.5-flash works, with the model's "thinking" budget disabled so the
  short answer isn't truncated.)
- **Commune-level granularity**: the finest grain at which Luxembourg publishes the
  underlying housing data.

### Trade-offs accepted
- Risk score is a heuristic, not ML — no labelled inspection outcomes are available to train on.
- Permit data is per **canton**, attributed equally to each commune in it — a known approximation.
- AI narrative is cached in-memory per warm serverless instance (good enough for a demo; not durable).
- No auth, no database — this is a decision-support demo, not a production system.

## What would you put in production tomorrow vs. what would you throw away?

**Keep and harden**
- The data pipeline structure and source selection — it's reproducible and CC0-clean.
- The transparent commune-level risk index — but recalibrate the weights with SECO experts.
- The Gemini narrative pattern — moved behind a proper queue with durable caching.

**Throw away or replace**
- Static GeoJSON inlined into the bundle → serve from `/api/communes` (already built) or a real
  PostGIS store once data volume grows.
- In-memory narrative cache → Redis/KV with TTL.
- Heuristic weights → a model trained on SECO's own historical inspection/defect outcomes, which
  would turn this from "where is the stock oldest" into "where are defects most likely".

## If you had 3 more months, what would the product look like?

- **Building-level granularity** if/when EPC or building-age data becomes open, so inspectors
  drill from commune → street → building.
- **A trained risk model** on SECO's historical inspection results, validated against real defect
  rates, replacing the heuristic.
- **Integration with SECO's inspection scheduling** so a campaign can be planned and dispatched
  from the map.
- **A mobile, offline-friendly view** for inspectors on site, with the AI briefing and the
  building's risk context in hand.

## Running locally

```bash
# 1. Clone
git clone https://github.com/sai-sundar/building-intelligence-lu
cd building-intelligence-lu

# 2. Set up environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env (only needed for AI narratives)

# 3. (Optional) re-run the data pipeline — output is already committed
cd pipeline
pip install -r requirements.txt          # requests + pandas, no GDAL/geopandas
python 01_fetch_boundaries.py            # commune boundary polygons
python 02_fetch_census.py                # STATEC 2021 housing census (SDMX)
python 03_fetch_permits.py               # STATEC building-permit time series
python 04_compute_risk_scores.py         # join + composite risk index
python 05_export_geojson.py              # → frontend/src/data/{communes.geojson, stats.json}

# 4. Start the app (full stack — map, charts, AND the AI narrative)
cd ../frontend
npm install
npm run dev                              # http://localhost:5173
```

`npm run dev` runs a small dev-only Vite middleware (see `vite.config.js`) that serves the
`/api` serverless functions locally, so the Gemini narrative works with just one command —
it reads `GEMINI_API_KEY` from the repo-root `.env`. Without a key, the map and charts still
work and the narrative shows a graceful fallback. (On Vercel, the real functions in `/api`
are used; the middleware is dev-only.)

## Deployment

Deployed on Vercel — static front end (`frontend/dist`) plus Node serverless functions
in `/api`. Set **`GEMINI_API_KEY`** in the Vercel project's Environment Variables; the
data files are bundled into the functions via `vercel.json`.

Live URL: _TODO — add after deploy_

## API

| Endpoint | Returns |
|----------|---------|
| `GET /api/communes` | Full risk GeoJSON (no AI call; CDN-cacheable) |
| `GET /api/commune/:code` | Commune identity + Gemini risk narrative; `narrative: null` with a fallback if the model is unavailable (never 500s on AI failure) |

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet / react-leaflet, Recharts, React Query
- **Backend:** Vercel Node serverless functions
- **AI:** Google Gemini 2.5 Flash
- **Data:** STATEC (CC0), ACT / geoportail.lu (CC0)
- **Pipeline:** Python — `pandas` + `requests` (name-based join, no spatial library)
