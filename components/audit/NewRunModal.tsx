"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { NewAuditRunInput } from "@/types/audit";

type NewRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateRun: (input: NewAuditRunInput) => void;
};

type NewRunErrors = Partial<Record<keyof NewAuditRunInput, string>>;

const initialInput: NewAuditRunInput = {
  date: new Date().toISOString().slice(0, 10),
  city: "Guadalajara",
  chain: "",
  store: "",
  module: "",
  operatorName: "",
  auditorName: "",
  shift: "",
  initialNotes: "",
};

export function NewRunModal({
  isOpen,
  onClose,
  onCreateRun,
}: NewRunModalProps) {
  const [input, setInput] = useState<NewAuditRunInput>(initialInput);
  const [errors, setErrors] = useState<NewRunErrors>({});

  const draftId = (() => {
    const date = new Date();
    return `AUD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(date.getDate()).padStart(2, "0")}-AUTO`;
  })();

  if (!isOpen) {
    return null;
  }

  const update = (field: keyof NewAuditRunInput, value: string) => {
    setInput((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInput(input);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateRun(input);
    setInput({ ...initialInput, date: new Date().toISOString().slice(0, 10) });
    setErrors({});
  };

  const handleCancel = () => {
    const hasDraft = Object.entries(input).some(([key, value]) => {
      if (key === "date" || key === "city") {
        return false;
      }

      return value.trim().length > 0;
    });

    if (
      hasDraft &&
      !window.confirm("Hay datos registrados en el formulario. ¿Cerrar sin crear la auditoría?")
    ) {
      return;
    }

    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="run-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-run-title"
      >
        <div className="modal-heading">
          <div>
            <p>Nueva auditoría</p>
            <h2 id="new-run-title">Crear auditoría de campo</h2>
          </div>
          <button type="button" className="ghost-button" onClick={handleCancel}>
            Cerrar
          </button>
        </div>

        <form className="run-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>ID automático</label>
            <input value={draftId} disabled />
          </div>
          <FormInput
            label="Fecha"
            type="date"
            value={input.date}
            error={errors.date}
            onChange={(value) => update("date", value)}
          />
          <div className="form-field">
            <label htmlFor="city">Ciudad</label>
            <select
              id="city"
              value={input.city}
              onChange={(event) => update("city", event.target.value)}
            >
              <option value="Guadalajara">Guadalajara</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="chain">Cadena</label>
            <select
              id="chain"
              value={input.chain}
              onChange={(event) => update("chain", event.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Liverpool">Liverpool</option>
              <option value="Palacio de Hierro">Palacio de Hierro</option>
            </select>
            {errors.chain ? <span className="field-error">{errors.chain}</span> : null}
          </div>
          <FormInput
            label="Tienda"
            value={input.store}
            error={errors.store}
            onChange={(value) => update("store", value)}
          />
          <FormInput
            label="Módulo"
            value={input.module}
            error={errors.module}
            onChange={(value) => update("module", value)}
          />
          <FormInput
            label="Nombre del operador"
            value={input.operatorName}
            error={errors.operatorName}
            onChange={(value) => update("operatorName", value)}
          />
          <FormInput
            label="Nombre del auditor"
            value={input.auditorName}
            error={errors.auditorName}
            onChange={(value) => update("auditorName", value)}
          />
          <div className="form-field">
            <label htmlFor="shift">Turno</label>
            <select
              id="shift"
              value={input.shift}
              onChange={(event) => update("shift", event.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Apertura">Apertura</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Cierre">Cierre</option>
            </select>
            {errors.shift ? <span className="field-error">{errors.shift}</span> : null}
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="initialNotes">Observaciones iniciales</label>
            <textarea
              id="initialNotes"
              value={input.initialNotes}
              onChange={(event) => update("initialNotes", event.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={handleCancel}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              Iniciar auditoría
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormInput({
  label,
  value,
  error,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

function validateInput(input: NewAuditRunInput): NewRunErrors {
  const errors: NewRunErrors = {};

  if (!input.chain) {
    errors.chain = "Selecciona una cadena.";
  }

  if (!input.store.trim()) {
    errors.store = "Registra la tienda.";
  }

  if (!input.module.trim()) {
    errors.module = "Registra el módulo.";
  }

  if (!input.operatorName.trim()) {
    errors.operatorName = "Registra el nombre del operador.";
  }

  if (!input.auditorName.trim()) {
    errors.auditorName = "Registra el nombre del auditor.";
  }

  if (!input.shift) {
    errors.shift = "Selecciona el turno.";
  }

  return errors;
}
