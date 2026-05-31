# Building Intelligence LU

> A commune-level building stock intelligence dashboard for SECO Luxembourg inspectors.
> Built as part of the SECO Group AI & Data Engineer take-home challenge.

<!-- TODO: screenshot or GIF of the running app -->

## What problem are you solving, and for whom?

_TODO — SECO inspector persona, the pain of not knowing which communes to prioritise
for inspection campaigns, the cost of manual data gathering._

## Why is this relevant to SECO?

_TODO — connect to SECO Luxembourg's core business: IDI insurance technical control,
periodic building inspections, aging building stock._

## Data sources

| Source | Provider | What it contributes | License |
|--------|----------|---------------------|---------|
| INSPIRE Building Footprints | ACT / geoportail.lu | Commune geometry for choropleth | CC0 |
| 2021 Census — Housing | STATEC | Construction era distribution per commune | CC0 |
| Building Permits Time Series | STATEC | Renovation activity proxy per canton | CC0 |

_TODO — how the three sources are joined._

## Technical decisions and trade-offs

_TODO — see CLAUDE.md for the decisions to document._

## What would you put in production tomorrow vs. what would you throw away?

_TODO_

## If you had 3 more months, what would the product look like?

_TODO_

## Running locally

```bash
# 1. Clone and install
git clone https://github.com/sai-sundar/building-intelligence-lu
cd building-intelligence-lu

# 2. Set up environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# 3. Run the data pipeline (optional — data already committed)
cd pipeline
pip install -r requirements.txt
python 01_fetch_buildings.py
python 02_fetch_census.py
python 03_fetch_permits.py
python 04_compute_risk_scores.py
python 05_export_geojson.py

# 4. Start the frontend
cd ../frontend
npm install
npm run dev
```

## Deployment

Deployed on Vercel: _TODO — live URL_

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet, Recharts, React Query
- **Backend:** Vercel Serverless Functions (Node.js)
- **AI:** Google Gemini 1.5 Flash
- **Data:** STATEC (CC0), ACT / Geoportail.lu (CC0)
- **Pipeline:** Python, pandas, geopandas
