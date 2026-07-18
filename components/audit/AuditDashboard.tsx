"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuditFlowCanvas } from "@/components/workflow/AuditFlowCanvas";
import { AuditContextBar } from "./AuditContextBar";
import { createWorkflowNodes } from "@/data/workflow";
import { useActiveAuditRun } from "@/hooks/useActiveAuditRun";
import { useStandards } from "@/hooks/useStandards";
import {
  getCurrentAuditNodeId,
  getNodeDisplayName,
} from "@/lib/auditVisual";
import {
  applyRunSnapshotToProcesses,
  applyStandardsToProcesses,
} from "@/lib/standards";
import { AuditHeader } from "./AuditHeader";
import { NewRunModal } from "./NewRunModal";
import { AuditSidePanel } from "./AuditSidePanel";
import { StandardsModal } from "./StandardsModal";
import { HistoryModal } from "./HistoryModal";
import { ToastStack, type ToastMessage } from "./ToastStack";
import type { StatusFilter } from "@/types/audit";

export function AuditDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNewRunOpen, setIsNewRunOpen] = useState(false);
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [recentlyCompletedNodeId, setRecentlyCompletedNodeId] = useState<string | null>(null);
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
    updateRunGeneralComments,
    continueRun,
    runs,
    metrics,
    nextPendingTarget,
    saveState: runSaveState,
  } = useActiveAuditRun(standards);

  const effectiveProcesses = activeRun
    ? applyRunSnapshotToProcesses(activeRun)
    : applyStandardsToProcesses(standards);
  const currentNodeId = getCurrentAuditNodeId({
    selectedNodeId,
    nextPendingTarget,
    run: activeRun,
  });

  const selectedNode =
    createWorkflowNodes(effectiveProcesses).find((node) => node.id === currentNodeId)
      ?.data ?? null;

  const showToast = useCallback(
    (message: string, tone: ToastMessage["tone"] = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 2400);
    },
    [],
  );

  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      if (nodeId === null && activeRun) {
        setSelectedNodeId(currentNodeId ?? nextPendingTarget);
        return;
      }

      setSelectedNodeId(nodeId);
    },
    [activeRun, currentNodeId, nextPendingTarget],
  );

  const handleProcessTransition = useCallback(
    (processId: string, nextNodeId: string | null) => {
      setRecentlyCompletedNodeId(processId);
      window.setTimeout(() => setRecentlyCompletedNodeId(null), 1100);

      setSelectedNodeId(nextNodeId);
    },
    [],
  );

  const activeProcessLabel = useMemo(
    () => getNodeDisplayName(currentNodeId, effectiveProcesses),
    [currentNodeId, effectiveProcesses],
  );

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  if (!isMounted) {
    return (
      <main className="audit-app">
        <div className="audit-header">
          <div className="brand-lockup">
            <div className="imx-mark">EOD</div>
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
      <AuditContextBar
        run={activeRun}
        processes={effectiveProcesses}
        currentNodeId={currentNodeId}
        nextPendingTarget={nextPendingTarget}
        capturedCount={metrics.capturedCount}
        progressPercent={metrics.progressPercent}
        saveState={runSaveState}
      />
      <div className="audit-layout">
        <AuditFlowCanvas
          selectedNodeId={currentNodeId}
          onSelectNode={handleSelectNode}
          activeFilter={activeFilter}
          activeRun={activeRun}
          processes={effectiveProcesses}
          recentlyCompletedNodeId={recentlyCompletedNodeId}
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
            showToast("Auditoría cancelada", "info");
          }}
          onCompleteRun={() => {
            completeRun();
            setSelectedNodeId(null);
            showToast("Auditoría finalizada");
          }}
          onGeneralCommentsChange={updateGeneralComments}
          onSelectNode={handleSelectNode}
          onToast={showToast}
          onProcessTransition={handleProcessTransition}
          currentNodeId={currentNodeId}
          processes={effectiveProcesses}
        />
      </div>
      <NewRunModal
        isOpen={isNewRunOpen}
        onClose={() => setIsNewRunOpen(false)}
        onCreateRun={(input) => {
          showToast("Preparando auditoría...", "info");
          createRun(input);
          setSelectedNodeId("recepcion");
          setIsNewRunOpen(false);
          window.setTimeout(() => showToast("Auditoría lista"), 450);
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
          if (window.confirm("¿Cancelar esta auditoría en progreso?")) {
            cancelRun(runId);
            setSelectedNodeId(null);
            showToast("Auditoría cancelada", "info");
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
        onUpdateGeneralComments={(runId, comments) => {
          const updatedRun = updateRunGeneralComments(runId, comments);

          if (updatedRun) {
            showToast("Comentarios actualizados");
          }

          return updatedRun;
        }}
      />
      <ToastStack messages={toasts} />
      <div className="mobile-process-peek" aria-live="polite">
        <span>Proceso actual</span>
        <strong>{activeRun ? activeProcessLabel : "Panel Ejecutivo"}</strong>
      </div>
    </main>
  );
}
