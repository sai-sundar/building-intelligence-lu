import { useMemo, useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import CommunePanel from "./components/CommunePanel";
import { communes } from "./data";

const INITIAL_FILTERS = { canton: "all", riskLevel: "all", smallStockOnly: false };

function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedCode, setSelectedCode] = useState(null);

  const selectedCommune = useMemo(
    () => communes.features.find((f) => f.properties.code === selectedCode)?.properties ?? null,
    [selectedCode],
  );

  return (
    <div className="flex h-screen flex-col bg-bg text-text-primary">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Building Intelligence — Luxembourg</h1>
          <p className="text-xs text-text-secondary">Commune building-stock risk for SECO inspection prioritisation</p>
        </div>
        <span className="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary">SECO</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar filters={filters} onChange={setFilters} />
        <main className="relative min-w-0 flex-1">
          <Map filters={filters} selectedCode={selectedCode} onSelect={setSelectedCode} />
        </main>
        <CommunePanel commune={selectedCommune} onClose={() => setSelectedCode(null)} />
      </div>
    </div>
  );
}

export default App;
