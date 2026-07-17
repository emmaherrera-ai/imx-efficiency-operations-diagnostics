"use client";

import {
  getAuditVisualSteps,
  getNextStepLabel,
  getNodeDisplayName,
} from "@/lib/auditVisual";
import type { SaveState } from "@/hooks/useActiveAuditRun";
import type { AuditRun, ProcessDefinition } from "@/types/audit";

type AuditContextBarProps = {
  run: AuditRun | null;
  processes: ProcessDefinition[];
  currentNodeId: string | null;
  nextPendingTarget: string | null;
  capturedCount: number;
  progressPercent: number;
  saveState: SaveState;
};

export function AuditContextBar({
  run,
  processes,
  currentNodeId,
  nextPendingTarget,
  capturedCount,
  progressPercent,
  saveState,
}: AuditContextBarProps) {
  if (!run) {
    return null;
  }

  const currentLabel = getNodeDisplayName(currentNodeId, processes);
  const nextLabel = getNextStepLabel(nextPendingTarget, processes);
  const steps = getAuditVisualSteps({ run, processes, currentNodeId });
  const currentProcessIndex = processes.findIndex(
    (process) => process.id === currentNodeId,
  );
  const currentStepIndex = Math.max(
    0,
    currentProcessIndex >= 0
      ? currentProcessIndex
      : steps.findIndex((step) => step.id === currentNodeId),
  );
  const totalProcessCount = processes.length;

  return (
    <section className="audit-context-bar" aria-label="Contexto de auditoría activa">
      <div className="context-brand">
        <strong>COREM OPS - EOD</strong>
        <span>{run.chain}</span>
      </div>
      <div className="context-primary">
        <span>Proceso {currentStepIndex + 1} de {totalProcessCount}</span>
        <strong>{currentLabel}</strong>
      </div>
      <details className="context-details">
        <summary>Detalles</summary>
        <div>
          <span>Tienda: {run.store}</span>
          <span>Módulo: {run.module}</span>
          <span>Operador: {run.operatorName}</span>
        </div>
      </details>
      <div className="context-progress" aria-label={`Progreso ${progressPercent}%`}>
        <span>{capturedCount} de {totalProcessCount} procesos</span>
        <div>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <strong>{progressPercent}%</strong>
      </div>
      <div className={`context-save save-${saveState}`}>
        {saveState === "saving"
          ? "Guardando..."
          : saveState === "error"
            ? "Error al guardar"
            : "Guardado"}
      </div>
      <div className="context-next">
        <span>Siguiente</span>
        <strong>{nextLabel}</strong>
      </div>
    </section>
  );
}
