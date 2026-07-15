import { getApplicableProcessIds, roundMetric } from "./auditCalculations";
import { applyRunSnapshotToProcesses } from "./standards";
import type { AuditRun } from "@/types/audit";

export function getRunSummary(run: AuditRun) {
  const applicableIds = getApplicableProcessIds(run);
  const observations = run.observations.filter(
    (observation) =>
      observation.isApplicable &&
      observation.finalScore !== null &&
      applicableIds.includes(observation.processId),
  );
  const processes = applyRunSnapshotToProcesses(run);
  const standardMinutes = processes
    .filter((process) => applicableIds.includes(process.id))
    .reduce((total, process) => total + process.standardMinutes, 0);
  const actualMinutes = observations.reduce(
    (total, observation) => total + (observation.actualTime ?? 0),
    0,
  );
  const averageScore =
    observations.length === 0
      ? 0
      : roundMetric(
          observations.reduce(
            (total, observation) => total + (observation.finalScore ?? 0),
            0,
          ) / observations.length,
        );
  const criticalCount = observations.filter(
    (observation) => observation.status === "critical",
  ).length;

  return {
    applicableCount: applicableIds.length,
    capturedCount: observations.length,
    standardMinutes: roundMetric(standardMinutes),
    actualMinutes: roundMetric(actualMinutes),
    differenceMinutes: roundMetric(actualMinutes - standardMinutes),
    deviationPercent:
      standardMinutes === 0
        ? 0
        : roundMetric(((actualMinutes - standardMinutes) / standardMinutes) * 100),
    averageScore,
    optimalCount: observations.filter((observation) => observation.status === "optimal").length,
    improvableCount: observations.filter((observation) => observation.status === "improvable").length,
    criticalCount,
    conclusion: getConclusion(averageScore, criticalCount),
    paymentObservation: run.observations.find(
      (observation) => observation.processId === "cobro",
    ),
  };
}

export function getConclusion(averageScore: number, criticalCount: number): string {
  if (averageScore >= 85 && criticalCount === 0) {
    return "Operación controlada";
  }

  if (averageScore >= 70 && criticalCount < 2) {
    return "Operación con oportunidades de mejora";
  }

  return "Intervención operativa requerida";
}
