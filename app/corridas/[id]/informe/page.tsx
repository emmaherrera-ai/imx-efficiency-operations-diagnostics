"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExecutivePdfReport } from "@/components/audit/ExecutivePdfReport";
import { getProcessOrderForRun } from "@/lib/auditFlow";
import {
  buildExecutivePdfFilename,
  downloadExecutivePdf,
} from "@/lib/pdfExport";
import { getRunSummary } from "@/lib/runSummary";
import { readRuns } from "@/lib/storage";
import { applyRunSnapshotToProcesses } from "@/lib/standards";
import {
  getWorkflowVersion,
  paymentTypeLabelsEs,
  priorityRouteLabelsEs,
  processStatusLabelsEs,
  solutionRouteLabelsEs,
  statusLabelsEs,
} from "@/lib/uiLabels";
import type { AuditRun } from "@/types/audit";

type ReportPageProps = {
  params: {
    id: string;
  };
};

export default function AuditReportPage({ params }: ReportPageProps) {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setRuns(readRuns().value);
      setIsReady(true);
    });
  }, []);

  const run = useMemo(
    () => runs.find((item) => item.id === decodeURIComponent(params.id)) ?? null,
    [params.id, runs],
  );

  if (!isReady) {
    return <main className="print-report">Cargando informe...</main>;
  }

  if (!run) {
    return (
      <main className="print-report">
        <h1>Informe no encontrado</h1>
        <p>No se encontró una auditoría local con el ID solicitado.</p>
        <button type="button" onClick={() => window.location.assign("/")}>
          Volver al centro de auditorías
        </button>
      </main>
    );
  }

  const summary = getRunSummary(run);
  const processes = applyRunSnapshotToProcesses(run);
  const paymentObservation = summary.paymentObservation;
  const criticalObservations = run.observations.filter(
    (observation) => observation.status === "critical",
  );

  return (
    <main className="print-report">
      <div className="print-toolbar">
        <button
          type="button"
          disabled={isGeneratingPdf}
          onClick={async () => {
            setIsGeneratingPdf(true);
            await waitForReportRender();

            if (pdfContainerRef.current) {
              await downloadExecutivePdf(
                pdfContainerRef.current,
                buildExecutivePdfFilename(run.id, run.date),
              );
            }

            setIsGeneratingPdf(false);
          }}
        >
          {isGeneratingPdf ? "Generando PDF..." : "Generar Informe PDF"}
        </button>
      </div>
      <ExecutivePdfReport run={run} containerRef={pdfContainerRef} />
      <section className="report-page">
        <header className="report-header">
          <div>
            <strong>EOD</strong>
            <h1>Informe Ejecutivo de Auditoría Operativa</h1>
          </div>
          <span>Generado: {new Date().toLocaleString("es-MX")}</span>
        </header>

        <div className="report-grid">
          <ReportMetric label="Auditoría" value={run.id} />
          <ReportMetric label="Estado" value={statusLabelsEs[run.status]} />
          <ReportMetric label="Flujo" value={getWorkflowVersion(run)} />
          <ReportMetric label="Tienda" value={`${run.store} · ${run.module}`} />
          <ReportMetric label="Operador" value={run.operatorName} />
          <ReportMetric label="Auditor" value={run.auditorName} />
          <ReportMetric
            label="Ruta de atención"
            value={
              run.selectedPriorityRoute
                ? priorityRouteLabelsEs[run.selectedPriorityRoute]
                : "Sin definir"
            }
          />
          <ReportMetric
            label="Disponibilidad"
            value={
              run.selectedSolutionRoute
                ? solutionRouteLabelsEs[run.selectedSolutionRoute]
                : "Sin definir"
            }
          />
          <ReportMetric label="Tiempo estándar" value={`${summary.standardMinutes} min`} />
          <ReportMetric label="Tiempo real" value={`${summary.actualMinutes} min`} />
          <ReportMetric label="Desviación" value={`${summary.deviationPercent}%`} />
          <ReportMetric label="Calificación" value={`${summary.averageScore}`} />
          <ReportMetric label="Óptimos" value={`${summary.optimalCount}`} />
          <ReportMetric label="Mejorables" value={`${summary.improvableCount}`} />
          <ReportMetric label="Críticos" value={`${summary.criticalCount}`} />
          <ReportMetric
            label="Tipo de cobro"
            value={
              paymentObservation?.paymentType
                ? paymentTypeLabelsEs[paymentObservation.paymentType]
                : "Sin registrar"
            }
          />
          <ReportMetric
            label="Monto"
            value={formatCurrency(paymentObservation?.paymentAmount)}
          />
          <ReportMetric label="Conclusión" value={summary.conclusion} />
        </div>

        <section className="report-diagram">
          <h2>Diagrama histórico</h2>
          <div className="report-flow-list">
            {getProcessOrderForRun(run).map((processId, index) => {
              const process = processes.find((item) => item.id === processId);
              const observation = run.observations.find(
                (item) => item.processId === processId,
              );

              if (!process) {
                return null;
              }

              return (
                <article
                  className={`report-node ${
                    observation?.isApplicable === false ? "is-na" : ""
                  }`}
                  key={processId}
                >
                  <span>{index + 1}</span>
                  <strong>{process.name}</strong>
                  <small>
                    {observation
                      ? processStatusLabelsEs[observation.status]
                      : "Sin registrar"}
                  </small>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="report-page report-observations">
        <h2>Observaciones críticas y comentarios</h2>
        <article>
          <h3>Comentarios generales</h3>
          <p>{run.generalComments || "Sin comentarios generales."}</p>
        </article>
        {criticalObservations.length === 0 ? (
          <p>No se registraron procesos críticos.</p>
        ) : (
          criticalObservations.map((observation) => {
            const process = processes.find(
              (item) => item.id === observation.processId,
            );

            return (
              <article key={observation.processId}>
                <h3>{process?.name ?? observation.processId}</h3>
                <p>{observation.notes || "Sin observaciones específicas."}</p>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

async function waitForReportRender() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  await new Promise((resolve) => window.setTimeout(resolve, 900));
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Sin monto";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
