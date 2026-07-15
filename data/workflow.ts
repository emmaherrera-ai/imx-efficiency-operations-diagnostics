import { Position } from "@xyflow/react";
import type {
  AuditWorkflowEdge,
  AuditWorkflowNode,
  ProcessDefinition,
  WorkflowHandleLayout,
} from "@/types/audit";

const MAIN_X = 430;
const LEFT_BRANCH_X = 92;
const RIGHT_BRANCH_X = 768;
const ATTENTION_LEFT_X = 620;
const ATTENTION_RIGHT_X = 904;

const NODE_Y = {
  inicio: 24,
  recepcion: 126,
  clasificacion: 340,
  investigacion: 554,
  solucion: 792,
  solutionBranches: 1084,
  prioritario: 1084,
  priorityBranches: 1376,
  execution: 1534,
  validacion: 1692,
  cobro: 1906,
  documentacion: 2120,
  confirmacion: 2334,
  fin: 2574,
} as const;

const terminalX = MAIN_X + 49;
const decisionX = MAIN_X + 30;

const verticalHandles: WorkflowHandleLayout = {
  source: Position.Bottom,
  target: Position.Top,
};

const branchDecisionHandles: WorkflowHandleLayout = {
  source: Position.Bottom,
  target: Position.Top,
  extraSources: [Position.Left, Position.Right],
};

const branchProcessHandles: WorkflowHandleLayout = {
  source: Position.Bottom,
  target: Position.Top,
  extraSources: [Position.Left, Position.Right],
  extraTargets: [Position.Left, Position.Right],
};

function processData(process: ProcessDefinition) {
  return {
    label: process.name,
    kind: "process" as const,
    status: process.status,
    department: process.department,
    standardMinutes: process.standardMinutes,
    targetExperience: process.targetExperience,
    description: process.description,
    processId: process.id,
    handleLayout: branchProcessHandles,
  };
}

function terminalData(label: string, description: string) {
  return {
    label,
    kind: "terminal" as const,
    status: "neutral" as const,
    description,
    handleLayout: verticalHandles,
  };
}

function decisionData(
  label: string,
  description: string,
  decisionId: "priority" | "solution",
) {
  return {
    label,
    kind: "decision" as const,
    status: "neutral" as const,
    description,
    decisionId,
    handleLayout: branchDecisionHandles,
  };
}

export function createWorkflowNodes(
  processes: ProcessDefinition[],
): AuditWorkflowNode[] {
  const processMap = new Map(processes.map((process) => [process.id, process]));

  const getProcess = (id: string): ProcessDefinition => {
    const process = processMap.get(id);

    if (!process) {
      throw new Error(`Proceso no configurado: ${id}`);
    }

    return process;
  };

  return [
    {
      id: "inicio",
      type: "terminal",
      position: { x: terminalX, y: NODE_Y.inicio },
      data: terminalData("INICIO", "Punto de arranque del flujo de atención."),
      draggable: false,
    },
    {
      id: "recepcion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.recepcion },
      data: processData(getProcess("recepcion")),
      draggable: false,
    },
    {
      id: "clasificacion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.clasificacion },
      data: processData(getProcess("clasificacion")),
      draggable: false,
    },
    {
      id: "solucion",
      type: "decision",
      position: { x: decisionX, y: NODE_Y.solucion },
      data: decisionData(
        "¿Existe una solución disponible?",
        "Define si se ejecuta una solución o se gestiona una alternativa.",
        "solution",
      ),
      draggable: false,
    },
    {
      id: "solucion-no-disponible",
      type: "process",
      position: { x: LEFT_BRANCH_X, y: NODE_Y.solutionBranches },
      data: processData(getProcess("solucion-no-disponible")),
      draggable: false,
    },
    {
      id: "prioritario",
      type: "decision",
      position: { x: RIGHT_BRANCH_X + 30, y: NODE_Y.prioritario },
      data: decisionData(
        "¿Qué nivel de atención requiere?",
        "Determina si el caso avanza por atención estándar o especializada.",
        "priority",
      ),
      draggable: false,
    },
    {
      id: "atencion-estandar",
      type: "process",
      position: { x: ATTENTION_LEFT_X, y: NODE_Y.priorityBranches },
      data: processData(getProcess("atencion-estandar")),
      draggable: false,
    },
    {
      id: "atencion-especializada",
      type: "process",
      position: { x: ATTENTION_RIGHT_X, y: NODE_Y.priorityBranches },
      data: processData(getProcess("atencion-especializada")),
      draggable: false,
    },
    {
      id: "investigacion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.investigacion },
      data: processData(getProcess("investigacion")),
      draggable: false,
    },
    ...(processMap.has("solucion-disponible")
      ? [
          {
            id: "solucion-disponible",
            type: "process" as const,
            position: { x: MAIN_X, y: NODE_Y.execution },
            data: processData(getProcess("solucion-disponible")),
            draggable: false,
          },
        ]
      : []),
    {
      id: "validacion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.validacion },
      data: processData(getProcess("validacion")),
      draggable: false,
    },
    {
      id: "cobro",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.cobro },
      data: processData(getProcess("cobro")),
      draggable: false,
    },
    {
      id: "documentacion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.documentacion },
      data: processData(getProcess("documentacion")),
      draggable: false,
    },
    {
      id: "confirmacion",
      type: "process",
      position: { x: MAIN_X, y: NODE_Y.confirmacion },
      data: processData(getProcess("confirmacion")),
      draggable: false,
    },
    {
      id: "fin",
      type: "terminal",
      position: { x: terminalX, y: NODE_Y.fin },
      data: terminalData("FIN", "Cierre del flujo general de atención."),
      draggable: false,
    },
  ];
}

const baseWorkflowEdges: AuditWorkflowEdge[] = [
  {
    id: "e-inicio-recepcion",
    source: "inicio",
    target: "recepcion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-recepcion-clasificacion",
    source: "recepcion",
    target: "clasificacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-clasificacion-investigacion",
    source: "clasificacion",
    target: "investigacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-investigacion-solucion",
    source: "investigacion",
    target: "solucion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-solucion-no-disponible",
    source: "solucion",
    target: "solucion-no-disponible",
    sourceHandle: "source-left",
    targetHandle: "target-top",
    type: "smoothstep",
    label: "No",
  },
  {
    id: "e-solucion-prioritario",
    source: "solucion",
    target: "prioritario",
    sourceHandle: "source-right",
    targetHandle: "target-top",
    type: "smoothstep",
    label: "Sí",
  },
  {
    id: "e-prioritario-estandar",
    source: "prioritario",
    target: "atencion-estandar",
    sourceHandle: "source-left",
    targetHandle: "target-top",
    type: "smoothstep",
    label: "Estándar",
  },
  {
    id: "e-prioritario-especializada",
    source: "prioritario",
    target: "atencion-especializada",
    sourceHandle: "source-right",
    targetHandle: "target-top",
    type: "smoothstep",
    label: "Especializada",
  },
  {
    id: "e-estandar-validacion",
    source: "atencion-estandar",
    target: "validacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-left",
    type: "smoothstep",
  },
  {
    id: "e-especializada-validacion",
    source: "atencion-especializada",
    target: "validacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-right",
    type: "smoothstep",
  },
  {
    id: "e-no-disponible-validacion",
    source: "solucion-no-disponible",
    target: "validacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-left",
    type: "smoothstep",
  },
  {
    id: "e-validacion-cobro",
    source: "validacion",
    target: "cobro",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-cobro-documentacion",
    source: "cobro",
    target: "documentacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-documentacion-confirmacion",
    source: "documentacion",
    target: "confirmacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
  {
    id: "e-confirmacion-fin",
    source: "confirmacion",
    target: "fin",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
];

const legacyExecutionEdges: AuditWorkflowEdge[] = [
  {
    id: "e-estandar-disponible",
    source: "atencion-estandar",
    target: "solucion-disponible",
    sourceHandle: "source-bottom",
    targetHandle: "target-left",
    type: "smoothstep",
  },
  {
    id: "e-especializada-disponible",
    source: "atencion-especializada",
    target: "solucion-disponible",
    sourceHandle: "source-bottom",
    targetHandle: "target-right",
    type: "smoothstep",
  },
  {
    id: "e-disponible-validacion",
    source: "solucion-disponible",
    target: "validacion",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    type: "smoothstep",
  },
];

export const workflowEdges = baseWorkflowEdges;

export function createWorkflowEdges(
  processes: ProcessDefinition[],
): AuditWorkflowEdge[] {
  const hasExecutionNode = processes.some(
    (process) => process.id === "solucion-disponible",
  );

  if (!hasExecutionNode) {
    return baseWorkflowEdges;
  }

  return [
    ...baseWorkflowEdges.filter(
      (edge) =>
        edge.id !== "e-estandar-validacion" &&
        edge.id !== "e-especializada-validacion",
    ),
    ...legacyExecutionEdges,
  ];
}
