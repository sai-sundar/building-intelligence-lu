# Data pipeline — Building Intelligence LU

Generates the static data the dashboard serves: `communes.geojson` (map +
embedded risk metrics) and `stats.json` (aggregate/context stats). Run once;
outputs are committed to `frontend/src/data/`.

## Run it

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python 01_fetch_boundaries.py      # commune polygons (GeoJSON, WGS84)
python 02_fetch_census.py          # housing by commune + national era breakdown
python 03_fetch_permits.py         # building permits per canton
python 04_compute_risk_scores.py   # join + composite risk score
python 05_export_geojson.py        # write communes.geojson + stats.json
```

Each step writes an intermediate file to `pipeline/raw/` (git-ignored). Steps
are idempotent — re-running overwrites cleanly. Steps 04–05 depend on the raw
files from 01–03.

## Data sources (all CC0)

| Step | Source | Provider | Contributes |
|------|--------|----------|-------------|
| 01 | [Limites administratives](https://data.public.lu/en/datasets/limites-administratives-du-grand-duche-de-luxembourg/) | ACT / geoportail.lu | Commune polygons (map geometry) |
| 02 | [2021 Census — Logement](https://data.public.lu/en/datasets/population-et-emploi-recensement-de-la-population-recensement-2021-logement/) (STATEC lustat SDMX) | STATEC | Dwellings by building type + occupancy per commune; national construction-era breakdown |
| 03 | [Autorisations de bâtir](https://data.public.lu/en/datasets/entreprises-construction-et-logement-autorisations-de-batir/) | STATEC | Building permits per canton (renewal proxy) |

## Two data-reality decisions worth knowing

**1. Construction era is national, not per-commune.** The only STATEC table with
a construction-period breakdown (`DF_B1706`) is published at national grain only;
its `GEO` dimension is empty. The commune-level census table (`DF_B1707`) has no
construction period. We verified no STATEC dataflow combines the two. So the
commune risk score is built from signals that *do* exist per commune (vacancy
rate, building-type mix) plus a per-canton permit trend; the construction-era
distribution is shown as a national context chart, honestly labelled.

**2. No INSPIRE building download / no geopandas.** The INSPIRE building
footprints carry only geometry + identifiers (no construction date, floors, or
use), and the census already provides dwelling/building counts per commune, so we
don't download them or do any spatial join. The pipeline is therefore pure
`requests + pandas` — no GDAL.

## Risk score

A transparent weighted heuristic (0–100), not an ML model. Weights live in
`config.py` (`RISK_WEIGHTS`) and are documented in the root README.
