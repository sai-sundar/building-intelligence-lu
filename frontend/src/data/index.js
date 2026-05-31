// Loads the pipeline-generated static data. The GeoJSON is imported as a raw
// string (Vite only auto-parses .json) and parsed once at module load.
import communesRaw from "./communes.geojson?raw";
import stats from "./stats.json";

export const communes = JSON.parse(communesRaw);
export { stats };

// Sorted, de-duplicated canton list for the sidebar filter.
export const cantons = [
  ...new Set(communes.features.map((f) => f.properties.canton)),
].sort();
