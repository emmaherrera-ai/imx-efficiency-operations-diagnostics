"use client";

import { useEffect, useState } from "react";
import { AuditFlowCanvas } from "@/components/workflow/AuditFlowCanvas";
import { createWorkflowNodes } from "@/data/workflow";
import { useActiveAuditRun } from "@/hooks/useActiveAuditRun";
import { useStandards } from "@/hooks/useStandards";
import {
  applyRunSnapshotToProcesses,
  applyStandardsToProcesses,
} from "@/lib/standards";
import { AuditHeader } from "./AuditHeader";
import { NewRunModal } from "./NewRunModal";
import { AuditSidePanel } from "./AuditSidePanel";
import { StandardsModal } from "./StandardsModal";
import { HistoryModal } from "./HistoryModal";
import type { StatusFilter } from "@/types/audit";

export function AuditDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNewRunOpen, setIsNewRunOpen] = useState(false);
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const {
    standards,
    saveStandards,
    restoreDefaults,
    saveState: standardsSaveState,
  } = useStandards();
  const {
    activeRun,
    createRun,
    saveObservation,
    setPriorityRoute,
    setSolutionRoute,
    cancelRun,
    deleteRun,
    completeRun,
    updateGeneralComments,
    continueRun,
    runs,
    metrics,
    nextPendingTarget,
    saveState: runSaveState,
  } = useActiveAuditRun(standards);

  const effectiveProcesses = activeRun
    ? applyRunSnapshotToProcesses(activeRun)
    : applyStandardsToProcesses(standards);

  const selectedNode =
    createWorkflowNodes(effectiveProcesses).find((node) => node.id === selectedNodeId)
      ?.data ?? null;

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  if (!isMounted) {
    return (
      <main className="audit-app">
        <div className="audit-header">
          <div className="brand-lockup">
            <div className="imx-mark">IMX</div>
            <div>
              <p>AUDITORÍA CUANTITATIVA DE PROCESOS</p>
              <h1>Flujo General de Atención</h1>
            </div>
          </div>
          <span className="save-indicator">Cargando datos locales...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="audit-app">
      <AuditHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onNewRun={() => setIsNewRunOpen(true)}
        onConfigureStandards={() => setIsStandardsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        saveState={runSaveState === "saving" ? runSaveState : standardsSaveState}
      />
      <div className="audit-layout">
        <AuditFlowCanvas
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          activeFilter={activeFilter}
          activeRun={activeRun}
          processes={effectiveProcesses}
        />
        <AuditSidePanel
          selectedNode={selectedNode}
          activeRun={activeRun}
          metrics={metrics}
          nextPendingTarget={nextPendingTarget}
          onContinueAudit={() => setSelectedNodeId(nextPendingTarget)}
          onSaveObservation={saveObservation}
          onPriorityRouteChange={setPriorityRoute}
          onSolutionRouteChange={setSolutionRoute}
          onCancelRun={() => {
            cancelRun();
            setSelectedNodeId(null);
          }}
          onCompleteRun={() => {
            completeRun();
            setSelectedNodeId(null);
          }}
          onGeneralCommentsChange={updateGeneralComments}
          onSelectNode={setSelectedNodeId}
          processes={effectiveProcesses}
        />
      </div>
      <NewRunModal
        isOpen={isNewRunOpen}
        onClose={() => setIsNewRunOpen(false)}
        onCreateRun={(input) => {
          createRun(input);
          setSelectedNodeId(null);
          setIsNewRunOpen(false);
        }}
      />
      <StandardsModal
        isOpen={isStandardsOpen}
        hasActiveRun={activeRun?.status === "in_progress"}
        standards={standards}
        runs={runs}
        onClose={() => setIsStandardsOpen(false)}
        onSave={saveStandards}
        onRestoreDefaults={restoreDefaults}
        onImportCompleted={() => window.location.reload()}
      />
      <HistoryModal
        isOpen={isHistoryOpen}
        runs={runs}
        onClose={() => setIsHistoryOpen(false)}
        onContinueRun={(runId) => {
          continueRun(runId);
          setSelectedNodeId(null);
          setIsHistoryOpen(false);
        }}
        onCancelRun={(runId) => {
          if (window.confirm("Cancelar esta corrida en progreso?")) {
            cancelRun(runId);
            setSelectedNodeId(null);
          }
        }}
        onDeleteRun={(runId) => {
          if (
            window.confirm(
              "Eliminar esta auditoría de forma permanente? Esta acción no se puede deshacer.",
            )
          ) {
            deleteRun(runId);
            setSelectedNodeId(null);
          }
        }}
      />
    </main>
  );
}
