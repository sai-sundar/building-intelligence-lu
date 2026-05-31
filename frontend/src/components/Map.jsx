import { useEffect, useRef } from "react";
import { MapContainer, GeoJSON, TileLayer, useMap } from "react-leaflet";
import { communes } from "../data";
import { riskColor } from "../utils/riskColors";

const LUX_CENTER = [49.78, 6.09];
const DEFAULT_ZOOM = 9;

// Carto dark basemap keeps the choropleth readable on the dark theme.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Leaflet measures its container on init; inside a flex layout the final width
// arrives a tick later, so we invalidate the size once mounted and on resize.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    map.invalidateSize();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function isDimmed(props, filters) {
  if (filters.canton !== "all" && props.canton !== filters.canton) return true;
  if (filters.riskLevel !== "all" && props.risk_level !== filters.riskLevel) return true;
  if (filters.smallStockOnly && props.small_building_share < 0.6) return true;
  return false;
}

function Map({ filters, selectedCode, onSelect }) {
  const geoJsonRef = useRef(null);

  const styleFeature = (feature) => {
    const props = feature.properties;
    const dimmed = isDimmed(props, filters);
    const selected = props.code === selectedCode;
    return {
      fillColor: riskColor(props.risk_score),
      fillOpacity: dimmed ? 0.08 : 0.78,
      color: selected ? "#f1f5f9" : "#0f1117",
      weight: selected ? 2.5 : 0.6,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindTooltip(
      `<strong>${p.name}</strong><br/>Risk ${p.risk_score} · ${p.canton}`,
      { sticky: true, direction: "top", className: "commune-tooltip" },
    );
    layer.on({
      click: () => onSelect(p.code),
      mouseover: (e) => e.target.setStyle({ weight: 2, color: "#94a3b8" }),
      mouseout: (e) => geoJsonRef.current?.resetStyle(e.target),
    });
  };

  return (
    <MapContainer
      center={LUX_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full bg-bg"
      zoomControl={false}
      attributionControl
    >
      <MapResizer />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <GeoJSON
        ref={geoJsonRef}
        data={communes}
        style={styleFeature}
        onEachFeature={onEachFeature}
        // key forces re-style when filters or selection change
        key={`${filters.canton}-${filters.riskLevel}-${filters.smallStockOnly}-${selectedCode}`}
      />
    </MapContainer>
  );
}

export default Map;
