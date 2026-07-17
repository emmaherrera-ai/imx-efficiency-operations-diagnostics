"use client";

import { getAuditVisualSteps } from "@/lib/auditVisual";
import type { AuditRun, ProcessDefinition } from "@/types/audit";

type AuditTimelineProps = {
  run: AuditRun;
  processes: ProcessDefinition[];
  currentNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

const statusSymbol = {
  completed: "✓",
  current: "●",
  pending: "○",
  not_applicable: "N/A",
} as const;

export function AuditTimeline({
  run,
  processes,
  currentNodeId,
  onSelectNode,
}: AuditTimelineProps) {
  const steps = getAuditVisualSteps({ run, processes, currentNodeId });

  return (
    <section className="panel-section audit-timeline" aria-label="Timeline de progreso">
      <h3>Recorrido de auditoría</h3>
      <div className="timeline-track">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`timeline-step is-${step.status}`}
            onClick={() => onSelectNode(step.id)}
            aria-current={step.status === "current" ? "step" : undefined}
          >
            <span>{statusSymbol[step.status]}</span>
            <strong>{step.shortLabel}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
