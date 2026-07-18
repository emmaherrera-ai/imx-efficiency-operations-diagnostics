"use client";

import type { ReactNode, RefObject } from "react";
import {
  getPrintableWorkflowPageCount,
  PrintableWorkflowDiagram,
} from "@/components/audit/PrintableWorkflowDiagram";
import { getApplicableProcessIds } from "@/lib/auditCalculations";
import { getProcessOrderForRun } from "@/lib/auditFlow";
import {
  buildDefaultPdfReportContent,
  type PdfReportContent,
} from "@/lib/pdfReportContent";
import { getRunSummary } from "@/lib/runSummary";
import { applyRunSnapshotToProcesses } from "@/lib/standards";
import {
  getWorkflowName,
  processStatusLabelsEs,
  statusLabelsEs,
} from "@/lib/uiLabels";
import type { AuditRun, ProcessStatus } from "@/types/audit";

type ExecutivePdfReportProps = {
  run: AuditRun;
  containerRef: RefObject<HTMLDivElement | null>;
  reportContent?: PdfReportContent;
};

const statusClassName: Record<ProcessStatus, string> = {
  optimal: "pdf-status-optimal",
  improvable: "pdf-status-improvable",
  critical: "pdf-status-critical",
  neutral: "pdf-status-neutral",
};

export function ExecutivePdfReport({
  run,
  containerRef,
  reportContent,
}: ExecutivePdfReportProps) {
  const summary = getRunSummary(run);
  const processes = applyRunSnapshotToProcesses(run);
  const applicableProcessIds = getApplicableProcessIds(run);
  const evaluatedObservations = run.observations.filter(
    (observation) =>
      observation.isApplicable &&
      observation.finalScore !== null &&
      applicableProcessIds.includes(observation.processId),
  );
  const averageServiceLevel =
    evaluatedObservations.length === 0
      ? 0
      : round(
          evaluatedObservations.reduce(
            (total, observation) => total + (observation.executionRating ?? 0),
            0,
          ) / evaluatedObservations.length,
        );
  const outOfStandardMinutes = round(
    evaluatedObservations.reduce(
      (total, observation) =>
        total + Math.max(0, observation.timeDifference ?? 0),
      0,
    ),
  );
  const standardCompliance = Math.max(
    0,
    Math.min(100, round(100 - Math.abs(summary.deviationPercent))),
  );
  const effectiveReportContent =
    reportContent ?? buildDefaultPdfReportContent(run, summary.criticalCount);
  const observationPages = buildObservationPages([
    {
      title: "Comentarios del Auditor",
      text: effectiveReportContent.auditorComments,
    },
    {
      title: "Hallazgos relevantes",
      text: effectiveReportContent.relevantFindings,
    },
    { title: "Recomendaciones", text: effectiveReportContent.recommendations },
    { title: "Riesgos detectados", text: effectiveReportContent.risks },
    {
      title: "Acciones sugeridas",
      text: effectiveReportContent.suggestedActions,
    },
  ]);
  const flowPageCount = getPrintableWorkflowPageCount(run);
  const totalPages = 3 + flowPageCount + observationPages.length;
  const detailPageNumber = 2 + flowPageCount;
  const observationsStartPageNumber = detailPageNumber + 1;
  const conclusionPageNumber =
    observationsStartPageNumber + observationPages.length;

  return (
    <div className="pdf-export-stage" aria-hidden="true">
      <div
        className="executive-pdf-document"
        data-workflow-version={run.workflowVersion ?? "1.0"}
        ref={containerRef}
      >
        <PdfPage pageNumber={1} totalPages={totalPages}>
          <header className="pdf-cover-header">
            <div>
              <strong>COREM OPS - EOD</strong>
              <span>Efficiency Operations Diagnostics</span>
            </div>
            <h1>Informe Ejecutivo de Auditoría Operativa</h1>
          </header>

          <section className="pdf-info-grid">
            <InfoItem label="Cliente" value={run.chain} />
            <InfoItem label="Proyecto" value={getWorkflowName(run)} />
            <InfoItem label="Sucursal" value={`${run.store} · ${run.module}`} />
            <InfoItem label="Ciudad" value={run.city} />
            <InfoItem label="Auditor" value={run.auditorName} />
            <InfoItem label="Fecha" value={formatDate(run.date)} />
            <InfoItem label="Hora de inicio" value={formatTime(run.startedAt)} />
            <InfoItem
              label="Hora de término"
              value={run.completedAt ? formatTime(run.completedAt) : "En progreso"}
            />
            <InfoItem
              label="Duración total"
              value={formatDuration(run.startedAt, run.completedAt)}
            />
            <InfoItem label="Estado" value={statusLabelsEs[run.status]} />
          </section>

          <section className="pdf-executive-copy">
            Durante la auditoría se evaluó el flujo operativo completo del
            módulo de servicio, identificando desviaciones respecto al estándar,
            oportunidades de mejora y observaciones relevantes.
          </section>

          <section className="pdf-kpi-grid">
            <KpiCard label="Tiempo Total" value={`${summary.actualMinutes} min`} />
            <KpiCard label="IEO" value={`${summary.averageScore}/100`} />
            <KpiCard
              label="Nivel de Servicio promedio"
              value={`${averageServiceLevel}/10`}
            />
            <KpiCard
              label="Procesos evaluados"
              value={`${summary.capturedCount}/${summary.applicableCount}`}
            />
            <KpiCard label="Procesos críticos" value={`${summary.criticalCount}`} />
            <KpiCard
              label="Tiempo fuera de estándar"
              value={`${outOfStandardMinutes} min`}
            />
            <KpiCard
              label="Cumplimiento del estándar"
              value={`${standardCompliance}%`}
            />
          </section>
        </PdfPage>

        {Array.from({ length: flowPageCount }, (_, index) => (
          <PdfPage
            key={`flow-page-${index}`}
            pageNumber={index + 2}
            totalPages={totalPages}
          >
            <div className="pdf-section-heading">
              <span>Mapa Operativo</span>
              <h2>
                Mapa Operativo de la Auditoría · Flujo Operativo ({index + 1}/
                {flowPageCount})
              </h2>
            </div>
            <PrintableWorkflowDiagram
              pageIndex={index}
              processes={processes}
              run={run}
            />
          </PdfPage>
        ))}

        <PdfPage pageNumber={detailPageNumber} totalPages={totalPages}>
          <div className="pdf-section-heading">
            <span>Detalle</span>
            <h2>Detalle de Procesos</h2>
          </div>
          <table className="pdf-process-table">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Tiempo estándar</th>
                <th>Tiempo registrado</th>
                <th>Desviación</th>
                <th>Experiencia</th>
                <th>Estado</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {getProcessOrderForRun(run).map((processId) => {
                const process = processes.find((item) => item.id === processId);
                const observation = run.observations.find(
                  (item) => item.processId === processId,
                );

                if (!process) {
                  return null;
                }

                return (
                  <tr key={processId}>
                    <td>{process.name}</td>
                    <td>{process.standardMinutes} min</td>
                    <td>
                      {observation?.actualTime !== null &&
                      observation?.actualTime !== undefined
                        ? `${observation.actualTime} min`
                        : "N/A"}
                    </td>
                    <td>
                      {observation?.timeDifference !== null &&
                      observation?.timeDifference !== undefined
                        ? `${observation.timeDifference} min`
                        : "N/A"}
                    </td>
                    <td>
                      {observation?.executionRating
                        ? `${observation.executionRating}/10`
                        : `${process.targetExperience}/10`}
                    </td>
                    <td>
                      <span
                        className={`pdf-status-pill ${
                          statusClassName[observation?.status ?? process.status]
                        }`}
                      >
                        {observation
                          ? observation.isApplicable
                            ? processStatusLabelsEs[observation.status]
                            : "No aplicable"
                          : "Sin registrar"}
                      </span>
                    </td>
                    <td>
                      {observation?.notes ||
                        observation?.nonApplicableReason ||
                        "Sin observaciones."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PdfPage>

        {observationPages.map((observationPage, index) => (
          <PdfPage
            key={`${observationPage.title}-${index}`}
            pageNumber={observationsStartPageNumber + index}
            totalPages={totalPages}
          >
            <div className="pdf-section-heading">
              <span>Observaciones</span>
              <h2>
                Observaciones Generales ({index + 1}/{observationPages.length})
              </h2>
            </div>
            <section className="pdf-observation-page-block">
              <div className="pdf-observation-page-title">
                <h3>{observationPage.title}</h3>
                {observationPage.partCount > 1 ? (
                  <span>
                    Parte {observationPage.partIndex + 1} de{" "}
                    {observationPage.partCount}
                  </span>
                ) : null}
              </div>
              <p>{observationPage.text}</p>
            </section>
          </PdfPage>
        ))}

        <PdfPage pageNumber={conclusionPageNumber} totalPages={totalPages}>
          <div className="pdf-section-heading">
            <span>Cierre</span>
            <h2>Resumen Ejecutivo</h2>
          </div>
          <section className="pdf-conclusion">
            <p>{buildConclusion(summary.averageScore, summary.criticalCount)}</p>
            <strong>Resultado: {summary.conclusion}</strong>
          </section>
          <section className="pdf-signatures">
            <div>
              <span />
              <strong>Firma del Auditor</strong>
            </div>
            <div>
              <span />
              <strong>Firma Responsable Operativo</strong>
            </div>
          </section>
        </PdfPage>
      </div>
    </div>
  );
}

function PdfPage({
  children,
  pageNumber,
  totalPages,
}: {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <section className="pdf-page" data-pdf-page>
      <div className="pdf-page-content">{children}</div>
      <footer className="pdf-footer">
        <span>COREM OPS - EOD</span>
        <strong>Confidencial</strong>
        <span>
          Página {pageNumber} de {totalPages}
        </span>
      </footer>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="pdf-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="pdf-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildConclusion(averageScore: number, criticalCount: number) {
  if (averageScore >= 85 && criticalCount === 0) {
    return "La auditoría identificó que el flujo operativo mantiene un desempeño general dentro del rango esperado, con cumplimiento sólido de estándares y sin procesos críticos relevantes.";
  }

  if (averageScore >= 70) {
    return "La auditoría identificó que el flujo operativo mantiene un desempeño general aceptable, aunque existen oportunidades de mejora relacionadas con tiempos de atención y cumplimiento de estándares.";
  }

  return "La auditoría identificó desviaciones operativas relevantes que requieren atención prioritaria para recuperar eficiencia, consistencia y control del servicio.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(startedAt: string, completedAt?: string) {
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

type ObservationSourceBlock = {
  title: string;
  text: string;
};

type ObservationPageBlock = ObservationSourceBlock & {
  partCount: number;
  partIndex: number;
};

const observationPageCharacterLimit = 1450;

function buildObservationPages(
  blocks: ObservationSourceBlock[],
): ObservationPageBlock[] {
  return blocks.flatMap((block) => {
    const chunks = splitTextIntoPdfPages(
      normalizeObservationText(block.text),
      observationPageCharacterLimit,
    );

    return chunks.map((chunk, index) => ({
      title: block.title,
      text: chunk,
      partCount: chunks.length,
      partIndex: index,
    }));
  });
}

function normalizeObservationText(text: string): string {
  return text.trim() || "Sin información registrada.";
}

function splitTextIntoPdfPages(text: string, characterLimit: number): string[] {
  if (text.length <= characterLimit) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = "";

  paragraphs.forEach((paragraph) => {
    const normalizedParagraph = paragraph.trim();
    if (!normalizedParagraph) {
      return;
    }

    if (
      current.length > 0 &&
      `${current}\n\n${normalizedParagraph}`.length <= characterLimit
    ) {
      current = `${current}\n\n${normalizedParagraph}`;
      return;
    }

    if (normalizedParagraph.length <= characterLimit) {
      if (current) {
        chunks.push(current);
      }
      current = normalizedParagraph;
      return;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    splitLongParagraph(normalizedParagraph, characterLimit).forEach((chunk) => {
      chunks.push(chunk);
    });
  });

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : ["Sin información registrada."];
}

function splitLongParagraph(paragraph: string, characterLimit: number): string[] {
  const chunks: string[] = [];
  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [paragraph];
  let current = "";

  sentences.forEach((sentence) => {
    const trimmedSentence = sentence.trim();

    if (!trimmedSentence) {
      return;
    }

    if (
      current.length > 0 &&
      `${current} ${trimmedSentence}`.length <= characterLimit
    ) {
      current = `${current} ${trimmedSentence}`;
      return;
    }

    if (trimmedSentence.length <= characterLimit) {
      if (current) {
        chunks.push(current);
      }
      current = trimmedSentence;
      return;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    chunks.push(...splitByWords(trimmedSentence, characterLimit));
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitByWords(text: string, characterLimit: number): string[] {
  const chunks: string[] = [];
  let current = "";

  text.split(/\s+/).forEach((word) => {
    if (!current) {
      current = word;
      return;
    }

    if (`${current} ${word}`.length <= characterLimit) {
      current = `${current} ${word}`;
      return;
    }

    chunks.push(current);
    current = word;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
