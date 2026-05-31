import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { stats } from "../data";

function PermitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary">
      <div>{label}</div>
      <div className="text-text-secondary">{payload[0].value} permits</div>
    </div>
  );
}

function PermitTrend({ canton }) {
  const series = stats.permits_by_canton[canton];
  if (!series) {
    return <p className="text-xs text-text-secondary">No permit series for this canton.</p>;
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<PermitTooltip />} cursor={{ stroke: "#2a2d3a" }} />
          <Line type="monotone" dataKey="permits" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-text-secondary">
        Residential building permits, Canton {canton} (2010–2025).
      </p>
    </div>
  );
}

export default PermitTrend;
