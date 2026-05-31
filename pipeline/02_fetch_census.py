"""Step 02 — fetch 2021 census housing data from STATEC (lustat SDMX).

Two SDMX dataflows, fetched as SDMX-CSV with labels:

  * DF_B1707 — dwellings by building type & occupancy, per commune. This is the
    finest geographic grain available (102 communes). We extract, per commune:
    total / occupied / unoccupied dwellings (-> vacancy rate) and the dwelling
    count by building-type class RES1 / RES2 / RES_GE3 (-> small-building share).

  * DF_B1706 — dwellings by construction period. Published at NATIONAL grain only
    (its GEO dimension is empty), so it cannot drive a per-commune score. We keep
    it for the national construction-era context chart in the UI.

Outputs:
  pipeline/raw/census_commune.csv
  pipeline/raw/census_era_national.csv
"""

import io
import sys

import pandas as pd
import requests

import config

COMMUNE_CODE_LEN = 9  # len-9 GEO codes are communes; 7 = canton, 2 = national


def _fetch_sdmx_csv(flow: str) -> pd.DataFrame:
    url = f"{config.SDMX_BASE}/{flow}/all?{config.SDMX_CSV_PARAMS}"
    print(f"  GET {url}")
    resp = requests.get(url, timeout=config.REQUEST_TIMEOUT)
    resp.raise_for_status()
    return pd.read_csv(io.StringIO(resp.text), low_memory=False)


def _value(df: pd.DataFrame, **dims) -> float:
    """Sum OBS_VALUE for the unique slice matching the given dimension codes."""
    mask = pd.Series(True, index=df.index)
    for col, code in dims.items():
        mask &= df[col] == code
    return float(df.loc[mask, "OBS_VALUE"].sum())


def build_commune_table(df: pd.DataFrame) -> pd.DataFrame:
    communes = df[df["GEO"].str.len() == COMMUNE_CODE_LEN]
    codes = communes[["GEO", "Geographic level"]].drop_duplicates()

    rows = []
    for code, name in codes.itertuples(index=False):
        g = df[df["GEO"] == code]
        rows.append(
            {
                "geo_code": code,
                "name": name,
                "total_units": _value(g, TYPE_BUILD_DWE=config.OCC_TOTAL, OCC_STATUS_CONV=config.OCC_TOTAL),
                "occupied": _value(g, TYPE_BUILD_DWE=config.OCC_TOTAL, OCC_STATUS_CONV=config.OCC_OCCUPIED),
                "unoccupied": _value(g, TYPE_BUILD_DWE=config.OCC_TOTAL, OCC_STATUS_CONV=config.OCC_UNOCCUPIED),
                "dw_res1": _value(g, TYPE_BUILD_DWE=config.BUILD_TYPE_ONE_DWELLING, OCC_STATUS_CONV=config.OCC_TOTAL),
                "dw_res2": _value(g, TYPE_BUILD_DWE=config.BUILD_TYPE_TWO_DWELLING, OCC_STATUS_CONV=config.OCC_TOTAL),
                "dw_multi": _value(g, TYPE_BUILD_DWE=config.BUILD_TYPE_MULTI_DWELLING, OCC_STATUS_CONV=config.OCC_TOTAL),
            }
        )
    return pd.DataFrame(rows)


def build_era_table(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for code, label in config.ERA_CODES:
        units = _value(
            df,
            TYPE_BUILD_DWE=config.OCC_TOTAL,
            OCC_STATUS_CONV=config.OCC_TOTAL,
            CONSTR_PERIOD_DWE=code,
        )
        rows.append({"era_code": code, "era_label": label, "units": units})
    return pd.DataFrame(rows)


def main() -> int:
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching commune housing table (DF_B1707)")
    commune = build_commune_table(_fetch_sdmx_csv(config.CENSUS_COMMUNE_FLOW))
    if len(commune) < 90:
        print(f"ERROR: expected ~100 communes, got {len(commune)}", file=sys.stderr)
        return 1
    if (commune["total_units"] <= 0).any():
        bad = commune.loc[commune["total_units"] <= 0, "name"].tolist()
        print(f"ERROR: communes with zero total_units: {bad}", file=sys.stderr)
        return 1
    commune.to_csv(config.CENSUS_COMMUNE_RAW, index=False)
    print(f"Wrote {len(commune)} communes -> {config.CENSUS_COMMUNE_RAW}")

    print("Fetching national construction-era table (DF_B1706)")
    era = build_era_table(_fetch_sdmx_csv(config.CENSUS_ERA_FLOW))
    if era["units"].sum() <= 0:
        print("ERROR: national era table is empty", file=sys.stderr)
        return 1
    era.to_csv(config.CENSUS_ERA_RAW, index=False)
    print(f"Wrote {len(era)} era brackets (national) -> {config.CENSUS_ERA_RAW}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
