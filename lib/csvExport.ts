import { getProcessOrderForRun } from "./auditFlow";
import { getRunSummary } from "./runSummary";
import { applyRunSnapshotToProcesses } from "./standards";
import {
  getWorkflowName,
  getWorkflowVersion,
  paymentTypeLabelsEs,
  priorityRouteLabelsEs,
  processStatusLabelsEs,
  qualityLabelsEs,
  solutionRouteLabelsEs,
  statusLabelsEs,
} from "./uiLabels";
import type { AuditRun } from "@/types/audit";

const separator = ",";
const csvDownloadErrorMessage =
  "No fue posible descargar el archivo CSV. Abre la aplicación en Safari o Chrome e intenta nuevamente.";

type CsvBuildResult = {
  csv: string;
  recordCount: number;
};

export function exportRunCsv(run: AuditRun) {
  const { csv, recordCount } = buildRunCsvPayload(run);
  const safeStore = sanitizeFilePart(run.store);
  const filename = `IMX-EOD_${sanitizeFilePart(run.id)}_${safeStore}_${run.date}.csv`;
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });

  console.log("Exportar CSV", {
    filename,
    blobSize: blob.size,
    recordCount,
  });

  downloadBlob(blob, filename, csvDownloadErrorMessage);
}

export function buildRunCsv(run: AuditRun): string {
  return buildRunCsvPayload(run).csv;
}

function buildRunCsvPayload(run: AuditRun): CsvBuildResult {
  const summary = getRunSummary(run);
  const processes = applyRunSnapshotToProcesses(run);
  const exportedProcessOrder = getProcessOrderForRun(run);
  const generalRows = [
    ["Sección", "Campo", "Valor"],
    ["General", "ID de corrida", run.id],
    ["General", "Flujo", getWorkflowName(run)],
    ["General", "Versión de flujo", getWorkflowVersion(run)],
    ["General", "Fecha", run.date],
    ["General", "Ciudad", run.city],
    ["General", "Cadena", run.chain],
    ["General", "Tienda", run.store],
    ["General", "Módulo", run.module],
    ["General", "Operador", run.operatorName],
    ["General", "Auditor", run.auditorName],
    ["General", "Turno", run.shift],
    ["General", "Estado", statusLabelsEs[run.status]],
    ["General", "Fecha y hora de inicio", run.startedAt],
    ["General", "Fecha y hora de cierre", run.completedAt ?? ""],
    ["General", "Versión de estándares", run.standardsVersion ?? "Sin versión"],
    [
      "General",
      "Ruta de atención",
      run.selectedPriorityRoute ? priorityRouteLabelsEs[run.selectedPriorityRoute] : "",
    ],
    [
      "General",
      "Disponibilidad de solución",
      run.selectedSolutionRoute ? solutionRouteLabelsEs[run.selectedSolutionRoute] : "",
    ],
    ["General", "Calificación final", String(summary.averageScore)],
    [
      "General",
      "Tipo de cobro",
      summary.paymentObservation?.paymentType
        ? paymentTypeLabelsEs[summary.paymentObservation.paymentType]
        : "",
    ],
    [
      "General",
      "Monto de cobro MXN",
      valueOrBlank(summary.paymentObservation?.paymentAmount),
    ],
    ["General", "Comentarios generales", run.generalComments ?? ""],
    ["General", "Conclusión", summary.conclusion],
    [],
  ];

  const detailRows = [
    [
      "Orden",
      "Proceso",
      "Departamento",
      "Aplicable",
      "Tiempo estándar",
      "Tiempo real",
      "Diferencia",
      "Desviación %",
      "Evaluación",
      "Calidad",
      "Calificación de tiempo",
      "Calificación de ejecución",
      "Calificación de calidad",
      "Calificación final",
      "Estado",
      "Tipo de cobro",
      "Monto de cobro MXN",
      "Observaciones",
      "Motivo N/A",
      "Fecha captura",
    ],
    ...exportedProcessOrder.map((processId, index) => {
      const process = processes.find((item) => item.id === processId);
      const observation = run.observations.find(
        (item) => item.processId === processId,
      );

      return [
        String(index + 1),
        process?.name ?? processId,
        process?.department ?? "",
        observation?.isApplicable === false ? "No" : "Sí",
        String(process?.standardMinutes ?? ""),
        valueOrBlank(observation?.actualTime),
        valueOrBlank(observation?.timeDifference),
        valueOrBlank(observation?.timeDeviationPercent),
        valueOrBlank(observation?.executionRating),
        observation?.qualityResult ? qualityLabelsEs[observation.qualityResult] : "",
        valueOrBlank(observation?.timeScore),
        valueOrBlank(observation?.executionScore),
        valueOrBlank(observation?.qualityScore),
        valueOrBlank(observation?.finalScore),
        observation?.status ? processStatusLabelsEs[observation.status] : "",
        observation?.paymentType ? paymentTypeLabelsEs[observation.paymentType] : "",
        valueOrBlank(observation?.paymentAmount),
        observation?.notes ?? "",
        observation?.nonApplicableReason ?? "",
        observation?.capturedAt ?? "",
      ];
    }),
  ];

  const csv = [...generalRows, ...detailRows]
    .map((row) => row.map(escapeCell).join(separator))
    .join("\n");

  return {
    csv,
    recordCount: exportedProcessOrder.length,
  };
}

export function downloadJson(filename: string, value: unknown) {
  downloadBlob(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    filename,
  );
}

function downloadBlob(blob: Blob, filename: string, errorMessage?: string) {
  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;

  try {
    if (!document.body) {
      throw new Error("No hay un cuerpo de documento disponible.");
    }

    url = URL.createObjectURL(blob);
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
  } catch (error) {
    console.error("Error al descargar archivo", error);
    window.alert(errorMessage ?? "No fue posible descargar el archivo.");
  } finally {
    if (anchor?.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }

    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

function escapeCell(value: string): string {
  return `"${value.replaceAll('"', '""').replaceAll("\n", " ")}"`;
}

function valueOrBlank(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function sanitizeFilePart(value: string): string {
  return value.trim().replaceAll(/\s+/g, "-").replaceAll(/[^a-zA-Z0-9-_]/g, "");
}
