"use client";

import { useState } from "react";
import { processDefinitions } from "@/data/processes";
import { processOrder } from "@/lib/auditFlow";
import { buildBackupPayload, isBackupPayload, replaceAllLocalData } from "@/lib/storage";
import { downloadJson } from "@/lib/csvExport";
import type { AuditRun, ProcessStandardConfig } from "@/types/audit";

type StandardsModalProps = {
  isOpen: boolean;
  hasActiveRun: boolean;
  standards: ProcessStandardConfig[];
  runs: AuditRun[];
  onClose: () => void;
  onSave: (standards: ProcessStandardConfig[]) => void;
  onRestoreDefaults: () => void;
  onImportCompleted: () => void;
};

export function StandardsModal({
  isOpen,
  hasActiveRun,
  standards,
  runs,
  onClose,
  onSave,
  onRestoreDefaults,
  onImportCompleted,
}: StandardsModalProps) {
  const [draft, setDraft] = useState(() =>
    standards.map((standard) => ({
      ...standard,
      standardTime: String(standard.standardTime),
      targetExperience: String(standard.targetExperience),
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) {
    return null;
  }

  const update = (
    processId: string,
    field: "standardTime" | "targetExperience",
    value: string,
  ) => {
    setDraft((current) =>
      current.map((item) =>
        item.processId === processId ? { ...item, [field]: value } : item,
      ),
    );
    setErrors((current) => ({ ...current, [`${processId}:${field}`]: "" }));
  };

  const save = () => {
    const nextErrors: Record<string, string> = {};
    const nextStandards = draft.map((item) => {
      const standardTime = Number(item.standardTime);
      const targetExperience = Number(item.targetExperience);

      if (!item.standardTime || standardTime <= 0 || standardTime > 240) {
        nextErrors[`${item.processId}:standardTime`] =
          "Usa un número mayor que 0 y máximo 240.";
      }

      if (!item.targetExperience || targetExperience < 1 || targetExperience > 10) {
        nextErrors[`${item.processId}:targetExperience`] =
          "Usa un valor entre 1 y 10.";
      }

      return {
        ...item,
        standardTime,
        targetExperience,
        updatedAt: new Date().toISOString(),
        scope: "global" as const,
      };
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave(nextStandards);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="run-modal wide-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p>Configuración global</p>
            <h2>Estándares Operativos</h2>
            {hasActiveRun ? (
              <span className="subtle-note">
                Los cambios aplicarán únicamente a nuevas auditorías.
              </span>
            ) : null}
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="standards-table">
          {[...draft]
            .sort(
              (left, right) =>
                processOrder.indexOf(left.processId) -
                processOrder.indexOf(right.processId),
            )
            .map((item) => {
            const process = processDefinitions.find(
              (candidate) => candidate.id === item.processId,
            );

            return (
              <div className="standard-row" key={item.processId}>
                <div>
                  <strong>{process?.name ?? item.processId}</strong>
                  <span>{process?.department}</span>
                </div>
                <label>
                  Tiempo estándar
                  <input
                    type="number"
                    min="0.1"
                    max="240"
                    step="0.1"
                    value={item.standardTime}
                    onChange={(event) =>
                      update(item.processId, "standardTime", event.target.value)
                    }
                  />
                  {errors[`${item.processId}:standardTime`] ? (
                    <span className="field-error">
                      {errors[`${item.processId}:standardTime`]}
                    </span>
                  ) : null}
                </label>
                <label>
                  Experiencia objetivo
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={item.targetExperience}
                    onChange={(event) =>
                      update(item.processId, "targetExperience", event.target.value)
                    }
                  />
                  {errors[`${item.processId}:targetExperience`] ? (
                    <span className="field-error">
                      {errors[`${item.processId}:targetExperience`]}
                    </span>
                  ) : null}
                </label>
              </div>
            );
            })}
        </div>

        <div className="modal-actions stacked-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              if (window.confirm("Restaurar todos los valores iniciales?")) {
                onRestoreDefaults();
                onClose();
              }
            }}
          >
            Restaurar valores iniciales
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              downloadJson(
                `EOD_respaldo_${new Date().toISOString().slice(0, 10)}.json`,
                buildBackupPayload(standards, runs),
              )
            }
          >
            Exportar respaldo JSON
          </button>
          <label className="import-button">
            Importar respaldo JSON
            <input
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                const parsed = JSON.parse(await file.text()) as unknown;
                if (!isBackupPayload(parsed)) {
                  window.alert("El respaldo no tiene una estructura válida.");
                  return;
                }
                if (
                  window.confirm(
                    `El respaldo contiene ${parsed.runs.length} auditorías y ${parsed.standards.length} estándares. ¿Reemplazar datos locales?`,
                  )
                ) {
                  replaceAllLocalData(parsed);
                  onImportCompleted();
                }
              }}
            />
          </label>
          <button type="button" className="primary-button" onClick={save}>
            Guardar estándares
          </button>
        </div>
      </section>
    </div>
  );
}
