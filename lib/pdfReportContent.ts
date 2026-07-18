import type { AuditRun } from "@/types/audit";

export type PdfReportContent = {
  auditorComments: string;
  relevantFindings: string;
  recommendations: string;
  risks: string;
  suggestedActions: string;
};

export function buildDefaultPdfReportContent(
  run: AuditRun,
  criticalCount: number,
): PdfReportContent {
  return {
    auditorComments:
      run.generalComments || "Sin comentarios generales registrados.",
    relevantFindings: buildRelevantFindings(run),
    recommendations: buildRecommendations(run, criticalCount),
    risks: buildRisks(run),
    suggestedActions: buildActions(run),
  };
}

function buildRelevantFindings(run: AuditRun) {
  const criticalNotes = run.observations
    .filter((observation) => observation.status === "critical")
    .map((observation) => observation.notes || observation.nonApplicableReason)
    .filter(Boolean);

  if (criticalNotes.length > 0) {
    return criticalNotes.join(" ");
  }

  return run.generalComments || "No se registraron hallazgos críticos específicos.";
}

function buildRecommendations(run: AuditRun, criticalCount: number) {
  if (run.generalComments) {
    return run.generalComments;
  }

  if (criticalCount > 0) {
    return "Priorizar la revisión de procesos críticos y validar acciones correctivas con responsables operativos.";
  }

  return "Mantener monitoreo periódico del flujo y reforzar los estándares operativos vigentes.";
}

function buildRisks(run: AuditRun) {
  const criticalProcesses = run.observations.filter(
    (observation) => observation.status === "critical",
  );

  if (criticalProcesses.length > 0) {
    return "Existen riesgos operativos asociados a procesos críticos, tiempos fuera de estándar o calidad no conforme.";
  }

  return run.generalComments || "No se detectaron riesgos críticos durante la auditoría.";
}

function buildActions(run: AuditRun) {
  if (run.generalComments) {
    return run.generalComments;
  }

  return "Dar seguimiento a las desviaciones identificadas y documentar avances en la siguiente auditoría operativa.";
}
