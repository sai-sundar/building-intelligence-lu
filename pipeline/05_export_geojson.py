"""Step 05 — assemble the committed frontend data.

Combines commune geometry (step 01) with the computed risk metrics (step 04)
into a single GeoJSON, and builds an aggregate stats file with the national
construction-era distribution, per-canton permit series, and risk summary.

Outputs (committed, consumed by the frontend / API):
  frontend/src/data/communes.geojson
  frontend/src/data/stats.json
"""

import json
from datetime import datetime, timezone

import pandas as pd

import config

# Per-commune property rounding for a compact, readable GeoJSON.
RATE_DECIMALS = 4

SOURCES = [
    {"name": "Commune boundaries", "provider": "ACT / geoportail.lu", "license": "CC0"},
    {"name": "2021 Census — Housing (DF_B1706/B1707)", "provider": "STATEC", "license": "CC0"},
    {"name": "Building permits (DF_D4123)", "provider": "STATEC", "license": "CC0"},
]


def _metrics_by_key() -> dict:
    df = pd.read_csv(config.RAW_DIR / "commune_metrics.csv")
    df["join_key"] = df["name"].map(config.normalize_name)
    return {row["join_key"]: row for _, row in df.iterrows()}


def build_geojson(metrics: dict) -> dict:
    geo = json.loads(config.BOUNDARIES_RAW.read_text(encoding="utf-8"))
    out_features = []
    for f in geo["features"]:
        key = config.normalize_name(f["properties"]["COMMUNE"])
        m = metrics.get(key)
        if m is None:
            continue  # no metrics computed for this commune
        f["properties"] = {
            "code": m["code"],
            "name": m["name"],
            "canton": m["canton"],
            "total_units": int(m["total_units"]),
            "occupied": int(m["occupied"]),
            "unoccupied": int(m["unoccupied"]),
            "vacancy_rate": round(float(m["vacancy_rate"]), RATE_DECIMALS),
            "small_building_share": round(float(m["small_building_share"]), RATE_DECIMALS),
            "dw_res1": int(m["dw_res1"]),
            "dw_res2": int(m["dw_res2"]),
            "dw_multi": int(m["dw_multi"]),
            "permit_trend": m["permit_trend"],
            "permit_trend_ratio": round(float(m["permit_trend_ratio"]), RATE_DECIMALS),
            "risk_score": int(m["risk_score"]),
            "risk_level": m["risk_level"],
        }
        out_features.append(f)
    return {"type": "FeatureCollection", "features": out_features}


def build_national_era() -> list:
    era = pd.read_csv(config.CENSUS_ERA_RAW)
    total = era["units"].sum()
    return [
        {
            "code": r["era_code"],
            "label": r["era_label"],
            "units": int(r["units"]),
            "pct": round(100 * r["units"] / total, 1),
        }
        for _, r in era.iterrows()
    ]


def build_permits_by_canton() -> dict:
    df = pd.read_csv(config.PERMITS_RAW)
    df["canton"] = df["canton_name"].replace(config.PERMIT_CANTON_TO_BOUNDARY)
    yearly = df.groupby(["canton", "year"], as_index=False)["permits"].sum()
    return {
        canton: [
            {"year": int(r["year"]), "permits": int(r["permits"])}
            for _, r in g.sort_values("year").iterrows()
        ]
        for canton, g in yearly.groupby("canton")
    }


def main() -> int:
    config.DATA_OUT_DIR.mkdir(parents=True, exist_ok=True)
    metrics = _metrics_by_key()

    geojson = build_geojson(metrics)
    config.COMMUNES_GEOJSON_OUT.write_text(json.dumps(geojson), encoding="utf-8")
    print(f"Wrote {len(geojson['features'])} features -> {config.COMMUNES_GEOJSON_OUT}")

    scores = [f["properties"]["risk_score"] for f in geojson["features"]]
    levels = [f["properties"]["risk_level"] for f in geojson["features"]]
    stats = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commune_count": len(geojson["features"]),
        "risk_distribution": {lvl: levels.count(lvl) for lvl in ("low", "medium", "high")},
        "score": {
            "min": min(scores),
            "max": max(scores),
            "mean": round(sum(scores) / len(scores), 1),
        },
        "national_era": build_national_era(),
        "permits_by_canton": build_permits_by_canton(),
        "risk_weights": config.RISK_WEIGHTS,
        "sources": SOURCES,
    }
    config.STATS_JSON_OUT.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(f"Wrote stats -> {config.STATS_JSON_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
