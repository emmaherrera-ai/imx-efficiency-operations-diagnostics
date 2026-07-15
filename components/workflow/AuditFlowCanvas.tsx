"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createWorkflowEdges, createWorkflowNodes } from "@/data/workflow";
import { getObservation, getProcessApplicability } from "@/lib/auditFlow";
import type {
  AuditRun,
  AuditWorkflowEdge,
  AuditWorkflowNode,
  ProcessDefinition,
  StatusFilter,
  WorkflowNodeData,
} from "@/types/audit";
import { DecisionNode, ProcessNode, TerminalNode } from "./WorkflowNodes";

type AuditFlowCanvasProps = {
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  activeFilter: StatusFilter;
  activeRun: AuditRun | null;
  processes: ProcessDefinition[];
};

const nodeTypes = {
  process: ProcessNode,
  terminal: TerminalNode,
  decision: DecisionNode,
} satisfies NodeTypes;

const nodeDimensions: Record<WorkflowNodeData["kind"], { width: number; height: number }> = {
  process: { width: 230, height: 178 },
  decision: { width: 170, height: 170 },
  terminal: { width: 132, height: 48 },
};

export function AuditFlowCanvas({
  selectedNodeId,
  onSelectNode,
  activeFilter,
  activeRun,
  processes,
}: AuditFlowCanvasProps) {
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<AuditWorkflowNode, AuditWorkflowEdge> | null>(
      null,
    );
  const baseNodes = useMemo(() => createWorkflowNodes(processes), [processes]);
  const baseEdges = useMemo(() => createWorkflowEdges(processes), [processes]);

  const connectedNodeIds = useMemo(() => {
    if (selectedNodeId === null) {
      return new Set<string>();
    }

    return new Set(
      baseEdges
        .filter(
          (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId,
        )
        .flatMap((edge) => [edge.source, edge.target]),
    );
  }, [baseEdges, selectedNodeId]);

  const visibleNodes = useMemo<AuditWorkflowNode[]>(() => {
    return baseNodes.map((node) => {
      const observation = node.data.processId
        ? getObservation(activeRun, node.data.processId)
        : undefined;
      const applicability = node.data.processId
        ? getProcessApplicability(activeRun, node.data.processId)
        : "applicable";
      const isNotApplicable =
        observation?.isApplicable === false || applicability === "not_applicable";
      const effectiveStatus =
        observation?.isApplicable && observation.finalScore !== null
          ? observation.status
          : node.data.status;
      const isRelated =
        selectedNodeId === null ||
        node.id === selectedNodeId ||
        connectedNodeIds.has(node.id);
      const filteredOut =
        activeFilter !== "all" &&
        node.data.kind === "process" &&
        effectiveStatus !== activeFilter;
      const routeDimmed =
        activeRun?.status === "in_progress" &&
        node.data.kind === "process" &&
        (applicability === "not_applicable" || applicability === "blocked");

      return {
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          status: effectiveStatus,
          effectiveStatus,
          actualTime: observation?.actualTime ?? null,
          timeDifference: observation?.timeDifference ?? null,
          captureStatus: isNotApplicable
            ? "not_applicable"
            : observation?.finalScore !== null && observation
              ? "captured"
              : "pending",
          isApplicable: !isNotApplicable,
          dimmed:
            filteredOut ||
            routeDimmed ||
            (selectedNodeId !== null && !isRelated),
          related: selectedNodeId !== null && connectedNodeIds.has(node.id),
        },
      };
    });
  }, [activeFilter, activeRun, baseNodes, connectedNodeIds, selectedNodeId]);

  const visibleEdges = useMemo<AuditWorkflowEdge[]>(() => {
    return baseEdges.map((edge) => {
      const isConnected =
        selectedNodeId !== null &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const isRouteDimmed = isInactiveRouteEdge(edge.source, edge.target, activeRun);

      return {
        ...edge,
        animated: isConnected,
        style: {
          stroke: isConnected ? "#38d8ff" : "#294666",
          strokeWidth: isConnected ? 2.8 : 1.45,
          opacity: isRouteDimmed
            ? 0.16
            : selectedNodeId === null || isConnected
              ? 1
              : 0.42,
        },
        labelStyle: {
          fill: "#dff8ff",
          fontSize: 12,
          fontWeight: 800,
        },
        labelBgStyle: {
          fill: "#071526",
          fillOpacity: 0.92,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 999,
      };
    });
  }, [activeRun, baseEdges, selectedNodeId]);

  const centerNode = useCallback(
    (node: AuditWorkflowNode) => {
      if (!flowInstance) {
        return;
      }

      const dimensions = nodeDimensions[node.data.kind];
      const viewport = flowInstance.getViewport();

      void flowInstance.setCenter(
        node.position.x + dimensions.width / 2,
        node.position.y + dimensions.height / 2,
        {
          duration: 520,
          zoom: Math.max(0.54, Math.min(viewport.zoom, 0.82)),
        },
      );
    },
    [flowInstance],
  );

  const handleNodeClick: NodeMouseHandler<AuditWorkflowNode> = useCallback(
    (_, node) => {
      onSelectNode(node.id);
      centerNode(node);
    },
    [centerNode, onSelectNode],
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    const node = visibleNodes.find((item) => item.id === selectedNodeId);
    if (node) {
      centerNode(node);
    }
  }, [centerNode, selectedNodeId, visibleNodes]);

  return (
    <section className="flow-shell" aria-label="Lienzo del flujo operativo">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={setFlowInstance}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        fitViewOptions={{ padding: 0.26, minZoom: 0.34, maxZoom: 0.76 }}
        minZoom={0.32}
        maxZoom={1.05}
        defaultViewport={{ x: 112, y: 34, zoom: 0.68 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={28}
          size={1}
          color="#12304a"
        />
      </ReactFlow>
      <div className="flow-controls" aria-label="Controles del lienzo">
        <button
          type="button"
          aria-label="Acercar"
          title="Acercar"
          onClick={() => {
            void flowInstance?.zoomIn({ duration: 180 });
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar"
          title="Alejar"
          onClick={() => {
            void flowInstance?.zoomOut({ duration: 180 });
          }}
        >
          -
        </button>
        <button
          type="button"
          aria-label="Ajustar vista"
          title="Ajustar vista"
          onClick={() => {
            void flowInstance?.fitView({ padding: 0.26, duration: 260 });
          }}
        >
          Ajustar
        </button>
      </div>
      <div className="flow-vignette" />
      <p className="canvas-caption">
        Zoom y desplazamiento activos · nodos bloqueados para auditoría visual
      </p>
    </section>
  );
}

function isInactiveRouteEdge(
  source: string,
  target: string,
  run: AuditRun | null,
): boolean {
  if (!run) {
    return false;
  }

  const edgeIds = [source, target];

  if (
    run.selectedPriorityRoute === "standard" &&
    edgeIds.includes("atencion-especializada")
  ) {
    return true;
  }

  if (
    run.selectedPriorityRoute === "specialized" &&
    edgeIds.includes("atencion-estandar")
  ) {
    return true;
  }

  if (
    run.selectedSolutionRoute === "available" &&
    edgeIds.includes("solucion-no-disponible")
  ) {
    return true;
  }

  if (
    run.selectedSolutionRoute === "unavailable" &&
    (edgeIds.includes("solucion-disponible") ||
      edgeIds.includes("prioritario") ||
      edgeIds.includes("atencion-estandar") ||
      edgeIds.includes("atencion-especializada"))
  ) {
    return true;
  }

  return false;
}
