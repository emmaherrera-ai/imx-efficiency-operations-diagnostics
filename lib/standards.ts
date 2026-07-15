import { processDefinitions } from "@/data/processes";
import type {
  AuditRun,
  ProcessDefinition,
  ProcessStandardConfig,
  StandardsSnapshotItem,
} from "@/types/audit";
import { getWorkflowVersion } from "./uiLabels";

export const standardsVersion = "std-v1";
const currentStandardProcessIds = new Set([
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
]);

export function getDefaultStandards(): ProcessStandardConfig[] {
  const now = new Date().toISOString();

  return processDefinitions
    .filter((process) => currentStandardProcessIds.has(process.id))
    .map((process) => ({
      processId: process.id,
      standardTime: process.standardMinutes,
      targetExperience: normalizeTargetExperience(process.targetExperience),
      updatedAt: now,
      scope: "global",
    }));
}

export function applyStandardsToProcesses(
  standards: ProcessStandardConfig[],
): ProcessDefinition[] {
  return processDefinitions
    .filter((process) => currentStandardProcessIds.has(process.id))
    .map((process) => {
      const standard = standards.find((item) => item.processId === process.id);

      return {
        ...process,
        standardMinutes: standard?.standardTime ?? process.standardMinutes,
        targetExperience: standard?.targetExperience ?? process.targetExperience,
      };
    });
}

export function applyRunSnapshotToProcesses(run: AuditRun): ProcessDefinition[] {
  const includeExecutionNode = getWorkflowVersion(run) !== "3.1";

  return processDefinitions
    .filter((process) => includeExecutionNode || process.id !== "solucion-disponible")
    .map((process) => {
      const snapshot = (run.standardsSnapshot ?? []).find(
        (item) => item.processId === process.id,
      );

      return {
        ...process,
        standardMinutes: snapshot?.standardTime ?? process.standardMinutes,
        targetExperience: normalizeTargetExperience(
          snapshot?.targetExperience ?? process.targetExperience,
        ),
      };
    });
}

export function createStandardsSnapshot(
  standards: ProcessStandardConfig[],
): StandardsSnapshotItem[] {
  return standards
    .filter((standard) => currentStandardProcessIds.has(standard.processId))
    .map((standard) => ({
      processId: standard.processId,
      standardTime: standard.standardTime,
      targetExperience: standard.targetExperience,
    }));
}

export function getSnapshotProcess(
  run: AuditRun,
  processId: string,
): ProcessDefinition | undefined {
  return applyRunSnapshotToProcesses(run).find((process) => process.id === processId);
}

export function mergeStandards(
  incoming: ProcessStandardConfig[],
): ProcessStandardConfig[] {
  const defaults = getDefaultStandards();

  return defaults.map((defaultStandard) => {
    const override = incoming.find(
      (item) =>
        item.processId === defaultStandard.processId &&
        item.scope === defaultStandard.scope,
    );

    if (!override) {
      return defaultStandard;
    }

    return {
      ...defaultStandard,
      ...override,
      standardTime: Number(override.standardTime),
      targetExperience: normalizeTargetExperience(Number(override.targetExperience)),
      scope: override.scope,
    };
  });
}

function normalizeTargetExperience(value: number): number {
  return value > 10 ? Math.round(value) / 10 : value;
}
