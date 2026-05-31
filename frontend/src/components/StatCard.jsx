function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <div className="text-lg font-semibold text-text-primary">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>}
    </div>
  );
}

export default StatCard;
