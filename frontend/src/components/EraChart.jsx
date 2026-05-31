import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { stats } from "../data";

// Older brackets shaded warmer to echo the risk scale.
const ERA_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
];

const SHORT_LABELS = {
  "Before 1919": "<1919",
  "1919–1945": "19–45",
  "1946–1960": "46–60",
  "1961–1980": "61–80",
  "1981–2000": "81–00",
  "2001–2010": "01–10",
  "2011–2015": "11–15",
  "2016 and later": "16+",
};

function EraTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary">
      <div>{d.label}</div>
      <div className="text-text-secondary">{d.pct}% · {d.units.toLocaleString("en-GB")} dwellings</div>
    </div>
  );
}

function EraChart() {
  const data = stats.national_era.map((e) => ({ ...e, short: SHORT_LABELS[e.label] ?? e.label }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="short" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<EraTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={ERA_COLORS[i] ?? "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-text-secondary">
        National construction-era distribution (not available per commune).
      </p>
    </div>
  );
}

export default EraChart;
