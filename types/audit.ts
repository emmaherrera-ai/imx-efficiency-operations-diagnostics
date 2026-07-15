import type { Edge, Node, Position } from "@xyflow/react";

export type ProcessStatus = "optimal" | "improvable" | "critical" | "neutral";

export type WorkflowNodeKind = "terminal" | "process" | "decision";

export type StatusFilter = "all" | ProcessStatus;

export type StandardScope = "global" | "chain" | "store" | "module";

export type ProcessStandardConfig = {
  processId: string;
  standardTime: number;
  targetExperience: number;
  updatedAt: string;
  updatedBy?: string;
  scope: StandardScope;
  scopeId?: string;
};

export type StandardsSnapshotItem = {
  processId: string;
  standardTime: number;
  targetExperience: number;
};

export type AuditRunStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PriorityRoute = "standard" | "specialized";

export type SolutionRoute = "available" | "unavailable";

export type PaymentType =
  | "diagnostico"
  | "servicio_realizado"
  | "anticipo"
  | "sin_costo"
  | "pendiente";

export type RouteDecision = {
  priority: PriorityRoute | null;
  solution: SolutionRoute | null;
};

export type ProcessApplicability = "applicable" | "not_applicable" | "blocked";

export type QualityResult =
  | "conforme"
  | "conforme_observaciones"
  | "no_conforme";

export type ProcessDefinition = {
  id: string;
  name: string;
  department: string;
  standardMinutes: number;
  targetExperience: number;
  status: ProcessStatus;
  description: string;
};

export type CaptureStatus = "pending" | "captured" | "not_applicable";

export type ActiveRoute = {
  priorityPath: "standard" | "specialized" | null;
  solutionPath: "available" | "unavailable" | null;
};

export type ProcessReferenceData = ProcessDefinition;

export type ProcessAuditData = {
  processId: string;
  actualMinutes: number | null;
  differenceMinutes: number | null;
  executionScore: number | null;
  captureStatus: CaptureStatus;
  applicable: boolean;
  notApplicableReason: string | null;
};

export type AuditObservation = {
  processId: string;
  actualTime: number | null;
  executionRating: number | null;
  qualityResult: QualityResult | null;
  notes: string;
  isApplicable: boolean;
  nonApplicableReason: string;
  timeDifference: number | null;
  timeDeviationPercent: number | null;
  timeScore: number | null;
  executionScore: number | null;
  qualityScore: number | null;
  finalScore: number | null;
  status: ProcessStatus;
  capturedAt: string;
  paymentType?: PaymentType | null;
  paymentAmount?: number | null;
};

export type AuditRun = {
  id: string;
  workflowName?: string;
  workflowVersion?: string;
  date: string;
  city: "Guadalajara";
  chain: "Liverpool" | "Palacio de Hierro";
  store: string;
  module: string;
  operatorName: string;
  auditorName: string;
  shift: "Apertura" | "Intermedio" | "Cierre";
  initialNotes: string;
  generalComments?: string;
  status: AuditRunStatus;
  startedAt: string;
  completedAt?: string;
  selectedPriorityRoute: PriorityRoute | null;
  selectedSolutionRoute: SolutionRoute | null;
  standardsSnapshot: StandardsSnapshotItem[];
  standardsVersion: string;
  standardsCapturedAt: string;
  observations: AuditObservation[];
};

export type NewAuditRunInput = {
  date: string;
  city: "Guadalajara";
  chain: "Liverpool" | "Palacio de Hierro" | "";
  store: string;
  module: string;
  operatorName: string;
  auditorName: string;
  shift: "Apertura" | "Intermedio" | "Cierre" | "";
  initialNotes: string;
};

export type AuditRunDraft = {
  activeRoute: ActiveRoute;
  processAudits: ProcessAuditData[];
};

export type WorkflowHandleLayout = {
  source: Position;
  target: Position;
  extraSources?: Position[];
  extraTargets?: Position[];
};

export type WorkflowNodeData = {
  label: string;
  kind: WorkflowNodeKind;
  status: ProcessStatus;
  department?: string;
  standardMinutes?: number;
  targetExperience?: number;
  description: string;
  dimmed?: boolean;
  related?: boolean;
  processId?: string;
  decisionId?: "priority" | "solution";
  actualTime?: number | null;
  timeDifference?: number | null;
  captureStatus?: CaptureStatus;
  isApplicable?: boolean;
  effectiveStatus?: ProcessStatus;
  handleLayout: WorkflowHandleLayout;
} & Record<string, unknown>;

export type AuditWorkflowNode = Node<WorkflowNodeData>;

export type AuditWorkflowEdge = Edge;

export type StatusSummary = {
  status: ProcessStatus;
  label: string;
  count: number;
};
