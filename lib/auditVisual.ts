import {
  getActiveProcessSequence,
  getObservation,
  getProcessApplicability,
} from "@/lib/auditFlow";
import type { AuditRun, ProcessDefinition } from "@/types/audit";

export type AuditVisualStepStatus =
  | "completed"
  | "current"
  | "pending"
  | "not_applicable";

export type AuditVisualStep = {
  id: string;
  label: string;
  shortLabel: string;
  status: AuditVisualStepStatus;
  kind: "process" | "decision";
};

export function getAuditVisualSteps({
  run,
  processes,
  currentNodeId,
}: {
  run: AuditRun;
  processes: ProcessDefinition[];
  currentNodeId: string | null;
}): AuditVisualStep[] {
  const processMap = new Map(processes.map((process) => [process.id, process]));
  const activeSequence = getActiveProcessSequence(run);
  const steps: AuditVisualStep[] = [];

  const pushProcess = (processId: string) => {
    const process = processMap.get(processId);
    if (!process) {
      return;
    }

    const observation = getObservation(run, processId);
    const applicability = getProcessApplicability(run, processId);
    const isCompleted = Boolean(
      observation &&
        observation.isApplicable &&
        observation.finalScore !== null,
    );
    const isNotApplicable =
      observation?.isApplicable === false || applicability === "not_applicable";

    steps.push({
      id: processId,
      label: process.name,
      shortLabel: getShortProcessLabel(process.name),
      kind: "process",
      status:
        currentNodeId === processId
          ? "current"
          : isNotApplicable
            ? "not_applicable"
            : isCompleted
              ? "completed"
              : "pending",
    });
  };

  for (const processId of activeSequence) {
    pushProcess(processId);

    if (processId === "investigacion") {
      steps.push({
        id: "solucion",
        label: "¿Existe una solución disponible?",
        shortLabel: "Solución",
        kind: "decision",
        status:
          currentNodeId === "solucion"
            ? "current"
            : run.selectedSolutionRoute
              ? "completed"
              : "pending",
      });
    }

    if (
      processId === "investigacion" &&
      run.selectedSolutionRoute === "available"
    ) {
      steps.push({
        id: "prioritario",
        label: "¿Qué nivel de atención requiere?",
        shortLabel: "Nivel",
        kind: "decision",
        status:
          currentNodeId === "prioritario"
            ? "current"
            : run.selectedPriorityRoute
              ? "completed"
              : "pending",
      });
    }
  }

  return steps;
}

export function getCurrentAuditNodeId({
  selectedNodeId,
  nextPendingTarget,
  run,
}: {
  selectedNodeId: string | null;
  nextPendingTarget: string | null;
  run: AuditRun | null;
}) {
  if (!run) {
    return null;
  }

  return selectedNodeId ?? nextPendingTarget;
}

export function getNodeDisplayName(
  nodeId: string | null,
  processes: ProcessDefinition[],
) {
  if (!nodeId) {
    return "Sin pendientes";
  }

  const process = processes.find((item) => item.id === nodeId);
  if (process) {
    return process.name;
  }

  if (nodeId === "solucion") {
    return "¿Existe una solución disponible?";
  }

  if (nodeId === "prioritario") {
    return "¿Qué nivel de atención requiere?";
  }

  return "Flujo operativo";
}

export function getNextStepLabel(
  nextPendingTarget: string | null,
  processes: ProcessDefinition[],
) {
  return getNodeDisplayName(nextPendingTarget, processes);
}

function getShortProcessLabel(label: string) {
  return label
    .replace("Recepción de Solicitud", "Recepción")
    .replace("Clasificación Inicial del Caso", "Clasificación")
    .replace("Investigación y Diagnóstico", "Diagnóstico")
    .replace("Gestión de Solución No Disponible", "Sin solución")
    .replace("Atención Estándar", "Estándar")
    .replace("Atención Especializada", "Especializada")
    .replace("Validación con Cliente", "Validación")
    .replace("Cobro del Servicio", "Cobro")
    .replace("Documentación Administrativa", "Documentación")
    .replace("Confirmación Final y Encuesta de Satisfacción", "Confirmación");
}
