// Number / percentage formatters for the dashboard.

const NUMBER = new Intl.NumberFormat("en-GB");

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return NUMBER.format(value);
}

// Formats a 0–1 ratio as a whole-number percentage, e.g. 0.182 -> "18%".
export function formatPercent(ratio, decimals = 0) {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function permitTrendLabel(trend) {
  return { rising: "Rising", stable: "Stable", declining: "Declining" }[trend] ?? "—";
}
