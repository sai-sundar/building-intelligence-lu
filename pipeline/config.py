"""Shared configuration for the Building Intelligence LU data pipeline.

All source URLs, file paths, and model constants live here so the pipeline has
a single source of truth and no magic numbers scattered across scripts.
"""

import unicodedata
from pathlib import Path


def normalize_name(name: str) -> str:
    """Normalize a commune name for joining across sources.

    Lowercases, strips accents and surrounding whitespace so that e.g.
    "Pétange" (boundary file) joins to "Petange" (census labels) reliably.
    """
    stripped = unicodedata.normalize("NFKD", name.strip().lower())
    return "".join(c for c in stripped if not unicodedata.combining(c))

# --- Paths ---------------------------------------------------------------
PIPELINE_DIR = Path(__file__).resolve().parent
RAW_DIR = PIPELINE_DIR / "raw"  # intermediate downloads (git-ignored)
DATA_OUT_DIR = PIPELINE_DIR.parent / "frontend" / "src" / "data"  # committed outputs

# Intermediate artifacts written by steps 01-03 and consumed by 04.
BOUNDARIES_RAW = RAW_DIR / "communes.geojson"
CENSUS_COMMUNE_RAW = RAW_DIR / "census_commune.csv"
CENSUS_ERA_RAW = RAW_DIR / "census_era_national.csv"
PERMITS_RAW = RAW_DIR / "permits_canton.csv"

# Final committed outputs consumed by the frontend / API.
COMMUNES_GEOJSON_OUT = DATA_OUT_DIR / "communes.geojson"
STATS_JSON_OUT = DATA_OUT_DIR / "stats.json"

# --- Source URLs (all CC0, data.public.lu / STATEC lustat SDMX) ----------
BOUNDARIES_URL = (
    "https://download.data.public.lu/resources/"
    "limites-administratives-du-grand-duche-de-luxembourg/"
    "20231123-101528/communes4326.geojson"
)

# STATEC lustat SDMX REST API. SDMX-CSV with labels.
SDMX_BASE = "https://lustat.statec.lu/rest/data"
SDMX_CSV_PARAMS = "format=csvfilewithlabels"

# DF_B1707: dwellings by building type + occupancy, per canton & commune.
CENSUS_COMMUNE_FLOW = "LU1,DSD_CENSUS_NB_LOG_CLA@DF_B1707,1.0"
# DF_B1706: dwellings by construction period (NATIONAL ONLY — context chart).
CENSUS_ERA_FLOW = "LU1,DSD_CENSUS_NB_LOG_CLA@DF_B1706,1.0"

# Building permits dataset on data.public.lu (resource resolved at runtime).
PERMITS_DATASET = "entreprises-construction-et-logement-autorisations-de-batir"

# --- Census code vocabulary (SDMX dimension values) ----------------------
# Building-type codes in DF_B1707 (TYPE_BUILD_DWE dimension).
BUILD_TYPE_TOTAL_RESIDENTIAL = "RES"
BUILD_TYPE_ONE_DWELLING = "RES1"
BUILD_TYPE_TWO_DWELLING = "RES2"
BUILD_TYPE_MULTI_DWELLING = "RES_GE3"

# Occupancy codes (OCC_STATUS_CONV dimension).
OCC_TOTAL = "_T"
OCC_OCCUPIED = "DW_OC"
OCC_UNOCCUPIED = "DW_NOC"

# National construction-period codes (CONSTR_PERIOD_DWE in DF_B1706), ordered.
ERA_CODES = [
    ("Y_LT1919", "Before 1919"),
    ("Y1919-1945", "1919–1945"),
    ("Y1946-1960", "1946–1960"),
    ("Y1961-1980", "1961–1980"),
    ("Y1981-2000", "1981–2000"),
    ("Y2001-2010", "2001–2010"),
    ("Y2011-2015", "2011–2015"),
    ("Y_GE2016", "2016 and later"),
]

# --- Risk model weights (commune-level heuristic, documented in README) ---
# Construction-era-by-commune does not exist in Luxembourg open data, so the
# commune risk score is built from signals that DO exist at commune grain.
# Permit canton labels -> boundary canton names. The permits dataflow splits
# Luxembourg into city vs rest and names Esch differently; the two Luxembourg
# series are summed per year so each boundary canton has one trend.
PERMIT_CANTON_TO_BOUNDARY = {
    "Esch": "Esch-sur-Alzette",
    "Luxembourg city": "Luxembourg",
    "Luxembourg (except Luxembourg City)": "Luxembourg",
}

RISK_WEIGHTS = {
    "vacancy_rate": 0.45,        # unoccupied dwellings — neglect / aging proxy
    "small_building_share": 0.35,  # 1–2 dwelling stock vs managed apartment blocks
    "low_permit_trend": 0.20,    # canton permit decline — stock not being renewed
}

# Permit trend: compare the mean of the last N years vs the prior N years.
PERMIT_TREND_WINDOW_YEARS = 5

# Boundary commune name -> census commune name(s) to aggregate, for the four
# communes where the 2023 boundary file and 2021 census disagree. Two are pure
# name-spelling differences; two are mergers post-dating the census, where the
# component census communes are summed into the merged boundary commune.
COMMUNE_ALIASES = {
    "Redange/Attert": ["Redange-sur-Attert"],
    "Rosport-Mompach": ["Rosport - Mompach"],
    "Bous-Waldbredimus": ["Bous", "Waldbredimus"],
    "Groussbus-Wal": ["Grosbous", "Wahl"],
}

# Network
REQUEST_TIMEOUT = 90  # seconds
