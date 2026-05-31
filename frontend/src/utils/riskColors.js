// Choropleth colour scale for the commune risk index (0–100).
// Green (low) -> amber (medium) -> red (high), matching the SECO palette.

export const RISK_LOW = "#22c55e";
export const RISK_MEDIUM = "#f59e0b";
export const RISK_HIGH = "#ef4444";

// Tier thresholds — must match the pipeline (04_compute_risk_scores.py).
export const MEDIUM_THRESHOLD = 40;
export const HIGH_THRESHOLD = 70;

// Five-stop scale gives the map smoother gradation than three hard tiers.
const SCALE = [
  { stop: 0, color: "#16a34a" },
  { stop: 25, color: "#22c55e" },
  { stop: 50, color: "#f59e0b" },
  { stop: 75, color: "#f97316" },
  { stop: 100, color: "#ef4444" },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

export function riskColor(score) {
  if (score == null || Number.isNaN(score)) return "#475569";
  const clamped = Math.max(0, Math.min(100, score));
  for (let i = 1; i < SCALE.length; i += 1) {
    if (clamped <= SCALE[i].stop) {
      const lo = SCALE[i - 1];
      const hi = SCALE[i];
      const t = (clamped - lo.stop) / (hi.stop - lo.stop);
      const [r1, g1, b1] = hexToRgb(lo.color);
      const [r2, g2, b2] = hexToRgb(hi.color);
      return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`;
    }
  }
  return SCALE[SCALE.length - 1].color;
}

export function riskLevelColor(level) {
  return { low: RISK_LOW, medium: RISK_MEDIUM, high: RISK_HIGH }[level] ?? "#475569";
}
