"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildNotApplicableObservation,
  getRunTotals,
} from "@/lib/auditCalculations";
import {
  getAlternateProcessId,
  getChosenProcessId,
  getNextPendingTarget,
} from "@/lib/auditFlow";
import {
  readActiveRunId,
  readRuns,
  writeActiveRunId,
  writeRuns,
} from "@/lib/storage";
import { createStandardsSnapshot, standardsVersion } from "@/lib/standards";
import { getWorkflowVersion, workflowLabels } from "@/lib/uiLabels";
import type {
  AuditObservation,
  AuditRun,
  NewAuditRunInput,
  PriorityRoute,
  ProcessStandardConfig,
  SolutionRoute,
} from "@/types/audit";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useActiveAuditRun(standards: ProcessStandardConfig[]) {
  const [runs, setRuns] = useState<AuditRun[]>(() => readRuns().value);
  const [activeRunId, setActiveRunId] = useState<string | null>(
    () => readActiveRunId().value,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const activeRun = useMemo(
    () =>
      runs.find(
        (run) => run.id === activeRunId && run.status === "in_progress",
      ) ?? null,
    [activeRunId, runs],
  );

  const persist = useCallback(
    (nextRuns: AuditRun[], nextActiveRunId: string | null = activeRunId) => {
      setSaveState("saving");
      const runsOk = writeRuns(nextRuns);
      const activeOk = writeActiveRunId(nextActiveRunId);
      setRuns(nextRuns);
      setActiveRunId(nextActiveRunId);
      setSaveState(runsOk && activeOk ? "saved" : "error");
    },
    [activeRunId],
  );

  const upsertRun = useCallback(
    (run: AuditRun, nextActiveRunId: string | null = run.id) => {
      const nextRuns = [
        ...runs.filter((item) => item.id !== run.id),
        run,
      ].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      persist(nextRuns, nextActiveRunId);
    },
    [persist, runs],
  );

  const createRun = useCallback(
    (input: NewAuditRunInput) => {
      const now = new Date();
      const capturedAt = now.toISOString();
      const run: AuditRun = {
        id: `IMX-${formatDateId(now)}-${String(now.getSeconds()).padStart(2, "0")}`,
        workflowName: workflowLabels.name,
        workflowVersion: workflowLabels.currentVersion,
        date: input.date,
        city: input.city,
        chain: input.chain === "" ? "Liverpool" : input.chain,
        store: input.store.trim(),
        module: input.module.trim(),
        operatorName: input.operatorName.trim(),
        auditorName: input.auditorName.trim(),
        shift: input.shift === "" ? "Apertura" : input.shift,
        initialNotes: input.initialNotes.trim(),
        generalComments: "",
        status: "in_progress",
        startedAt: capturedAt,
        selectedPriorityRoute: null,
        selectedSolutionRoute: null,
        standardsSnapshot: createStandardsSnapshot(standards),
        standardsVersion,
        standardsCapturedAt: capturedAt,
        observations: [],
      };

      upsertRun(run, run.id);
      return run;
    },
    [standards, upsertRun],
  );

  const saveObservation = useCallback(
    (observation: AuditObservation) => {
      if (!activeRun || activeRun.status !== "in_progress") {
        return;
      }

      upsertRun(upsertObservation(activeRun, observation));
    },
    [activeRun, upsertRun],
  );

  const setPriorityRoute = useCallback(
    (route: PriorityRoute) => {
      if (!activeRun || activeRun.status !== "in_progress") {
        return;
      }

      if (activeRun.selectedPriorityRoute === route) {
        return;
      }

      const alternateProcessId = getAlternateProcessId("priority", route);
      const chosenProcessId = getChosenProcessId("priority", route);
      const observations = activeRun.observations
        .filter((observation) => observation.processId !== alternateProcessId)
        .filter((observation) => observation.processId !== chosenProcessId);

      upsertRun({
        ...activeRun,
        selectedPriorityRoute: route,
        observations: [
          ...observations,
          buildNotApplicableObservation({
            processId: alternateProcessId,
            reason: "Ruta alternativa no recorrida",
          }),
        ],
      });
    },
    [activeRun, upsertRun],
  );

  const setSolutionRoute = useCallback(
    (route: SolutionRoute) => {
      if (!activeRun || activeRun.status !== "in_progress") {
        return;
      }

      const alternateProcessId = getAlternateProcessId("solution", route);
      const chosenProcessId = getChosenProcessId("solution", route);
      const isCurrentWorkflow =
        getWorkflowVersion(activeRun) === workflowLabels.currentVersion;
      let observations = activeRun.observations
        .filter((observation) => observation.processId !== alternateProcessId)
        .filter((observation) => observation.processId !== chosenProcessId);
      const notApplicableObservations =
        isCurrentWorkflow && route === "unavailable"
          ? []
          : [
              buildNotApplicableObservation({
                processId: alternateProcessId,
                reason: "Ruta alternativa no recorrida",
              }),
            ];

      if (
        route === "unavailable" &&
        isCurrentWorkflow
      ) {
        observations = observations
          .filter((observation) => observation.processId !== "atencion-estandar")
          .filter((observation) => observation.processId !== "atencion-especializada");
        notApplicableObservations.push(
          buildNotApplicableObservation({
            processId: "atencion-estandar",
            reason: "No aplica porque no existe una solución disponible",
          }),
          buildNotApplicableObservation({
            processId: "atencion-especializada",
            reason: "No aplica porque no existe una solución disponible",
          }),
        );
      } else if (isCurrentWorkflow) {
        observations = observations
          .filter((observation) => observation.processId !== "atencion-estandar")
          .filter((observation) => observation.processId !== "atencion-especializada");
      }

      upsertRun({
        ...activeRun,
        selectedSolutionRoute: route,
        selectedPriorityRoute:
          route === "unavailable" &&
          isCurrentWorkflow
            ? null
            : activeRun.selectedPriorityRoute,
        observations: [
          ...observations,
          ...notApplicableObservations,
        ],
      });
    },
    [activeRun, upsertRun],
  );

  const cancelRun = useCallback(
    (runId = activeRun?.id) => {
      const run = runs.find((item) => item.id === runId);
      if (!run || run.status === "completed") {
        return;
      }

      upsertRun({
        ...run,
        status: "cancelled",
      }, run.id === activeRunId ? null : activeRunId);
    },
    [activeRun?.id, activeRunId, runs, upsertRun],
  );

  const deleteRun = useCallback(
    (runId: string) => {
      const nextRuns = runs.filter((run) => run.id !== runId);
      persist(nextRuns, runId === activeRunId ? null : activeRunId);
    },
    [activeRunId, persist, runs],
  );

  const completeRun = useCallback(() => {
    if (!activeRun || activeRun.status !== "in_progress") {
      return;
    }

    upsertRun({
      ...activeRun,
      status: "completed",
      completedAt: new Date().toISOString(),
    }, null);
  }, [activeRun, upsertRun]);

  const updateGeneralComments = useCallback(
    (comments: string) => {
      if (!activeRun || activeRun.status !== "in_progress") {
        return;
      }

      upsertRun({
        ...activeRun,
        generalComments: comments,
      });
    },
    [activeRun, upsertRun],
  );

  const continueRun = useCallback((runId: string) => {
    setActiveRunId(runId);
    writeActiveRunId(runId);
    setSaveState("saved");
  }, []);

  const replaceRuns = useCallback(
    (nextRuns: AuditRun[]) => {
      const nextActive = nextRuns.find((run) => run.status === "in_progress")?.id ?? null;
      persist(nextRuns, nextActive);
    },
    [persist],
  );

  const metrics = useMemo(() => getRunTotals(activeRun), [activeRun]);
  const nextPendingTarget = useMemo(
    () => getNextPendingTarget(activeRun),
    [activeRun],
  );

  return {
    activeRun,
    runs,
    createRun,
    saveObservation,
    setPriorityRoute,
    setSolutionRoute,
    cancelRun,
    deleteRun,
    completeRun,
    updateGeneralComments,
    continueRun,
    replaceRuns,
    metrics,
    nextPendingTarget,
    saveState,
  };
}

function upsertObservation(run: AuditRun, observation: AuditObservation): AuditRun {
  return {
    ...run,
    observations: [
      ...run.observations.filter(
        (item) => item.processId !== observation.processId,
      ),
      observation,
    ],
  };
}

function formatDateId(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("");
}
