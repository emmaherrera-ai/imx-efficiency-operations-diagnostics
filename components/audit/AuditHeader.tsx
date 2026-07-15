import type { SaveState } from "@/hooks/useActiveAuditRun";
import type { StatusFilter } from "@/types/audit";

type AuditHeaderProps = {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onNewRun: () => void;
  onConfigureStandards: () => void;
  onOpenHistory: () => void;
  saveState: SaveState;
};

const filters: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Óptimo", value: "optimal" },
  { label: "Mejorable", value: "improvable" },
  { label: "Crítico", value: "critical" },
];

export function AuditHeader({
  activeFilter,
  onFilterChange,
  onNewRun,
  onConfigureStandards,
  onOpenHistory,
  saveState,
}: AuditHeaderProps) {
  return (
    <header className="audit-header">
      <div className="brand-lockup">
        <div className="imx-mark">EOD</div>
        <div>
          <p>AUDITORÍA CUANTITATIVA DE PROCESOS</p>
          <h1>Flujo General de Atención</h1>
        </div>
      </div>
      <nav className="status-filters" aria-label="Filtros por estado">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-button filter-${filter.value} ${
              activeFilter === filter.value ? "is-active" : ""
            }`}
            onClick={() => onFilterChange(filter.value)}
          >
            <span aria-hidden="true" />
            {filter.label}
          </button>
        ))}
        <button type="button" className="ghost-button" onClick={onOpenHistory}>
          Centro de Auditorías
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={onConfigureStandards}
        >
          Estándares Operativos
        </button>
        <button type="button" className="new-run-button" onClick={onNewRun}>
          Nueva Auditoría
        </button>
        <span className={`save-indicator save-${saveState}`}>
          {saveState === "saving"
            ? "Guardando..."
            : saveState === "error"
              ? "Sin guardado local"
              : "Guardado"}
        </span>
      </nav>
    </header>
  );
}
