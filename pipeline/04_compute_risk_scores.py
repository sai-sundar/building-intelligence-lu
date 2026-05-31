"""Step 04 — join the datasets and compute the commune risk score.

Inputs (from raw/): commune boundaries, commune census table, canton permits.

Per commune we derive three normalised risk signals and combine them with the
documented weights in config.RISK_WEIGHTS into a 0–100 score:

  * vacancy_rate         — unoccupied / total dwellings (neglect / aging proxy)
  * small_building_share — (1- + 2-dwelling) / all residential dwellings
                           (dispersed old village stock vs managed apartments)
  * low_permit_trend     — 1 - canton permit renewal (declining permits = risk)

Each signal is min-max normalised across communes so the score spans the full
range and ranks communes for inspection prioritisation. Census and permit data
join onto the boundary communes by normalised commune / canton name.

Output: pipeline/raw/commune_metrics.csv (one row per mapped boundary commune)
"""

import json
import sys

import pandas as pd

import config

RISK_HIGH_THRESHOLD = 70
RISK_MEDIUM_THRESHOLD = 40
TREND_RISING = 1.10   # last5/prior5 ratio above this = "rising"
TREND_DECLINING = 0.90  # below this = "declining"


def _minmax(s: pd.Series) -> pd.Series:
    span = s.max() - s.min()
    if span == 0:
        return pd.Series(0.0, index=s.index)
    return (s - s.min()) / span


def boundary_communes() -> pd.DataFrame:
    geo = json.loads(config.BOUNDARIES_RAW.read_text(encoding="utf-8"))
    rows = [
        {
            "name": f["properties"]["COMMUNE"],
            "canton": f["properties"]["CANTON"],
            "lau2": f["properties"].get("LAU2"),
            "join_key": config.normalize_name(f["properties"]["COMMUNE"]),
        }
        for f in geo["features"]
    ]
    return pd.DataFrame(rows)


COUNT_COLS = ["total_units", "occupied", "unoccupied", "dw_res1", "dw_res2", "dw_multi"]


def _apply_aliases(df: pd.DataFrame) -> pd.DataFrame:
    """Reconcile the 4 communes where boundary and census names/extents differ.

    Component census rows are summed into a single row carrying the boundary
    commune name, so ratios are derived from combined counts (not averaged).
    """
    for boundary_name, census_names in config.COMMUNE_ALIASES.items():
        component = df[df["name"].isin(census_names)]
        if len(component) != len(census_names):
            found = component["name"].tolist()
            raise ValueError(f"alias '{boundary_name}': expected {census_names}, found {found}")
        merged_row = {c: component[c].sum() for c in COUNT_COLS}
        merged_row["name"] = boundary_name
        merged_row["geo_code"] = "+".join(sorted(component["geo_code"]))
        df = df[~df["name"].isin(census_names)]
        df = pd.concat([df, pd.DataFrame([merged_row])], ignore_index=True)
    return df


def commune_signals() -> pd.DataFrame:
    df = pd.read_csv(config.CENSUS_COMMUNE_RAW)
    df = _apply_aliases(df)
    df["join_key"] = df["name"].map(config.normalize_name)
    df["vacancy_rate"] = df["unoccupied"] / df["total_units"]
    small = df["dw_res1"] + df["dw_res2"]
    residential = small + df["dw_multi"]
    df["small_building_share"] = (small / residential).where(residential > 0, 0.0)
    return df


def canton_permit_trend() -> pd.DataFrame:
    df = pd.read_csv(config.PERMITS_RAW)
    df["canton"] = df["canton_name"].replace(config.PERMIT_CANTON_TO_BOUNDARY)
    yearly = df.groupby(["canton", "year"], as_index=False)["permits"].sum()

    rows = []
    w = config.PERMIT_TREND_WINDOW_YEARS
    for canton, g in yearly.groupby("canton"):
        g = g.sort_values("year")
        recent = g["permits"].tail(w).mean()
        prior = g["permits"].tail(2 * w).head(w).mean()
        ratio = recent / prior if prior else 1.0
        label = "rising" if ratio >= TREND_RISING else "declining" if ratio <= TREND_DECLINING else "stable"
        rows.append({"canton": canton, "permit_trend_ratio": ratio, "permit_trend": label})
    return pd.DataFrame(rows)


def risk_level(score: float) -> str:
    if score >= RISK_HIGH_THRESHOLD:
        return "high"
    if score >= RISK_MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def main() -> int:
    boundary = boundary_communes()
    census = commune_signals()
    permits = canton_permit_trend()

    merged = boundary.merge(census, on="join_key", how="left", suffixes=("", "_census"))

    unmatched_boundary = merged[merged["total_units"].isna()]["name"].tolist()
    if unmatched_boundary:
        print(f"WARNING: {len(unmatched_boundary)} boundary communes without census data: {unmatched_boundary}", file=sys.stderr)
    matched_census_keys = set(merged["join_key"])
    dropped_census = census[~census["join_key"].isin(matched_census_keys)]["name"].tolist()
    if dropped_census:
        print(f"INFO: {len(dropped_census)} census communes not in 2023 boundaries (merged since 2021): {dropped_census}")

    merged = merged.dropna(subset=["total_units"]).copy()
    merged = merged.merge(permits, on="canton", how="left")
    if merged["permit_trend_ratio"].isna().any():
        missing = merged.loc[merged["permit_trend_ratio"].isna(), "canton"].unique().tolist()
        print(f"ERROR: cantons without permit data: {missing}", file=sys.stderr)
        return 1

    # Renewal score: higher permit ratio -> more renewal -> lower risk.
    renewal = _minmax(merged["permit_trend_ratio"])
    norm_vacancy = _minmax(merged["vacancy_rate"])
    norm_small = _minmax(merged["small_building_share"])
    norm_low_permit = 1 - renewal

    w = config.RISK_WEIGHTS
    composite = (
        w["vacancy_rate"] * norm_vacancy
        + w["small_building_share"] * norm_small
        + w["low_permit_trend"] * norm_low_permit
    )
    # Relative prioritisation index: stretch the composite across communes so the
    # score spans the full 0–100 range and ranks communes for inspection focus.
    merged["risk_score"] = (_minmax(composite) * 100).round().astype(int)
    merged["risk_level"] = merged["risk_score"].map(risk_level)

    cols = [
        "name", "canton", "lau2", "geo_code", "total_units", "occupied", "unoccupied",
        "vacancy_rate", "dw_res1", "dw_res2", "dw_multi", "small_building_share",
        "permit_trend_ratio", "permit_trend", "risk_score", "risk_level",
    ]
    out = merged[cols].rename(columns={"geo_code": "code"}).sort_values("risk_score", ascending=False)
    out.to_csv(config.RAW_DIR / "commune_metrics.csv", index=False)

    print(f"Computed risk for {len(out)} communes -> {config.RAW_DIR / 'commune_metrics.csv'}")
    print("Top 5 by risk:")
    print(out[["name", "canton", "risk_score", "risk_level"]].head().to_string(index=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
