"use client";

import type { ReactNode, RefObject } from "react";
import { AuditFlowCanvas } from "@/components/workflow/AuditFlowCanvas";
import { getApplicableProcessIds } from "@/lib/auditCalculations";
import { getProcessOrderForRun } from "@/lib/auditFlow";
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
  const relevantFindings = buildRelevantFindings(run);
  const recommendations = buildRecommendations(run, summary.criticalCount);
  const risks = buildRisks(run);
  const actions = buildActions(run);

  return (
    <div className="pdf-export-stage" aria-hidden="true">
      <div className="executive-pdf-document" ref={containerRef}>
        <PdfPage pageNumber={1}>
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

        <PdfPage pageNumber={2}>
          <div className="pdf-section-heading">
            <span>Mapa Operativo</span>
            <h2>Mapa Operativo de la Auditoría</h2>
          </div>
          <div className="pdf-flow-capture">
            <AuditFlowCanvas
              selectedNodeId={null}
              onSelectNode={() => undefined}
              activeFilter="all"
              activeRun={run}
              processes={processes}
              mode="report"
            />
          </div>
        </PdfPage>

        <PdfPage pageNumber={3}>
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

        <PdfPage pageNumber={4}>
          <div className="pdf-section-heading">
            <span>Observaciones</span>
            <h2>Observaciones Generales</h2>
          </div>
          <section className="pdf-comment-block">
            <h3>Comentarios del Auditor</h3>
            <p>{run.generalComments || "Sin comentarios generales registrados."}</p>
          </section>
          <section className="pdf-insight-grid">
            <InsightBlock title="Hallazgos relevantes" text={relevantFindings} />
            <InsightBlock title="Recomendaciones" text={recommendations} />
            <InsightBlock title="Riesgos detectados" text={risks} />
            <InsightBlock title="Acciones sugeridas" text={actions} />
          </section>
        </PdfPage>

        <PdfPage pageNumber={5}>
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
}: {
  children: ReactNode;
  pageNumber: number;
}) {
  return (
    <section className="pdf-page" data-pdf-page>
      <div className="pdf-page-content">{children}</div>
      <footer className="pdf-footer">
        <span>COREM OPS - EOD</span>
        <strong>Confidencial</strong>
        <span>Página {pageNumber} de 5</span>
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

function InsightBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="pdf-insight-block">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
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
