import type {
  AuditRunStatus,
  PaymentType,
  PriorityRoute,
  ProcessStatus,
  QualityResult,
  SolutionRoute,
} from "@/types/audit";

export const workflowLabels = {
  name: "Flujo General de Atención",
  currentVersion: "3.1",
  legacyVersion: "1.0",
  legacyBadge: "Versión anterior del flujo",
} as const;

export const statusLabelsEs: Record<AuditRunStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const processStatusLabelsEs: Record<ProcessStatus, string> = {
  optimal: "Óptimo",
  improvable: "Mejorable",
  critical: "Crítico",
  neutral: "Neutral",
};

export const qualityLabelsEs: Record<QualityResult, string> = {
  conforme: "Conforme",
  conforme_observaciones: "Conforme con observaciones",
  no_conforme: "No conforme",
};

export const priorityRouteLabelsEs: Record<PriorityRoute, string> = {
  standard: "Atención Estándar",
  specialized: "Atención Especializada",
};

export const solutionRouteLabelsEs: Record<SolutionRoute, string> = {
  available: "Sí, solución disponible",
  unavailable: "No, solución no disponible",
};

export const paymentTypeLabelsEs: Record<PaymentType, string> = {
  diagnostico: "Diagnóstico",
  servicio_realizado: "Servicio realizado",
  anticipo: "Anticipo",
  sin_costo: "Sin costo",
  pendiente: "Pendiente",
};

export function getWorkflowVersion(run: { workflowVersion?: string }): string {
  return run.workflowVersion ?? workflowLabels.legacyVersion;
}

export function getWorkflowName(run: { workflowName?: string }): string {
  return run.workflowName ?? workflowLabels.name;
}
