"use client";

import { useMemo, useState } from "react";
import { AuditFlowCanvas } from "@/components/workflow/AuditFlowCanvas";
import { exportRunCsv } from "@/lib/csvExport";
import { getProcessOrderForRun } from "@/lib/auditFlow";
import { getRunSummary } from "@/lib/runSummary";
import { applyRunSnapshotToProcesses } from "@/lib/standards";
import {
  getWorkflowVersion,
  paymentTypeLabelsEs,
  priorityRouteLabelsEs,
  processStatusLabelsEs,
  qualityLabelsEs,
  solutionRouteLabelsEs,
  workflowLabels,
} from "@/lib/uiLabels";
import type { AuditRun, AuditRunStatus } from "@/types/audit";

type HistoryTab = "resumen" | "diagrama" | "observaciones";

type HistoryModalProps = {
  isOpen: boolean;
  runs: AuditRun[];
  onClose: () => void;
  onContinueRun: (runId: string) => void;
  onCancelRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
};

export function HistoryModal({
  isOpen,
  runs,
  onClose,
  onContinueRun,
  onCancelRun,
  onDeleteRun,
}: HistoryModalProps) {
  const [status, setStatus] = useState<AuditRunStatus | "all">("all");
  const [chain, setChain] = useState("all");
  const [store, setStore] = useState("");
  const [operator, setOperator] = useState("");
  const [date, setDate] = useState("");
  const [detailRun, setDetailRun] = useState<AuditRun | null>(null);
  const [openActionsRunId, setOpenActionsRunId] = useState<string | null>(null);

  const filteredRuns = useMemo(
    () =>
      runs
        .filter((run) => status === "all" || run.status === status)
        .filter((run) => chain === "all" || run.chain === chain)
        .filter((run) => run.store.toLowerCase().includes(store.toLowerCase()))
        .filter((run) =>
          run.operatorName.toLowerCase().includes(operator.toLowerCase()),
        )
        .filter((run) => !date || run.date === date)
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
    [chain, date, operator, runs, status, store],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="run-modal history-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p>Registro local</p>
            <h2>Historial de corridas</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="history-filters">
          <select value={status} onChange={(event) => setStatus(event.target.value as AuditRunStatus | "all")}>
            <option value="all">Todos los estados</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select value={chain} onChange={(event) => setChain(event.target.value)}>
            <option value="all">Todas las cadenas</option>
            <option value="Liverpool">Liverpool</option>
            <option value="Palacio de Hierro">Palacio de Hierro</option>
          </select>
          <input placeholder="Tienda" value={store} onChange={(event) => setStore(event.target.value)} />
          <input placeholder="Operador" value={operator} onChange={(event) => setOperator(event.target.value)} />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div className="history-list">
          {filteredRuns.map((run) => {
            const summary = getRunSummary(run);

            return (
              <article className="history-row" key={run.id}>
                <div>
                  <strong>{run.id}</strong>
                  <span>{run.date} · {run.store} · {run.module}</span>
                  <span>{run.operatorName} / {run.auditorName}</span>
                  {getWorkflowVersion(run) === workflowLabels.legacyVersion ? (
                    <span className="legacy-flow-badge">
                      {workflowLabels.legacyBadge}
                    </span>
                  ) : null}
                </div>
                <div className="history-metrics">
                  <span>{statusLabel(run.status)}</span>
                  <span>{summary.averageScore}</span>
                  <span>{summary.standardMinutes} / {summary.actualMinutes} min</span>
                  <span>{summary.deviationPercent}%</span>
                  <span>{summary.criticalCount} críticos</span>
                </div>
                <div className="history-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setDetailRun(run);
                      setOpenActionsRunId(null);
                    }}
                  >
                    Ver detalle
                  </button>
                  <div className="history-action-menu">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Más acciones para ${run.id}`}
                      aria-expanded={openActionsRunId === run.id}
                      onClick={() =>
                        setOpenActionsRunId(
                          openActionsRunId === run.id ? null : run.id,
                        )
                      }
                    >
                      ⋯
                    </button>
                    {openActionsRunId === run.id ? (
                      <div className="history-menu-popover">
                        {run.status === "in_progress" ? (
                          <button
                            type="button"
                            onClick={() => {
                              onContinueRun(run.id);
                              setOpenActionsRunId(null);
                            }}
                          >
                            Continuar auditoría
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            exportRunCsv(run);
                            setOpenActionsRunId(null);
                          }}
                        >
                          Exportar CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`/corridas/${run.id}/informe`, "_blank");
                            setOpenActionsRunId(null);
                          }}
                        >
                          Exportar informe PDF
                        </button>
                        {run.status === "in_progress" ? (
                          <button
                            type="button"
                            className="danger-menu-item"
                            onClick={() => {
                              onCancelRun(run.id);
                              setOpenActionsRunId(null);
                            }}
                          >
                            Cancelar corrida
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="danger-menu-item"
                          onClick={() => {
                            onDeleteRun(run.id);
                            if (detailRun?.id === run.id) {
                              setDetailRun(null);
                            }
                            setOpenActionsRunId(null);
                          }}
                        >
                          Eliminar auditoría
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {detailRun ? <RunDetail run={detailRun} onClose={() => setDetailRun(null)} /> : null}
      </section>
    </div>
  );
}

function RunDetail({ run, onClose }: { run: AuditRun; onClose: () => void }) {
  const summary = getRunSummary(run);
  const [activeTab, setActiveTab] = useState<HistoryTab>("resumen");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const processes = useMemo(() => applyRunSnapshotToProcesses(run), [run]);
  const paymentObservation = summary.paymentObservation;
  const criticalObservations = run.observations.filter(
    (observation) => observation.status === "critical",
  );

  return (
    <div className="detail-overlay">
      <section className="panel-section detail-modal">
        <div className="modal-heading">
          <div>
            <p>Resumen final</p>
            <h2>{run.id}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Volver al historial
          </button>
        </div>
        <div className="detail-tabs" role="tablist" aria-label="Detalle histórico">
          {[
            ["resumen", "Resumen"],
            ["diagrama", "Diagrama"],
            ["observaciones", "Observaciones"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeTab === value ? "is-active" : ""}
              onClick={() => setActiveTab(value as HistoryTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "resumen" ? (
          <div className="detail-list">
            <Detail
              label="Versión de flujo"
              value={
                getWorkflowVersion(run) === workflowLabels.legacyVersion
                  ? workflowLabels.legacyBadge
                  : getWorkflowVersion(run)
              }
            />
            <Detail label="Estado" value={statusLabel(run.status)} />
            <Detail
              label="Ruta de atención"
              value={
                run.selectedPriorityRoute
                  ? priorityRouteLabelsEs[run.selectedPriorityRoute]
                  : "Sin definir"
              }
            />
            <Detail
              label="Disponibilidad de solución"
              value={
                run.selectedSolutionRoute
                  ? solutionRouteLabelsEs[run.selectedSolutionRoute]
                  : "Sin definir"
              }
            />
            <Detail label="Tiempo estándar" value={`${summary.standardMinutes} min`} />
            <Detail label="Tiempo real" value={`${summary.actualMinutes} min`} />
            <Detail label="Diferencia" value={`${summary.differenceMinutes} min`} />
            <Detail label="Desviación" value={`${summary.deviationPercent}%`} />
            <Detail label="Calificación" value={`${summary.averageScore}`} />
            <Detail
              label="Tipo de cobro"
              value={
                paymentObservation?.paymentType
                  ? paymentTypeLabelsEs[paymentObservation.paymentType]
                  : "Sin capturar"
              }
            />
            <Detail label="Monto" value={formatCurrency(paymentObservation?.paymentAmount)} />
            <Detail
              label="Comentarios generales"
              value={run.generalComments || "Sin comentarios"}
            />
            <Detail label="Procesos críticos" value={`${criticalObservations.length}`} />
            <Detail label="Conclusión" value={summary.conclusion} />
          </div>
        ) : null}

        {activeTab === "diagrama" ? (
          <div className="history-diagram-layout">
            <div className="history-flow-frame">
              <AuditFlowCanvas
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                activeFilter="all"
                activeRun={run}
                processes={processes}
              />
            </div>
            <ObservationPanel run={run} selectedNodeId={selectedNodeId} />
          </div>
        ) : null}

        {activeTab === "observaciones" ? (
          <div className="observation-list">
            <section className="panel-section">
              <h3>Comentarios generales de la auditoría</h3>
              <p className="panel-copy preserve-lines">
                {run.generalComments || "Sin comentarios generales."}
              </p>
            </section>
            {getProcessOrderForRun(run).map((processId) => {
              const process = processes.find((item) => item.id === processId);
              const observation = run.observations.find(
                (item) => item.processId === processId,
              );

              if (!process || !observation) {
                return null;
              }

              return (
                <article className="observation-card" key={processId}>
                  <strong>{process.name}</strong>
                  <span>
                    {observation.isApplicable
                      ? processStatusLabelsEs[observation.status]
                      : "No aplicable"}
                  </span>
                  <p className="preserve-lines">
                    {observation.notes ||
                      observation.nonApplicableReason ||
                      "Sin observaciones."}
                  </p>
                  {observation.qualityResult ? (
                    <small>{qualityLabelsEs[observation.qualityResult]}</small>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ObservationPanel({
  run,
  selectedNodeId,
}: {
  run: AuditRun;
  selectedNodeId: string | null;
}) {
  const observation = selectedNodeId
    ? run.observations.find((item) => item.processId === selectedNodeId)
    : undefined;

  return (
    <aside className="history-observation-panel">
      <h3>Observación del nodo</h3>
      {observation ? (
        <>
          <Detail label="Aplicable" value={observation.isApplicable ? "Sí" : "No"} />
          <Detail
            label="Tiempo real"
            value={
              observation.actualTime === null ? "N/A" : `${observation.actualTime} min`
            }
          />
          <Detail label="Estado" value={processStatusLabelsEs[observation.status]} />
          <p className="panel-copy preserve-lines">
            {observation.notes ||
              observation.nonApplicableReason ||
              "Sin observaciones."}
          </p>
        </>
      ) : (
        <p className="panel-copy">Selecciona un nodo del diagrama.</p>
      )}
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Sin monto";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function statusLabel(status: AuditRunStatus) {
  if (status === "completed") {
    return "Completada";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  if (status === "in_progress") {
    return "En progreso";
  }

  return "Borrador";
}
