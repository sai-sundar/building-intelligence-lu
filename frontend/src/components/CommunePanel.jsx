import { useCommune } from "../hooks/useCommune";
import { formatNumber, formatPercent, permitTrendLabel } from "../utils/formatters";
import { riskLevelColor } from "../utils/riskColors";
import EraChart from "./EraChart";
import PermitTrend from "./PermitTrend";
import RiskNarrative from "./RiskNarrative";
import StatCard from "./StatCard";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      {children}
    </section>
  );
}

function CommunePanel({ commune, onClose }) {
  const { data, isLoading, isError } = useCommune(commune?.code);

  if (!commune) {
    return (
      <aside className="flex w-80 shrink-0 items-center justify-center border-l border-border bg-surface p-6 text-center text-sm text-text-secondary">
        Select a commune on the map to see its building-stock risk profile.
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-surface p-4">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{commune.name}</h2>
          <p className="text-sm text-text-secondary">Canton {commune.canton}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-2 py-0.5 text-sm text-text-secondary hover:text-text-primary"
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <div
        className="flex items-center justify-between rounded-lg border px-3 py-2"
        style={{ borderColor: riskLevelColor(commune.risk_level) }}
      >
        <span className="text-sm text-text-secondary">Risk index</span>
        <span className="text-2xl font-bold" style={{ color: riskLevelColor(commune.risk_level) }}>
          {commune.risk_score}
          <span className="ml-1 text-sm font-normal capitalize text-text-secondary">{commune.risk_level}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Dwellings" value={formatNumber(commune.total_units)} />
        <StatCard label="Vacancy" value={formatPercent(commune.vacancy_rate, 1)} />
        <StatCard label="Single/2-dwelling" value={formatPercent(commune.small_building_share)} />
        <StatCard label="Permit trend" value={permitTrendLabel(commune.permit_trend)} />
      </div>

      <Section title="Inspector risk narrative">
        <RiskNarrative narrative={data?.narrative} isLoading={isLoading} isError={isError} />
      </Section>

      <Section title="Permit activity (canton)">
        <PermitTrend canton={commune.canton} />
      </Section>

      <Section title="Construction era (national context)">
        <EraChart />
      </Section>
    </aside>
  );
}

export default CommunePanel;
