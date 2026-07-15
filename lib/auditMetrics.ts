import { processDefinitions } from "@/data/processes";
import type { ProcessDefinition, ProcessStatus, StatusSummary } from "@/types/audit";

export const statusLabels: Record<ProcessStatus, string> = {
  optimal: "Óptimo",
  improvable: "Mejorable",
  critical: "Crítico",
  neutral: "Neutral",
};

export const statusOrder: ProcessStatus[] = [
  "optimal",
  "improvable",
  "critical",
  "neutral",
];

export function getTotalStandardMinutes(processes: ProcessDefinition[]): number {
  return processes.reduce((total, process) => total + process.standardMinutes, 0);
}

export function getReferenceStandardMinutes(processes: ProcessDefinition[]): number {
  const processMap = new Map(processes.map((process) => [process.id, process]));
  const baseProcessIds = [
    "recepcion",
    "clasificacion",
    "investigacion",
    "validacion",
    "cobro",
    "documentacion",
    "confirmacion",
  ];
  const noSolutionMinutes =
    getSequenceMinutes(processMap, [
      ...baseProcessIds.slice(0, 3),
      "solucion-no-disponible",
      ...baseProcessIds.slice(3),
    ]) || Number.POSITIVE_INFINITY;
  const standardMinutes =
    getSequenceMinutes(processMap, [
      ...baseProcessIds.slice(0, 3),
      "atencion-estandar",
      ...baseProcessIds.slice(3),
    ]) || Number.POSITIVE_INFINITY;
  const specializedMinutes =
    getSequenceMinutes(processMap, [
      ...baseProcessIds.slice(0, 3),
      "atencion-especializada",
      ...baseProcessIds.slice(3),
    ]) || Number.POSITIVE_INFINITY;
  const reference = Math.min(noSolutionMinutes, standardMinutes, specializedMinutes);

  return Number.isFinite(reference) ? reference : getTotalStandardMinutes(processes);
}

function getSequenceMinutes(
  processMap: Map<string, ProcessDefinition>,
  processIds: string[],
): number {
  return processIds.reduce(
    (total, processId) => total + (processMap.get(processId)?.standardMinutes ?? 0),
    0,
  );
}

export function getAverageExperience(processes: ProcessDefinition[]): number {
  if (processes.length === 0) {
    return 0;
  }

  const total = processes.reduce(
    (sum, process) => sum + process.targetExperience,
    0,
  );

  return Math.round(total / processes.length);
}

export function getStatusSummary(
  processes: ProcessDefinition[] = processDefinitions,
): StatusSummary[] {
  return statusOrder.map((status) => ({
    status,
    label: statusLabels[status],
    count: processes.filter((process) => process.status === status).length,
  }));
}

export function getCriticalCount(processes: ProcessDefinition[]): number {
  return processes.filter((process) => process.status === "critical").length;
}

export function getExperienceRanking(
  processes: ProcessDefinition[],
): ProcessDefinition[] {
  return [...processes].sort(
    (left, right) => right.targetExperience - left.targetExperience,
  );
}
