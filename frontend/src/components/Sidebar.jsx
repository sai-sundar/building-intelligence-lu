import { cantons, stats } from "../data";
import { RISK_HIGH, RISK_LOW, RISK_MEDIUM } from "../utils/riskColors";

const RISK_OPTIONS = [
  { value: "all", label: "All", color: "#94a3b8" },
  { value: "low", label: "Low (<40)", color: RISK_LOW },
  { value: "medium", label: "Medium (40–70)", color: RISK_MEDIUM },
  { value: "high", label: "High (>70)", color: RISK_HIGH },
];

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function Sidebar({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const dist = stats.risk_distribution;

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-5 border-r border-border bg-surface p-4">
      <Field label="Canton">
        <select
          value={filters.canton}
          onChange={(e) => set({ canton: e.target.value })}
          className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="all">All cantons</option>
          {cantons.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Risk level">
        <div className="flex flex-col gap-1">
          {RISK_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set({ riskLevel: o.value })}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors ${
                filters.riskLevel === o.value
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border bg-bg text-text-secondary hover:border-accent/50"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Building stock">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={filters.smallStockOnly}
            onChange={(e) => set({ smallStockOnly: e.target.checked })}
            className="mt-0.5 accent-accent"
          />
          <span>Only communes with &gt;60% single/two-dwelling stock</span>
        </label>
      </Field>

      <div className="mt-auto space-y-1 border-t border-border pt-3 text-[11px] text-text-secondary">
        <div className="text-text-primary">{stats.commune_count} communes</div>
        <div>
          <span className="text-risk-low">{dist.low} low</span> ·{" "}
          <span className="text-risk-medium">{dist.medium} medium</span> ·{" "}
          <span className="text-risk-high">{dist.high} high</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
