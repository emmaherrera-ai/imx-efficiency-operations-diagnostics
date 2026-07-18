"use client";

import { useState } from "react";
import type { PdfReportContent } from "@/lib/pdfReportContent";
import type { AuditRun } from "@/types/audit";

type PdfReportContentModalProps = {
  initialContent: PdfReportContent;
  isGenerating: boolean;
  run: AuditRun;
  onCancel: () => void;
  onGenerate: (content: PdfReportContent) => void;
};

const fields = [
  {
    id: "auditorComments",
    label: "Comentarios del Auditor",
    rows: 5,
  },
  {
    id: "relevantFindings",
    label: "Hallazgos relevantes",
    rows: 5,
  },
  {
    id: "recommendations",
    label: "Recomendaciones",
    rows: 5,
  },
  {
    id: "risks",
    label: "Riesgos detectados",
    rows: 4,
  },
  {
    id: "suggestedActions",
    label: "Acciones sugeridas",
    rows: 4,
  },
] satisfies Array<{
  id: keyof PdfReportContent;
  label: string;
  rows: number;
}>;

export function PdfReportContentModal({
  initialContent,
  isGenerating,
  onCancel,
  onGenerate,
  run,
}: PdfReportContentModalProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="detail-overlay pdf-content-overlay">
      <section
        aria-label="Preparar contenido del informe PDF"
        aria-modal="true"
        className="panel-section pdf-content-modal"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p>Informe ejecutivo</p>
            <h2>Preparar Informe PDF</h2>
            <span>{run.id}</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={isGenerating}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>

        <div className="pdf-content-form">
          {fields.map((field) => (
            <label className="pdf-content-field" htmlFor={field.id} key={field.id}>
              <span>{field.label}</span>
              <textarea
                id={field.id}
                rows={field.rows}
                value={content[field.id]}
                onChange={(event) =>
                  setContent((current) => ({
                    ...current,
                    [field.id]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className="pdf-content-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={isGenerating}
            onClick={() => setContent(initialContent)}
          >
            Restaurar sugerencias
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isGenerating}
            onClick={() => onGenerate(content)}
          >
            {isGenerating ? "Generando PDF..." : "Generar Informe PDF"}
          </button>
        </div>
      </section>
    </div>
  );
}
