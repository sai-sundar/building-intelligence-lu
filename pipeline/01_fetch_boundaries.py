"""Step 01 — fetch Luxembourg commune boundaries.

Downloads the official commune polygon GeoJSON (WGS84 / EPSG:4326) from
data.public.lu and saves it to pipeline/raw/. This is the map base layer; risk
metrics are joined onto it in step 04. Properties of interest per feature:
COMMUNE (name), CANTON, DISTRICT, LAU2 (4-digit code).

Output: pipeline/raw/communes.geojson
"""

import json
import sys

import requests

import config


def fetch_boundaries() -> dict:
    resp = requests.get(config.BOUNDARIES_URL, timeout=config.REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def main() -> int:
    print(f"Fetching commune boundaries from {config.BOUNDARIES_URL}")
    geojson = fetch_boundaries()

    features = geojson.get("features", [])
    if not features:
        print("ERROR: boundary GeoJSON has no features", file=sys.stderr)
        return 1

    missing_name = [f for f in features if not f["properties"].get("COMMUNE")]
    if missing_name:
        print(f"ERROR: {len(missing_name)} features missing COMMUNE name", file=sys.stderr)
        return 1

    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    config.BOUNDARIES_RAW.write_text(json.dumps(geojson), encoding="utf-8")
    print(f"Wrote {len(features)} commune polygons -> {config.BOUNDARIES_RAW}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
