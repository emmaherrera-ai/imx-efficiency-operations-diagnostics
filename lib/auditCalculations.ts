import { processDefinitions } from "@/data/processes";
import type {
  AuditObservation,
  AuditRun,
  PaymentType,
  ProcessDefinition,
  ProcessStatus,
  QualityResult,
} from "@/types/audit";
import { applyRunSnapshotToProcesses } from "./standards";
import { getWorkflowVersion } from "./uiLabels";

export const qualityLabels: Record<QualityResult, string> = {
  conforme: "Conforme",
  conforme_observaciones: "Conforme con observaciones",
  no_conforme: "No conforme",
};

export function getTimeDifference(
  actualTime: number,
  standardTime: number,
): number {
  return roundMetric(actualTime - standardTime);
}

export function getTimeDeviationPercent(
  actualTime: number,
  standardTime: number,
): number {
  return roundMetric(((actualTime - standardTime) / standardTime) * 100);
}

export function getTimeScore(
  actualTime: number,
  standardTime: number,
): number {
  const deviation = Math.abs(getTimeDeviationPercent(actualTime, standardTime));

  if (deviation <= 10) {
    return 100;
  }

  if (deviation <= 20) {
    return 85;
  }

  if (deviation <= 35) {
    return 70;
  }

  if (deviation <= 50) {
    return 50;
  }

  return 25;
}

export function getExecutionScore(executionRating: number): number {
  return executionRating * 10;
}

export function getQualityScore(qualityResult: QualityResult): number {
  if (qualityResult === "conforme") {
    return 100;
  }

  if (qualityResult === "conforme_observaciones") {
    return 75;
  }

  return 40;
}

export function getFinalScore({
  timeScore,
  executionScore,
  qualityScore,
}: {
  timeScore: number;
  executionScore: number;
  qualityScore: number;
}): number {
  return roundMetric(timeScore * 0.35 + executionScore * 0.3 + qualityScore * 0.35);
}

export function getResultStatus(finalScore: number): ProcessStatus {
  if (finalScore >= 85) {
    return "optimal";
  }

  if (finalScore >= 65) {
    return "improvable";
  }

  return "critical";
}

export function shouldWarnOmission(
  actualTime: number,
  standardTime: number,
): boolean {
  return actualTime < standardTime * 0.6;
}

export function buildCapturedObservation({
  process,
  actualTime,
  executionRating,
  qualityResult,
  notes,
  paymentType,
  paymentAmount,
}: {
  process: ProcessDefinition;
  actualTime: number;
  executionRating: number;
  qualityResult: QualityResult;
  notes: string;
  paymentType?: PaymentType | null;
  paymentAmount?: number | null;
}): AuditObservation {
  const timeDifference = getTimeDifference(actualTime, process.standardMinutes);
  const timeDeviationPercent = getTimeDeviationPercent(
    actualTime,
    process.standardMinutes,
  );
  const timeScore = getTimeScore(actualTime, process.standardMinutes);
  const executionScore = getExecutionScore(executionRating);
  const qualityScore = getQualityScore(qualityResult);
  const finalScore = getFinalScore({
    timeScore,
    executionScore,
    qualityScore,
  });

  return {
    processId: process.id,
    actualTime,
    executionRating,
    qualityResult,
    notes,
    isApplicable: true,
    nonApplicableReason: "",
    timeDifference,
    timeDeviationPercent,
    timeScore,
    executionScore,
    qualityScore,
    finalScore,
    status: getResultStatus(finalScore),
    capturedAt: new Date().toISOString(),
    paymentType: paymentType ?? null,
    paymentAmount: paymentAmount ?? null,
  };
}

export function buildNotApplicableObservation({
  processId,
  reason,
}: {
  processId: string;
  reason: string;
}): AuditObservation {
  return {
    processId,
    actualTime: null,
    executionRating: null,
    qualityResult: null,
    notes: "",
    isApplicable: false,
    nonApplicableReason: reason,
    timeDifference: null,
    timeDeviationPercent: null,
    timeScore: null,
    executionScore: null,
    qualityScore: null,
    finalScore: null,
    status: "neutral",
    capturedAt: new Date().toISOString(),
    paymentType: null,
    paymentAmount: null,
  };
}

export function getRunTotals(run: AuditRun | null) {
  if (!run) {
    return {
      applicableCount: processDefinitions.length,
      capturedCount: 0,
      progressPercent: 0,
      standardMinutes: 0,
      actualMinutes: 0,
      optimalCount: 0,
      improvableCount: 0,
      criticalCount: 0,
    };
  }

  const applicableIds = getApplicableProcessIds(run);
  const capturedObservations = run.observations.filter(
    (observation) =>
      observation.isApplicable &&
      observation.finalScore !== null &&
      applicableIds.includes(observation.processId),
  );

  const runProcesses = applyRunSnapshotToProcesses(run);
  const standardMinutes = runProcesses
    .filter((process) => applicableIds.includes(process.id))
    .reduce((total, process) => total + process.standardMinutes, 0);

  const actualMinutes = capturedObservations.reduce(
    (total, observation) => total + (observation.actualTime ?? 0),
    0,
  );

  return {
    applicableCount: applicableIds.length,
    capturedCount: capturedObservations.length,
    progressPercent:
      applicableIds.length === 0
        ? 0
        : Math.round((capturedObservations.length / applicableIds.length) * 100),
    standardMinutes,
    actualMinutes: roundMetric(actualMinutes),
    optimalCount: capturedObservations.filter(
      (observation) => observation.status === "optimal",
    ).length,
    improvableCount: capturedObservations.filter(
      (observation) => observation.status === "improvable",
    ).length,
    criticalCount: capturedObservations.filter(
      (observation) => observation.status === "critical",
    ).length,
  };
}

export function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getApplicableProcessIds(run: AuditRun): string[] {
  if (getWorkflowVersion(run) !== "3.1") {
    return getLegacyApplicableProcessIds(run);
  }

  const ids = ["recepcion", "clasificacion", "investigacion"];

  if (run.selectedSolutionRoute === "available") {
    if (run.selectedPriorityRoute === "standard") {
      ids.push("atencion-estandar");
    }

    if (run.selectedPriorityRoute === "specialized") {
      ids.push("atencion-especializada");
    }

  }

  if (run.selectedSolutionRoute === "unavailable") {
    ids.push("solucion-no-disponible");
  }

  if (
    run.selectedSolutionRoute === "unavailable" ||
    (run.selectedSolutionRoute === "available" && run.selectedPriorityRoute !== null)
  ) {
    ids.push("validacion", "cobro", "documentacion", "confirmacion");
  }

  return ids;
}

function getLegacyApplicableProcessIds(run: AuditRun): string[] {
  const ids = ["recepcion", "clasificacion", "investigacion"];

  if (run.selectedPriorityRoute === "standard") {
    ids.push("atencion-estandar");
  }

  if (run.selectedPriorityRoute === "specialized") {
    ids.push("atencion-especializada");
  }

  if (run.selectedSolutionRoute === "available") {
    ids.push("solucion-disponible");
  }

  if (run.selectedSolutionRoute === "unavailable") {
    ids.push("solucion-no-disponible");
  }

  if (run.selectedPriorityRoute !== null && run.selectedSolutionRoute !== null) {
    ids.push("validacion", "cobro", "documentacion", "confirmacion");
  }

  return ids;
}
