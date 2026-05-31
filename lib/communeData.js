// Shared loader for the precomputed commune dataset.
// Reads the committed pipeline output once per warm serverless instance and
// caches it, exposing both the raw GeoJSON and a code -> properties lookup.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "frontend", "src", "data");
const GEOJSON_PATH = path.join(DATA_DIR, "communes.geojson");
const STATS_PATH = path.join(DATA_DIR, "stats.json");

let cache = null;

function loadData() {
  if (cache) return cache;
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf-8"));
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf-8"));
  const byCode = new Map(geojson.features.map((f) => [f.properties.code, f.properties]));
  cache = { geojson, stats, byCode };
  return cache;
}

module.exports = { loadData };
