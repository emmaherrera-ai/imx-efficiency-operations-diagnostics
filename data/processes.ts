import type { ProcessDefinition } from "@/types/audit";

export const processDefinitions: ProcessDefinition[] = [
  {
    id: "recepcion",
    name: "Recepción de Solicitud",
    department: "Atención al Cliente",
    standardMinutes: 3,
    targetExperience: 94,
    status: "optimal",
    description:
      "Primer contacto, escucha activa y registro inicial de la necesidad del cliente.",
  },
  {
    id: "clasificacion",
    name: "Clasificación Inicial del Caso",
    department: "Atención al Cliente",
    standardMinutes: 4,
    targetExperience: 88,
    status: "optimal",
    description:
      "Identificación del tipo de caso, prioridad operativa y ruta de atención recomendada.",
  },
  {
    id: "atencion-estandar",
    name: "Atención Estándar",
    department: "Soporte N1",
    standardMinutes: 10,
    targetExperience: 78,
    status: "improvable",
    description:
      "Resolución de casos habituales con guías operativas y tiempos controlados.",
  },
  {
    id: "atencion-especializada",
    name: "Atención Especializada",
    department: "Soporte N2",
    standardMinutes: 15,
    targetExperience: 91,
    status: "optimal",
    description:
      "Atención prioritaria con diagnóstico de segundo nivel y mayor profundidad técnica.",
  },
  {
    id: "investigacion",
    name: "Investigación y Diagnóstico",
    department: "Soporte Técnico",
    standardMinutes: 15,
    targetExperience: 72,
    status: "improvable",
    description:
      "Revisión técnica, validación de síntomas y definición de la causa probable.",
  },
  {
    id: "solucion-disponible",
    name: "Ejecución de la Solución",
    department: "Soporte Técnico",
    standardMinutes: 10,
    targetExperience: 86,
    status: "optimal",
    description:
      "Aplicación de la solución disponible y verificación funcional antes de entregar.",
  },
  {
    id: "solucion-no-disponible",
    name: "Gestión de Solución No Disponible",
    department: "Soporte Técnico",
    standardMinutes: 8,
    targetExperience: 58,
    status: "critical",
    description:
      "Escalamiento, explicación al cliente y definición del siguiente paso operativo.",
  },
  {
    id: "validacion",
    name: "Validación con Cliente",
    department: "Atención al Cliente",
    standardMinutes: 4,
    targetExperience: 90,
    status: "optimal",
    description:
      "Confirmación de entendimiento, validación de solución y cierre verbal con cliente.",
  },
  {
    id: "cobro",
    name: "Cobro del Servicio",
    department: "Administración",
    standardMinutes: 5,
    targetExperience: 64,
    status: "critical",
    description:
      "Proceso administrativo de cobro, confirmación de importes y emisión de comprobante.",
  },
  {
    id: "documentacion",
    name: "Documentación Administrativa",
    department: "Administración",
    standardMinutes: 6,
    targetExperience: 76,
    status: "improvable",
    description:
      "Registro de evidencias administrativas, folio, notas y datos relevantes de la visita.",
  },
  {
    id: "confirmacion",
    name: "Confirmación Final y Encuesta de Satisfacción",
    department: "Calidad",
    standardMinutes: 3,
    targetExperience: 92,
    status: "optimal",
    description:
      "Cierre de experiencia, confirmación final y registro de percepción del cliente.",
  },
];
