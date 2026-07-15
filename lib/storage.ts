import type { AuditRun, ProcessStandardConfig } from "@/types/audit";
import { getDefaultStandards, mergeStandards } from "./standards";

export const storageKeys = {
  standards: "imx-eod:standards:v1",
  runs: "imx-eod:runs:v1",
  activeRun: "imx-eod:active-run:v1",
} as const;

export type StoragePayload = {
  storageVersion: 1;
  exportedAt: string;
  standards: ProcessStandardConfig[];
  runs: AuditRun[];
};

export type SafeStorageResult<TValue> = {
  value: TValue;
  ok: boolean;
  error?: string;
};

export function readStandards(): SafeStorageResult<ProcessStandardConfig[]> {
  const parsed = readJson<unknown>(storageKeys.standards);

  if (!parsed.ok) {
    return { value: getDefaultStandards(), ok: false, error: parsed.error };
  }

  if (!Array.isArray(parsed.value)) {
    return {
      value: getDefaultStandards(),
      ok: false,
      error: "La configuración de estándares no tiene un formato válido.",
    };
  }

  return { value: mergeStandards(parsed.value as ProcessStandardConfig[]), ok: true };
}

export function writeStandards(standards: ProcessStandardConfig[]): boolean {
  return writeJson(storageKeys.standards, standards);
}

export function readRuns(): SafeStorageResult<AuditRun[]> {
  const parsed = readJson<unknown>(storageKeys.runs);

  if (!parsed.ok) {
    return { value: [], ok: false, error: parsed.error };
  }

  if (!Array.isArray(parsed.value)) {
    return {
      value: [],
      ok: false,
      error: "El centro local de auditorías no tiene un formato válido.",
    };
  }

  return { value: parsed.value as AuditRun[], ok: true };
}

export function writeRuns(runs: AuditRun[]): boolean {
  return writeJson(storageKeys.runs, runs);
}

export function readActiveRunId(): SafeStorageResult<string | null> {
  const parsed = readJson<unknown>(storageKeys.activeRun);

  if (!parsed.ok) {
    return { value: null, ok: false, error: parsed.error };
  }

  return {
    value: typeof parsed.value === "string" ? parsed.value : null,
    ok: true,
  };
}

export function writeActiveRunId(runId: string | null): boolean {
  return writeJson(storageKeys.activeRun, runId);
}

export function buildBackupPayload(
  standards: ProcessStandardConfig[],
  runs: AuditRun[],
): StoragePayload {
  return {
    storageVersion: 1,
    exportedAt: new Date().toISOString(),
    standards,
    runs,
  };
}

export function isBackupPayload(value: unknown): value is StoragePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoragePayload>;

  return (
    candidate.storageVersion === 1 &&
    typeof candidate.exportedAt === "string" &&
    Array.isArray(candidate.standards) &&
    Array.isArray(candidate.runs)
  );
}

export function replaceAllLocalData(payload: StoragePayload): boolean {
  const standardsOk = writeStandards(mergeStandards(payload.standards));
  const runsOk = writeRuns(payload.runs);
  const activeRun = payload.runs.find((run) => run.status === "in_progress");
  const activeOk = writeActiveRunId(activeRun?.id ?? null);

  return standardsOk && runsOk && activeOk;
}

function readJson<TValue>(key: string): SafeStorageResult<TValue | null> {
  if (typeof window === "undefined" || !window.localStorage) {
    return { value: null, ok: false, error: "localStorage no está disponible." };
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return { value: null, ok: true };
    }

    return { value: JSON.parse(raw) as TValue, ok: true };
  } catch {
    return {
      value: null,
      ok: false,
      error: `No se pudo leer ${key}; se usarán valores seguros.`,
    };
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
