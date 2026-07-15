"use client";

import { useCallback, useState } from "react";
import {
  readStandards,
  writeStandards,
} from "@/lib/storage";
import { getDefaultStandards, mergeStandards } from "@/lib/standards";
import type { ProcessStandardConfig } from "@/types/audit";
import type { SaveState } from "./useActiveAuditRun";

export function useStandards() {
  const [standards, setStandards] = useState<ProcessStandardConfig[]>(
    () => readStandards().value,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const saveStandards = useCallback((nextStandards: ProcessStandardConfig[]) => {
    setSaveState("saving");
    const normalized = mergeStandards(nextStandards).map((standard) => ({
      ...standard,
      updatedAt: new Date().toISOString(),
    }));
    const ok = writeStandards(normalized);
    setStandards(normalized);
    setSaveState(ok ? "saved" : "error");
  }, []);

  const restoreDefaults = useCallback(() => {
    saveStandards(getDefaultStandards());
  }, [saveStandards]);

  return {
    standards,
    saveStandards,
    restoreDefaults,
    saveState,
  };
}
