import { processDefinitions } from "@/data/processes";
import { getWorkflowVersion } from "./uiLabels";
import type {
  AuditObservation,
  AuditRun,
  ProcessApplicability,
  PriorityRoute,
  SolutionRoute,
} from "@/types/audit";

export const standardPathProcessId = "atencion-estandar";
export const specializedPathProcessId = "atencion-especializada";
export const availablePathProcessId = "solucion-disponible";
export const unavailablePathProcessId = "solucion-no-disponible";
const executionNodeVersions = new Set(["1.0", "2.0", "3.0"]);

export const processOrder = [
  "recepcion",
  "clasificacion",
  "investigacion",
  "solucion-no-disponible",
  "atencion-estandar",
  "atencion-especializada",
  "validacion",
  "cobro",
  "documentacion",
  "confirmacion",
];

export const legacyProcessOrder = [
  "recepcion",
  "clasificacion",
  "atencion-estandar",
  "atencion-especializada",
  "investigacion",
  "solucion-disponible",
  "solucion-no-disponible",
  "validacion",
  "cobro",
  "documentacion",
  "confirmacion",
];

export const v2ProcessOrder = [
  "recepcion",
  "clasificacion",
  "investigacion",
  "atencion-estandar",
  "atencion-especializada",
  "solucion-disponible",
  "solucion-no-disponible",
  "validacion",
  "cobro",
  "documentacion",
  "confirmacion",
];

export const v3ProcessOrder = [
  "recepcion",
  "clasificacion",
  "investigacion",
  "solucion-no-disponible",
  "atencion-estandar",
  "atencion-especializada",
  "solucion-disponible",
  "validacion",
  "cobro",
  "documentacion",
  "confirmacion",
];

export function getProcessOrderForRun(run: AuditRun): string[] {
  const workflowVersion = getWorkflowVersion(run);

  if (workflowVersion === "1.0") {
    return legacyProcessOrder;
  }

  if (workflowVersion === "2.0") {
    return v2ProcessOrder;
  }

  if (workflowVersion === "3.0") {
    return v3ProcessOrder;
  }

  return processOrder;
}

export function getObservation(
  run: AuditRun | null,
  processId: string,
): AuditObservation | undefined {
  return run?.observations.find((observation) => observation.processId === processId);
}

export function getProcessApplicability(
  run: AuditRun | null,
  processId: string,
): ProcessApplicability {
  if (!run || run.status === "cancelled") {
    return "blocked";
  }

  if (getWorkflowVersion(run) !== "3.1") {
    return getLegacyProcessApplicability(run, processId);
  }

  if (
    (processId === standardPathProcessId &&
      run.selectedPriorityRoute === "specialized") ||
    (processId === specializedPathProcessId &&
      run.selectedPriorityRoute === "standard") ||
    ((processId === standardPathProcessId ||
      processId === specializedPathProcessId ||
      processId === availablePathProcessId) &&
      run.selectedSolutionRoute === "unavailable") ||
    (processId === availablePathProcessId &&
      run.selectedSolutionRoute === "available") ||
    (processId === unavailablePathProcessId &&
      run.selectedSolutionRoute === "available")
  ) {
    return "not_applicable";
  }

  if (
    (processId === standardPathProcessId || processId === specializedPathProcessId) &&
    (run.selectedSolutionRoute === null ||
      (run.selectedSolutionRoute === "available" && run.selectedPriorityRoute === null))
  ) {
    return "blocked";
  }

  if (
    processId === unavailablePathProcessId &&
    run.selectedSolutionRoute === null
  ) {
    return "blocked";
  }

  if (
    ["validacion", "cobro", "documentacion", "confirmacion"].includes(processId) &&
    (run.selectedSolutionRoute === null ||
      (run.selectedSolutionRoute === "available" && run.selectedPriorityRoute === null))
  ) {
    return "blocked";
  }

  return "applicable";
}

function getLegacyProcessApplicability(
  run: AuditRun,
  processId: string,
): ProcessApplicability {
  if (
    (processId === standardPathProcessId &&
      run.selectedPriorityRoute === "specialized") ||
    (processId === specializedPathProcessId &&
      run.selectedPriorityRoute === "standard") ||
    (processId === availablePathProcessId &&
      run.selectedSolutionRoute === "unavailable") ||
    (processId === unavailablePathProcessId &&
      run.selectedSolutionRoute === "available")
  ) {
    return "not_applicable";
  }

  if (
    (processId === standardPathProcessId || processId === specializedPathProcessId) &&
    run.selectedPriorityRoute === null
  ) {
    return "blocked";
  }

  if (
    (processId === availablePathProcessId || processId === unavailablePathProcessId) &&
    run.selectedSolutionRoute === null
  ) {
    return "blocked";
  }

  if (
    ["validacion", "cobro", "documentacion", "confirmacion"].includes(processId) &&
    (run.selectedPriorityRoute === null || run.selectedSolutionRoute === null)
  ) {
    return "blocked";
  }

  return "applicable";
}

export function getAlternateProcessId(
  decision: "priority" | "solution",
  route: PriorityRoute | SolutionRoute,
): string {
  if (decision === "priority") {
    return route === "standard" ? specializedPathProcessId : standardPathProcessId;
  }

  return route === "available" ? unavailablePathProcessId : availablePathProcessId;
}

export function getChosenProcessId(
  decision: "priority" | "solution",
  route: PriorityRoute | SolutionRoute,
): string {
  if (decision === "priority") {
    return route === "standard" ? standardPathProcessId : specializedPathProcessId;
  }

  return route === "available" ? availablePathProcessId : unavailablePathProcessId;
}

export function hasCapturedData(run: AuditRun, processId: string): boolean {
  const observation = getObservation(run, processId);
  return Boolean(observation?.isApplicable && observation.finalScore !== null);
}

export function getNextPendingTarget(run: AuditRun | null): string | null {
  if (!run || run.status !== "in_progress") {
    return null;
  }

  if (getWorkflowVersion(run) !== "3.1") {
    return getLegacyNextPendingTarget(run);
  }

  const firstUncaptured = (ids: string[]) =>
    ids.find((processId) => !isCapturedOrNotApplicable(run, processId)) ?? null;

  const beforePriority = firstUncaptured([
    "recepcion",
    "clasificacion",
    "investigacion",
  ]);
  if (beforePriority) {
    return beforePriority;
  }

  if (run.selectedSolutionRoute === null) {
    return "solucion";
  }

  if (run.selectedSolutionRoute === "unavailable") {
    const noSolutionPending = firstUncaptured([unavailablePathProcessId]);
    if (noSolutionPending) {
      return noSolutionPending;
    }

    return firstUncaptured(getActiveProcessSequence(run).slice(4));
  }

  if (run.selectedPriorityRoute === null) {
    return "prioritario";
  }

  const priorityProcess =
    run.selectedPriorityRoute === "standard"
      ? standardPathProcessId
      : specializedPathProcessId;
  const priorityPending = firstUncaptured([priorityProcess]);
  if (priorityPending) {
    return priorityPending;
  }

  return firstUncaptured(getActiveProcessSequence(run).slice(4));
}

export function getActiveProcessSequence(run: AuditRun): string[] {
  const sequence = ["recepcion", "clasificacion", "investigacion"];

  const workflowVersion = getWorkflowVersion(run);

  if (workflowVersion !== "3.1") {
    if (run.selectedPriorityRoute === "standard") {
      sequence.push(standardPathProcessId);
    }

    if (run.selectedPriorityRoute === "specialized") {
      sequence.push(specializedPathProcessId);
    }

    if (
      run.selectedSolutionRoute === "available" &&
      executionNodeVersions.has(workflowVersion)
    ) {
      sequence.push(availablePathProcessId);
    }

    if (run.selectedSolutionRoute === "unavailable") {
      sequence.push(unavailablePathProcessId);
    }

    if (run.selectedPriorityRoute !== null && run.selectedSolutionRoute !== null) {
      sequence.push("validacion", "cobro", "documentacion", "confirmacion");
    }

    return sequence;
  }

  if (run.selectedSolutionRoute === "unavailable") {
    sequence.push(
      unavailablePathProcessId,
      "validacion",
      "cobro",
      "documentacion",
      "confirmacion",
    );
    return sequence;
  }

  if (run.selectedSolutionRoute === "available") {
    if (run.selectedPriorityRoute === "standard") {
      sequence.push(standardPathProcessId);
    }

    if (run.selectedPriorityRoute === "specialized") {
      sequence.push(specializedPathProcessId);
    }

    if (run.selectedPriorityRoute !== null) {
      sequence.push("validacion", "cobro", "documentacion", "confirmacion");
    }
  }

  return sequence;
}

function getLegacyNextPendingTarget(run: AuditRun): string | null {
  const firstUncaptured = (ids: string[]) =>
    ids.find((processId) => !isCapturedOrNotApplicable(run, processId)) ?? null;

  const beforePriority = firstUncaptured([
    "recepcion",
    "clasificacion",
    "investigacion",
  ]);
  if (beforePriority) {
    return beforePriority;
  }

  if (run.selectedPriorityRoute === null) {
    return "prioritario";
  }

  const priorityProcess =
    run.selectedPriorityRoute === "standard"
      ? standardPathProcessId
      : specializedPathProcessId;
  const priorityPending = firstUncaptured([priorityProcess]);
  if (priorityPending) {
    return priorityPending;
  }

  if (run.selectedSolutionRoute === null) {
    return "solucion";
  }

  const solutionProcess =
    run.selectedSolutionRoute === "available"
      ? availablePathProcessId
      : unavailablePathProcessId;

  return firstUncaptured([
    solutionProcess,
    "validacion",
    "cobro",
    "documentacion",
    "confirmacion",
  ]);
}

export function getProcessById(
  processId: string,
  processes = processDefinitions,
) {
  return processes.find((process) => process.id === processId);
}

function isCapturedOrNotApplicable(run: AuditRun, processId: string): boolean {
  const applicability = getProcessApplicability(run, processId);
  if (applicability === "not_applicable") {
    return true;
  }

  const observation = getObservation(run, processId);
  return Boolean(
    observation &&
      (!observation.isApplicable || observation.finalScore !== null),
  );
}
