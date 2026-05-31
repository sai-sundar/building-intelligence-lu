// GET /api/communes
// Returns the full commune GeoJSON with risk metrics in feature properties.
// Served straight from the committed pipeline output — no AI call, so it is
// fast and cacheable at the CDN edge.
const { loadData } = require("../lib/communeData");

module.exports = (req, res) => {
  const { geojson } = loadData();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600");
  res.status(200).send(JSON.stringify(geojson));
};
