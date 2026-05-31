"""Step 03 — fetch building-permit time series per canton (STATEC lustat SDMX).

Dataflow DF_D4123 — "Building permits, number of buildings by type of building
and canton" — gives an annual count of authorised buildings per canton. We keep
the residential-buildings product (CPA_F41001) as a proxy for stock-renewal
activity. Geography is at canton grain (12 cantons); step 04 attributes each
canton's trend to all its communes — a documented limitation.

Output: pipeline/raw/permits_canton.csv (long format: canton, year, permits)
"""

import io
import sys

import pandas as pd
import requests

import config

PERMITS_FLOW = "LU1,DF_D4123,1.0"
PRODUCT_RESIDENTIAL = "CPA_F41001"  # Residential buildings
INDICATOR_BUILDING_COUNT = "BNUM"   # Number of buildings
CANTON_PREFIX = "Canton "            # label prefix to strip, e.g. "Canton Esch"


def fetch_permits() -> pd.DataFrame:
    url = f"{config.SDMX_BASE}/{PERMITS_FLOW}/all?{config.SDMX_CSV_PARAMS}"
    print(f"  GET {url}")
    resp = requests.get(url, timeout=config.REQUEST_TIMEOUT)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text), low_memory=False)

    df = df[
        (df["PRODUCT_BCS"] == PRODUCT_RESIDENTIAL)
        & (df["INDICATOR_BCS"] == INDICATOR_BUILDING_COUNT)
        & (df["CANTON"] != "_T")
        & (df["CANTON"] != "_Z")
    ].copy()

    df["canton_name"] = df["Canton"].str.replace(CANTON_PREFIX, "", regex=False).str.strip()
    out = df[["CANTON", "canton_name", "TIME_PERIOD", "OBS_VALUE"]].rename(
        columns={"CANTON": "canton_code", "TIME_PERIOD": "year", "OBS_VALUE": "permits"}
    )
    out["year"] = out["year"].astype(int)
    return out.sort_values(["canton_name", "year"]).reset_index(drop=True)


def main() -> int:
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    print("Fetching building permits by canton (DF_D4123)")
    permits = fetch_permits()

    n_cantons = permits["canton_name"].nunique()
    if n_cantons < 10:
        print(f"ERROR: expected ~12 cantons, got {n_cantons}", file=sys.stderr)
        return 1

    permits.to_csv(config.PERMITS_RAW, index=False)
    print(
        f"Wrote {len(permits)} rows for {n_cantons} cantons "
        f"({permits['year'].min()}–{permits['year'].max()}) -> {config.PERMITS_RAW}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
