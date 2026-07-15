"use client";

import { useMemo, useState } from "react";
import {
  buildCapturedObservation,
  buildNotApplicableObservation,
  qualityLabels,
  shouldWarnOmission,
} from "@/lib/auditCalculations";
import {
  getObservation,
  getNextPendingTarget,
  getProcessApplicability,
  getProcessById,
  hasCapturedData,
} from "@/lib/auditFlow";
import {
  getAverageExperience,
  getCriticalCount,
  getExperienceRanking,
  getReferenceStandardMinutes,
  getStatusSummary,
  statusLabels,
} from "@/lib/auditMetrics";
import {
  getWorkflowVersion,
  paymentTypeLabelsEs,
  statusLabelsEs,
  workflowLabels,
} from "@/lib/uiLabels";
import type {
  AuditObservation,
  AuditRun,
  PaymentType,
  PriorityRoute,
  ProcessDefinition,
  ProcessStatus,
  QualityResult,
  SolutionRoute,
  WorkflowNodeData,
} from "@/types/audit";

type AuditSidePanelProps = {
  selectedNode: WorkflowNodeData | null;
  activeRun: AuditRun | null;
  metrics: {
    applicableCount: number;
    capturedCount: number;
    progressPercent: number;
    standardMinutes: number;
    actualMinutes: number;
    optimalCount: number;
    improvableCount: number;
    criticalCount: number;
  };
  nextPendingTarget: string | null;
  onContinueAudit: () => void;
  onSaveObservation: (observation: AuditObservation) => void;
  onPriorityRouteChange: (route: PriorityRoute) => void;
  onSolutionRouteChange: (route: SolutionRoute) => void;
  onCancelRun: () => void;
  onCompleteRun: () => void;
  onGeneralCommentsChange: (comments: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  processes: ProcessDefinition[];
};

const statusClassName: Record<ProcessStatus, string> = {
  optimal: "status-optimal",
  improvable: "status-improvable",
  critical: "status-critical",
  neutral: "status-neutral",
};

export function AuditSidePanel({
  selectedNode,
  activeRun,
  metrics,
  nextPendingTarget,
  onContinueAudit,
  onSaveObservation,
  onPriorityRouteChange,
  onSolutionRouteChange,
  onCancelRun,
  onCompleteRun,
  onGeneralCommentsChange,
  onSelectNode,
  processes,
}: AuditSidePanelProps) {
  if (activeRun && selectedNode?.decisionId) {
    return (
      <DecisionPanel
        run={activeRun}
        selectedNode={selectedNode}
        onPriorityRouteChange={onPriorityRouteChange}
        onSolutionRouteChange={onSolutionRouteChange}
        onSelectNode={onSelectNode}
        onCancelRun={onCancelRun}
      />
    );
  }

  if (activeRun && selectedNode?.kind === "process" && selectedNode.processId) {
    return (
      <ProcessCapturePanel
        key={`${selectedNode.processId}-${getObservation(activeRun, selectedNode.processId)?.capturedAt ?? "draft"}`}
        run={activeRun}
        selectedNode={selectedNode}
        processId={selectedNode.processId}
        onSaveObservation={onSaveObservation}
        onSelectNode={onSelectNode}
        onCancelRun={onCancelRun}
        processes={processes}
      />
    );
  }

  if (activeRun) {
    return (
      <RunSummaryPanel
        run={activeRun}
        metrics={metrics}
        nextPendingTarget={nextPendingTarget}
        onContinueAudit={onContinueAudit}
        onCancelRun={onCancelRun}
        onCompleteRun={onCompleteRun}
        onGeneralCommentsChange={onGeneralCommentsChange}
      />
    );
  }

  if (selectedNode) {
    return <NodeDetailPanel selectedNode={selectedNode} />;
  }

  return <ReferenceSummaryPanel processes={processes} />;
}

function ReferenceSummaryPanel({ processes }: { processes: ProcessDefinition[] }) {
  const totalStandardMinutes = getReferenceStandardMinutes(processes);
  const averageExperience = getAverageExperience(processes);
  const criticalCount = getCriticalCount(processes);
  const summary = getStatusSummary(processes);
  const ranking = getExperienceRanking(processes).slice(0, 5);

  return (
    <aside className="side-panel" aria-label="Resumen del flujo">
      <div className="panel-section panel-hero">
        <p>Resumen operativo</p>
        <h2>Diagnóstico visual MVP 0.1</h2>
        <span>Guadalajara · flujo retail tecnológico</span>
      </div>

      <div className="metric-grid">
        <Metric label="Tiempo estándar total" value={`${totalStandardMinutes} min`} />
        <Metric label="Experiencia promedio" value={`${averageExperience}/10`} />
        <Metric label="Procesos" value={`${processes.length}`} />
        <Metric label="Críticos" value={`${criticalCount}`} emphasis="critical" />
      </div>

      <section className="panel-section">
        <h3>Distribución por estado</h3>
        <div className="status-stack">
          {summary.map((item) => (
            <div key={item.status} className="status-row">
              <span className={`status-dot ${statusClassName[item.status]}`} />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>Ranking por experiencia</h3>
        <ol className="ranking-list">
          {ranking.map((process) => (
            <li key={process.id}>
              <span>{process.name}</span>
              <strong>{process.targetExperience}/10</strong>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function RunSummaryPanel({
  run,
  metrics,
  nextPendingTarget,
  onContinueAudit,
  onCancelRun,
  onCompleteRun,
  onGeneralCommentsChange,
}: Pick<
  AuditSidePanelProps,
  | "metrics"
  | "nextPendingTarget"
  | "onContinueAudit"
  | "onCancelRun"
  | "onCompleteRun"
  | "onGeneralCommentsChange"
> & {
  run: AuditRun;
}) {
  const nextLabel = nextPendingTarget
    ? getProcessById(nextPendingTarget)?.name ??
      (nextPendingTarget === "prioritario"
        ? "Definir nivel de atención"
        : "Definir solución disponible")
    : "Sin pendientes";

  return (
    <aside className="side-panel" aria-label="Resumen de corrida activa">
      <div className="panel-section panel-hero">
        <p>Corrida activa</p>
        <h2>{run.id}</h2>
        <span>
          {run.operatorName} · {run.store} · {run.module}
        </span>
      </div>

      <div className="detail-list">
        <Detail label="Auditor" value={run.auditorName} />
        <Detail label="Turno" value={run.shift} />
        <Detail label="Estado" value={statusLabelsEs[run.status]} />
        <Detail
          label="Versión de flujo"
          value={
            getWorkflowVersion(run) === workflowLabels.legacyVersion
              ? workflowLabels.legacyBadge
              : getWorkflowVersion(run)
          }
        />
        <Detail label="Tiempo transcurrido" value={formatElapsed(run.startedAt)} />
      </div>

      <div className="metric-grid">
        <Metric label="Aplicables" value={`${metrics.applicableCount}`} />
        <Metric label="Capturados" value={`${metrics.capturedCount}`} />
        <Metric label="Progreso" value={`${metrics.progressPercent}%`} />
        <Metric label="Críticos" value={`${metrics.criticalCount}`} emphasis="critical" />
        <Metric label="Tiempo estándar" value={`${metrics.standardMinutes} min`} />
        <Metric label="Tiempo real" value={`${metrics.actualMinutes} min`} />
        <Metric label="Óptimos" value={`${metrics.optimalCount}`} />
        <Metric label="Mejorables" value={`${metrics.improvableCount}`} />
      </div>

      <section className="panel-section">
        <h3>Siguiente pendiente</h3>
        <p className="panel-copy">{nextLabel}</p>
        <button
          type="button"
          className="primary-button full-width"
          onClick={onContinueAudit}
          disabled={run.status !== "in_progress" || nextPendingTarget === null}
        >
          Continuar auditoría
        </button>
      </section>

      <section className="panel-section">
        <h3>Revisión de cierre</h3>
        <p className="panel-copy">
          {nextPendingTarget
            ? "Aún existen pendientes antes de cerrar la corrida."
            : `Lista para cerrar: ${metrics.capturedCount} procesos capturados.`}
        </p>
        <div className="form-field">
          <label htmlFor="generalComments">
            Comentarios generales de la auditoría
          </label>
          <textarea
            id="generalComments"
            value={run.generalComments ?? ""}
            rows={4}
            disabled={run.status !== "in_progress"}
            onChange={(event) => onGeneralCommentsChange(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="primary-button full-width"
          disabled={run.status !== "in_progress" || nextPendingTarget !== null}
          onClick={() => {
            if (
              window.confirm(
                `Cerrar corrida ${run.id} con ${metrics.progressPercent}% de avance y ${metrics.criticalCount} críticos?`,
              )
            ) {
              onCompleteRun();
            }
          }}
        >
          Cerrar corrida
        </button>
      </section>

      <button
        type="button"
        className="danger-button"
        onClick={() => {
          if (
            window.confirm(
              "La corrida se marcará como Cancelada y conservará los datos capturados. ¿Continuar?",
            )
          ) {
            onCancelRun();
          }
        }}
        disabled={run.status === "cancelled"}
      >
        Cancelar corrida
      </button>
    </aside>
  );
}

function DecisionPanel({
  run,
  selectedNode,
  onPriorityRouteChange,
  onSolutionRouteChange,
  onSelectNode,
  onCancelRun,
}: {
  run: AuditRun;
  selectedNode: WorkflowNodeData;
  onPriorityRouteChange: (route: PriorityRoute) => void;
  onSolutionRouteChange: (route: SolutionRoute) => void;
  onSelectNode: (nodeId: string | null) => void;
  onCancelRun: () => void;
}) {
  const isPriority = selectedNode.decisionId === "priority";
  const disabled = run.status !== "in_progress";

  return (
    <aside className="side-panel" aria-label="Selección de ruta">
      <div className="panel-section panel-hero">
        <p>Decisión de ruta</p>
        <h2>{selectedNode.label}</h2>
        <span>{selectedNode.description}</span>
      </div>

      {isPriority ? (
        <DecisionButtons
          disabled={disabled}
          activeValue={run.selectedPriorityRoute}
          options={[
            { value: "standard", label: "Atención Estándar" },
            { value: "specialized", label: "Atención Especializada" },
          ]}
          onSelect={(value) => {
            if (confirmRouteChange(run, "priority", value)) {
              onPriorityRouteChange(value);
              onSelectNode(
                value === "standard"
                  ? "atencion-estandar"
                  : "atencion-especializada",
              );
            }
          }}
        />
      ) : (
        <DecisionButtons
          disabled={disabled}
          activeValue={run.selectedSolutionRoute}
          options={[
            { value: "available", label: "Sí, solución disponible" },
            { value: "unavailable", label: "No, solución no disponible" },
          ]}
          onSelect={(value) => {
            if (confirmRouteChange(run, "solution", value)) {
              onSolutionRouteChange(value);
              onSelectNode(
                value === "available"
                  ? "prioritario"
                  : "solucion-no-disponible",
              );
            }
          }}
        />
      )}
      <CancelRunButton disabled={disabled} onCancelRun={onCancelRun} />
    </aside>
  );
}

function DecisionButtons<TValue extends string>({
  options,
  activeValue,
  disabled,
  onSelect,
}: {
  options: { value: TValue; label: string }[];
  activeValue: TValue | null;
  disabled: boolean;
  onSelect: (value: TValue) => void;
}) {
  return (
    <div className="decision-actions">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`route-button ${
            activeValue === option.value ? "is-active" : ""
          }`}
          disabled={disabled}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ProcessCapturePanel({
  run,
  selectedNode,
  processId,
  onSaveObservation,
  onSelectNode,
  onCancelRun,
  processes,
}: {
  run: AuditRun;
  selectedNode: WorkflowNodeData;
  processId: string;
  onSaveObservation: (observation: AuditObservation) => void;
  onSelectNode: (nodeId: string | null) => void;
  onCancelRun: () => void;
  processes: ProcessDefinition[];
}) {
  const process = getProcessById(processId, processes);
  const observation = getObservation(run, processId);
  const applicability = getProcessApplicability(run, processId);
  const [actualTime, setActualTime] = useState(
    observation?.actualTime?.toString() ?? "",
  );
  const [executionRating, setExecutionRating] = useState(
    observation?.executionRating?.toString() ?? "",
  );
  const [qualityResult, setQualityResult] = useState<QualityResult>(
    observation?.qualityResult ?? "conforme",
  );
  const [notes, setNotes] = useState(observation?.notes ?? "");
  const [isApplicable, setIsApplicable] = useState(
    observation?.isApplicable ?? true,
  );
  const [nonApplicableReason, setNonApplicableReason] = useState(
    observation?.nonApplicableReason ?? "",
  );
  const [paymentType, setPaymentType] = useState<PaymentType | "">(
    observation?.paymentType ?? "",
  );
  const [paymentAmount, setPaymentAmount] = useState(
    observation?.paymentAmount?.toString() ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");

  const omissionWarning = useMemo(() => {
    if (!process || !actualTime) {
      return false;
    }

    return shouldWarnOmission(Number(actualTime), process.standardMinutes);
  }, [actualTime, process]);

  if (!process) {
    return null;
  }

  const canCapture =
    run.status === "in_progress" && applicability === "applicable";

  const save = (continueAfterSave: boolean) => {
    try {
      setSaveError("");
      const nextErrors = validateCapture({
        actualTime,
        executionRating,
        qualityResult,
        notes,
        isApplicable,
        nonApplicableReason,
        processId,
        paymentType,
        paymentAmount,
      });
      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        return;
      }

      const nextObservation = isApplicable
        ? buildCapturedObservation({
            process,
            actualTime: Number(actualTime),
            executionRating: Number(executionRating),
            qualityResult,
            notes: notes.trim(),
            paymentType: processId === "cobro" ? paymentType || null : null,
            paymentAmount:
              processId === "cobro" && paymentAmount !== ""
                ? Number(paymentAmount)
                : processId === "cobro" && paymentType === "sin_costo"
                  ? 0
                  : null,
          })
        : buildNotApplicableObservation({
            processId,
            reason: nonApplicableReason.trim(),
          });

      const simulatedRun: AuditRun = {
        ...run,
        observations: [
          ...run.observations.filter(
            (item) => item.processId !== nextObservation.processId,
          ),
          nextObservation,
        ],
      };

      onSaveObservation(nextObservation);

      if (continueAfterSave) {
        onSelectNode(getNextPendingTarget(simulatedRun));
      }
    } catch (error) {
      console.error("Error al guardar proceso", error);
      setSaveError("No fue posible guardar el proceso. Intenta nuevamente.");
    }
  };

  return (
    <aside className="side-panel" aria-label="Captura por proceso">
      <div className={`detail-status ${statusClassName[selectedNode.status]}`}>
        {observation?.isApplicable === false
          ? "N/A"
          : observation?.finalScore !== null && observation
            ? statusLabels[observation.status]
            : "Pendiente"}
      </div>
      <div className="panel-section panel-hero">
        <p>Captura por proceso</p>
        <h2>{process.name}</h2>
        <span>{process.description}</span>
      </div>

      <div className="detail-list">
        <Detail label="Departamento" value={process.department} />
        <Detail label="Tiempo estándar" value={`${process.standardMinutes} min`} />
        <Detail label="Experiencia objetivo" value={`${process.targetExperience}/10`} />
        <Detail
          label="Estado de captura"
          value={
            observation?.isApplicable === false
              ? "No aplicable"
              : observation?.finalScore !== null && observation
                ? "Capturado"
                : "Pendiente"
          }
        />
      </div>

      {applicability === "blocked" ? (
        <div className="panel-warning">
          Selecciona primero la decisión de ruta correspondiente.
        </div>
      ) : null}

      {applicability === "not_applicable" ? (
        <div className="panel-warning">
          Este proceso pertenece a una ruta no seleccionada.
        </div>
      ) : null}

      {saveError ? <div className="panel-warning">{saveError}</div> : null}

      <form className="capture-form" onSubmit={(event) => event.preventDefault()}>
        <label className="check-row">
          <input
            type="checkbox"
            checked={!isApplicable}
            disabled={!canCapture}
            onChange={(event) => setIsApplicable(!event.target.checked)}
          />
          Marcar como No aplicable
        </label>

        {!isApplicable ? (
          <CaptureField
            label="Motivo de No aplicable"
            value={nonApplicableReason}
            error={errors.nonApplicableReason}
            disabled={!canCapture}
            onChange={setNonApplicableReason}
          />
        ) : (
          <>
            <CaptureField
              label="Tiempo real en minutos"
              value={actualTime}
              error={errors.actualTime}
              disabled={!canCapture}
              type="number"
              onChange={setActualTime}
            />
            {omissionWarning ? (
              <div className="panel-warning">
                Validar posible omisión de actividades.
              </div>
            ) : null}
            <CaptureField
              label="Evaluación de ejecución (1 a 10)"
              value={executionRating}
              error={errors.executionRating}
              disabled={!canCapture}
              type="number"
              onChange={setExecutionRating}
            />
            <div className="form-field">
              <label htmlFor="qualityResult">Calidad</label>
              <select
                id="qualityResult"
                value={qualityResult}
                disabled={!canCapture}
                onChange={(event) =>
                  setQualityResult(event.target.value as QualityResult)
                }
              >
                {Object.entries(qualityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <CaptureField
              label="Observaciones"
              value={notes}
              error={errors.notes}
              disabled={!canCapture}
              multiline
              onChange={setNotes}
            />
            {processId === "cobro" ? (
              <PaymentFields
                paymentType={paymentType}
                paymentAmount={paymentAmount}
                disabled={!canCapture}
                errors={errors}
                onPaymentTypeChange={(value) => {
                  setPaymentType(value);
                  if (value === "sin_costo") {
                    setPaymentAmount("0");
                  }
                }}
                onPaymentAmountChange={setPaymentAmount}
              />
            ) : null}
          </>
        )}

        <div className="capture-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={!canCapture}
            onClick={() => save(false)}
          >
            Guardar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canCapture}
            onClick={() => save(true)}
          >
            Guardar y continuar
          </button>
        </div>
      </form>
      <CancelRunButton
        disabled={run.status === "cancelled"}
        onCancelRun={onCancelRun}
      />
    </aside>
  );
}

function NodeDetailPanel({ selectedNode }: { selectedNode: WorkflowNodeData }) {
  return (
    <aside className="side-panel" aria-label="Detalle del nodo seleccionado">
      <div className={`detail-status ${statusClassName[selectedNode.status]}`}>
        {statusLabels[selectedNode.status]}
      </div>
      <div className="panel-section panel-hero">
        <p>{selectedNode.kind === "process" ? "Proceso seleccionado" : "Nodo seleccionado"}</p>
        <h2>{selectedNode.label}</h2>
        <span>{selectedNode.description}</span>
      </div>

      <div className="detail-list">
        <Detail label="Departamento" value={selectedNode.department ?? "Flujo operativo"} />
        <Detail
          label="Tiempo estándar"
          value={
            selectedNode.standardMinutes
              ? `${selectedNode.standardMinutes} min`
              : "No auditable"
          }
        />
        <Detail
          label="Experiencia objetivo"
          value={
            selectedNode.targetExperience
              ? `${selectedNode.targetExperience}/10`
              : "Referencia visual"
          }
        />
        <Detail label="Estado" value={statusLabels[selectedNode.status]} />
      </div>
    </aside>
  );
}

function CaptureField({
  label,
  value,
  error,
  disabled,
  onChange,
  type = "text",
  multiline = false,
  inputMode,
}: {
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          disabled={disabled}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.1" : undefined}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

function PaymentFields({
  paymentType,
  paymentAmount,
  disabled,
  errors,
  onPaymentTypeChange,
  onPaymentAmountChange,
}: {
  paymentType: PaymentType | "";
  paymentAmount: string;
  disabled: boolean;
  errors: Record<string, string>;
  onPaymentTypeChange: (value: PaymentType) => void;
  onPaymentAmountChange: (value: string) => void;
}) {
  return (
    <div className="payment-fields">
      <div className="form-field">
        <label htmlFor="paymentType">Tipo de cobro</label>
        <select
          id="paymentType"
          value={paymentType}
          disabled={disabled}
          onChange={(event) =>
            onPaymentTypeChange(event.target.value as PaymentType)
          }
        >
          <option value="">Selecciona tipo de cobro</option>
          {Object.entries(paymentTypeLabelsEs).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.paymentType ? (
          <span className="field-error">{errors.paymentType}</span>
        ) : null}
      </div>
      <CaptureField
        label="Monto MXN"
        value={paymentAmount}
        error={errors.paymentAmount}
        disabled={disabled || paymentType === "sin_costo"}
        type="number"
        inputMode="decimal"
        onChange={onPaymentAmountChange}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "critical";
}) {
  return (
    <div className={`metric-card ${emphasis === "critical" ? "is-critical" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CancelRunButton({
  disabled,
  onCancelRun,
}: {
  disabled: boolean;
  onCancelRun: () => void;
}) {
  return (
    <button
      type="button"
      className="danger-button"
      disabled={disabled}
      onClick={() => {
        if (
          window.confirm(
            "La corrida se marcará como Cancelada y conservará los datos capturados. ¿Continuar?",
          )
        ) {
          onCancelRun();
        }
      }}
    >
      Cancelar corrida
    </button>
  );
}

function validateCapture({
  actualTime,
  executionRating,
  qualityResult,
  notes,
  isApplicable,
  nonApplicableReason,
  processId,
  paymentType,
  paymentAmount,
}: {
  actualTime: string;
  executionRating: string;
  qualityResult: QualityResult;
  notes: string;
  isApplicable: boolean;
  nonApplicableReason: string;
  processId: string;
  paymentType: PaymentType | "";
  paymentAmount: string;
}) {
  const errors: Record<string, string> = {};

  if (!isApplicable) {
    if (!nonApplicableReason.trim()) {
      errors.nonApplicableReason = "Captura el motivo de No aplicable.";
    }

    return errors;
  }

  if (!actualTime || Number(actualTime) <= 0) {
    errors.actualTime = "Captura un tiempo real mayor que cero.";
  }

  if (
    !executionRating ||
    Number(executionRating) < 1 ||
    Number(executionRating) > 10
  ) {
    errors.executionRating = "La evaluación debe estar entre 1 y 10.";
  }

  if (
    (qualityResult === "conforme_observaciones" ||
      qualityResult === "no_conforme") &&
    !notes.trim()
  ) {
    errors.notes = "La observación es obligatoria para esta calidad.";
  }

  if (processId === "cobro") {
    if (!paymentType) {
      errors.paymentType = "Selecciona el tipo de cobro.";
    }

    const requiresAmount = [
      "diagnostico",
      "servicio_realizado",
      "anticipo",
    ].includes(paymentType);

    if (paymentType === "sin_costo" && paymentAmount !== "0") {
      errors.paymentAmount = "Para Sin costo, el monto debe ser 0.";
    }

    if (
      requiresAmount &&
      (paymentAmount === "" || Number(paymentAmount) < 0)
    ) {
      errors.paymentAmount = "Captura un monto mayor o igual a 0.";
    }

    if (paymentAmount !== "" && Number(paymentAmount) < 0) {
      errors.paymentAmount = "El monto no puede ser negativo.";
    }
  }

  return errors;
}

function confirmRouteChange(
  run: AuditRun,
  decision: "priority" | "solution",
  nextValue: PriorityRoute | SolutionRoute,
) {
  const currentValue =
    decision === "priority"
      ? run.selectedPriorityRoute
      : run.selectedSolutionRoute;

  if (currentValue === null || currentValue === nextValue) {
    return true;
  }

  const currentProcessId =
    decision === "priority"
      ? currentValue === "standard"
        ? "atencion-estandar"
        : "atencion-especializada"
      : currentValue === "available"
        ? "solucion-disponible"
        : "solucion-no-disponible";

  if (!hasCapturedData(run, currentProcessId)) {
    return true;
  }

  return window.confirm(
    "La ruta anterior tiene datos capturados. Al cambiarla se limpiará esa captura y se marcará como No aplicable. ¿Continuar?",
  );
}

function formatElapsed(startedAt: string) {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} h ${remainingMinutes} min`;
}
