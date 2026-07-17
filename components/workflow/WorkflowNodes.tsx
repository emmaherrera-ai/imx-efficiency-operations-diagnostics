"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AuditWorkflowNode, ProcessStatus } from "@/types/audit";
import { statusLabels } from "@/lib/auditMetrics";

const statusClassName: Record<ProcessStatus, string> = {
  optimal: "status-optimal",
  improvable: "status-improvable",
  critical: "status-critical",
  neutral: "status-neutral",
};

function handleId(kind: "source" | "target", position: Position) {
  return `${kind}-${position}`;
}

function NodeHandles({ data }: Pick<NodeProps<AuditWorkflowNode>, "data">) {
  const sourcePositions = [
    data.handleLayout.source,
    ...(data.handleLayout.extraSources ?? []),
  ];
  const targetPositions = [
    data.handleLayout.target,
    ...(data.handleLayout.extraTargets ?? []),
  ];

  return (
    <>
      {targetPositions.map((position) => (
        <Handle
          key={handleId("target", position)}
          id={handleId("target", position)}
          type="target"
          position={position}
          className="imx-handle"
        />
      ))}
      {sourcePositions.map((position) => (
        <Handle
          key={handleId("source", position)}
          id={handleId("source", position)}
          type="source"
          position={position}
          className="imx-handle"
        />
      ))}
    </>
  );
}

export function ProcessNode({ data, selected }: NodeProps<AuditWorkflowNode>) {
  const className = [
    "workflow-node process-node",
    statusClassName[data.status],
    selected ? "is-selected" : "",
    data.isCurrent ? "is-current" : "",
    data.recentlyCompleted ? "is-recently-completed" : "",
    data.related ? "is-related" : "",
    data.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <NodeHandles data={data} />
      <div className="node-topline">
        <span>{data.department}</span>
        <strong>{statusLabels[data.status]}</strong>
      </div>
      {data.isCurrent ? <div className="node-evaluating">Evaluando</div> : null}
      <h3>{data.label}</h3>
      <dl className="node-metrics">
        <div>
          <dt>Estándar</dt>
          <dd>{data.standardMinutes} min</dd>
        </div>
        <div>
          <dt>Experiencia</dt>
          <dd>{data.targetExperience}/10</dd>
        </div>
      </dl>
      <div className="capture-placeholder">
        <span>
          {data.actualTime !== null && data.actualTime !== undefined
            ? `${data.actualTime} min`
            : "Tiempo real"}
        </span>
        <span>
          {data.timeDifference !== null && data.timeDifference !== undefined
            ? `${data.timeDifference > 0 ? "+" : ""}${data.timeDifference} min`
            : "Desviación"}
        </span>
        <span>
          {data.captureStatus === "captured"
            ? "✓ Registrado"
            : data.captureStatus === "not_applicable"
              ? "N/A"
              : "Registrar"}
        </span>
      </div>
    </article>
  );
}

export function TerminalNode({ data, selected }: NodeProps<AuditWorkflowNode>) {
  const className = [
    "workflow-node terminal-node",
    selected ? "is-selected" : "",
    data.related ? "is-related" : "",
    data.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <NodeHandles data={data} />
      <span>{data.label}</span>
    </div>
  );
}

export function DecisionNode({ data, selected }: NodeProps<AuditWorkflowNode>) {
  const className = [
    "workflow-node decision-node",
    selected ? "is-selected" : "",
    data.related ? "is-related" : "",
    data.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <NodeHandles data={data} />
      <div className="decision-diamond">
        <span>{data.label}</span>
      </div>
    </div>
  );
}
