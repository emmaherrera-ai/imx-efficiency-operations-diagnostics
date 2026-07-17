"use client";

import { getActiveProcessSequence, getProcessApplicability } from "@/lib/auditFlow";
import { getWorkflowVersion, processStatusLabelsEs } from "@/lib/uiLabels";
import type { AuditRun, ProcessDefinition, ProcessStatus } from "@/types/audit";

type PrintableWorkflowDiagramProps = {
  run: AuditRun;
  processes: ProcessDefinition[];
  pageIndex: number;
};

type Point = {
  x: number;
  y: number;
};

type PrintNode = {
  id: string;
  kind: "terminal" | "process" | "decision" | "continuation";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  processId?: string;
};

type PrintEdge = {
  id: string;
  points: Point[];
  label?: string;
  active: boolean;
  notApplicable?: boolean;
};

type DiagramPage = {
  nodes: PrintNode[];
  edges: PrintEdge[];
};

const pageWidth = 1047;
const pageHeight = 602;
const processWidth = 260;
const processHeight = 112;
const terminalWidth = 148;
const terminalHeight = 46;
const decisionSize = 122;

const colors = {
  active: "#38d8ff",
  amber: "#f8cc6a",
  bg: "#03101e",
  card: "#071526",
  cardMuted: "#0a1726",
  critical: "#ff6b6b",
  grid: "#0d3a54",
  lineMuted: "#5b7187",
  text: "#edf7ff",
  textMuted: "#9fb4c8",
  white: "#ffffff",
} as const;

export function PrintableWorkflowDiagram({
  pageIndex,
  processes,
  run,
}: PrintableWorkflowDiagramProps) {
  const pages = buildDiagramPages(run);
  const page = pages[pageIndex] ?? pages[0];
  const activeProcessIds = new Set(getActiveProcessSequence(run));

  return (
    <div className="pdf-flow-print" data-pdf-flow-page>
      <svg
        aria-label={`Flujo Operativo ${pageIndex + 1} de ${pages.length}`}
        className="pdf-flow-svg"
        role="img"
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      >
        <defs>
          <pattern
            height="28"
            id={`pdf-grid-${pageIndex}`}
            patternUnits="userSpaceOnUse"
            width="28"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              opacity="0.62"
              stroke={colors.grid}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect fill={colors.bg} height={pageHeight} width={pageWidth} x="0" y="0" />
        <rect
          fill={`url(#pdf-grid-${pageIndex})`}
          height={pageHeight}
          width={pageWidth}
          x="0"
          y="0"
        />
        <rect
          fill="none"
          height={pageHeight - 2}
          stroke="#d6e2ec"
          strokeWidth="1"
          width={pageWidth - 2}
          x="1"
          y="1"
        />
        <PageBadge index={pageIndex} total={pages.length} />
        {page.edges.map((edge) => (
          <Connector edge={edge} key={edge.id} />
        ))}
        {page.nodes.map((node) => (
          <NodeShape
            activeProcessIds={activeProcessIds}
            key={node.id}
            node={node}
            processes={processes}
            run={run}
          />
        ))}
      </svg>
    </div>
  );
}

export function getPrintableWorkflowPageCount(run: AuditRun): number {
  return buildDiagramPages(run).length;
}

function buildDiagramPages(run: AuditRun): DiagramPage[] {
  const solutionAvailable = run.selectedSolutionRoute === "available";
  const solutionUnavailable = run.selectedSolutionRoute === "unavailable";
  const standard = run.selectedPriorityRoute === "standard";
  const specialized = run.selectedPriorityRoute === "specialized";
  const includesLegacyExecution =
    getWorkflowVersion(run) !== "3.1" &&
    run.observations.some((observation) => observation.processId === "solucion-disponible");

  return [
    {
      nodes: [
        continuation("scope-1", "Flujo Operativo (1/3)", 34, 24, 210),
        terminal("inicio", "INICIO", 450, 54),
        process("recepcion", "Recepción de Solicitud", 394, 122),
        process("clasificacion", "Clasificación Inicial del Caso", 394, 262),
        process("investigacion", "Investigación y Diagnóstico", 394, 402),
        decision("solucion", "¿Existe una solución disponible?", 464, 508),
      ],
      edges: [
        edge("inicio-recepcion", [{ x: 524, y: 100 }, { x: 524, y: 122 }], true),
        edge("recepcion-clasificacion", [{ x: 524, y: 234 }, { x: 524, y: 262 }], true),
        edge("clasificacion-investigacion", [{ x: 524, y: 374 }, { x: 524, y: 402 }], true),
        edge("investigacion-solucion", [{ x: 524, y: 514 }, { x: 524, y: 508 }], true),
      ],
    },
    {
      nodes: [
        continuation("scope-2", "Flujo Operativo (2/3)", 34, 24, 210),
        continuation("from-1", "Continuación desde decisión de solución", 324, 24, 400),
        process("solucion-no-disponible", "Gestión de Solución No Disponible", 82, 150),
        decision("prioritario", "¿Qué nivel de atención requiere?", 462, 118),
        process("atencion-estandar", "Atención Estándar", 388, 286),
        process("atencion-especializada", "Atención Especializada", 688, 286),
        ...(includesLegacyExecution
          ? [process("solucion-disponible", "Ejecución de la Solución", 388, 408)]
          : []),
        process("validacion", "Validación con Cliente", 388, 444),
        continuation("to-3", "Continúa en Cobro y Cierre", 720, 520, 260),
      ],
      edges: [
        edge(
          "solution-no",
          [
            { x: 524, y: 86 },
            { x: 212, y: 86 },
            { x: 212, y: 150 },
          ],
          solutionUnavailable,
          "No",
          !solutionUnavailable,
        ),
        edge(
          "solution-yes",
          [
            { x: 524, y: 86 },
            { x: 524, y: 118 },
          ],
          solutionAvailable,
          "Sí",
          !solutionAvailable,
        ),
        edge(
          "priority-standard",
          [
            { x: 506, y: 240 },
            { x: 506, y: 286 },
          ],
          solutionAvailable && standard,
          "Estándar",
          !(solutionAvailable && standard),
        ),
        edge(
          "priority-specialized",
          [
            { x: 586, y: 178 },
            { x: 818, y: 178 },
            { x: 818, y: 286 },
          ],
          solutionAvailable && specialized,
          "Especializada",
          !(solutionAvailable && specialized),
        ),
        edge(
          "no-validation",
          [
            { x: 342, y: 206 },
            { x: 360, y: 206 },
            { x: 360, y: 500 },
            { x: 388, y: 500 },
          ],
          solutionUnavailable,
          undefined,
          !solutionUnavailable,
        ),
        edge(
          "standard-validation",
          includesLegacyExecution
            ? [
                { x: 518, y: 398 },
                { x: 518, y: 408 },
              ]
            : [
                { x: 518, y: 398 },
                { x: 518, y: 444 },
              ],
          solutionAvailable && standard,
          undefined,
          !(solutionAvailable && standard),
        ),
        edge(
          "specialized-validation",
          [
            { x: 818, y: 398 },
            { x: 818, y: 500 },
            { x: 648, y: 500 },
          ],
          solutionAvailable && specialized,
          undefined,
          !(solutionAvailable && specialized),
        ),
        ...(includesLegacyExecution
          ? [
              edge(
                "execution-validation",
                [
                  { x: 518, y: 520 },
                  { x: 518, y: 444 },
                ],
                solutionAvailable,
                undefined,
                !solutionAvailable,
              ),
            ]
          : []),
        edge("validation-next", [{ x: 648, y: 500 }, { x: 720, y: 540 }], true),
      ],
    },
    {
      nodes: [
        continuation("scope-3", "Flujo Operativo (3/3)", 34, 24, 210),
        continuation("from-2", "Continuación desde Validación con Cliente", 324, 24, 420),
        process("cobro", "Cobro del Servicio", 394, 124),
        process("documentacion", "Documentación Administrativa", 394, 264),
        process("confirmacion", "Confirmación Final y Encuesta de Satisfacción", 394, 404),
        terminal("fin", "FIN", 450, 540),
      ],
      edges: [
        edge("start-cobro", [{ x: 524, y: 86 }, { x: 524, y: 124 }], true),
        edge("cobro-documentacion", [{ x: 524, y: 236 }, { x: 524, y: 264 }], true),
        edge("documentacion-confirmacion", [{ x: 524, y: 376 }, { x: 524, y: 404 }], true),
        edge("confirmacion-fin", [{ x: 524, y: 516 }, { x: 524, y: 540 }], true),
      ],
    },
  ];
}

function terminal(id: string, label: string, x: number, y: number): PrintNode {
  return { id, kind: "terminal", label, x, y, width: terminalWidth, height: terminalHeight };
}

function continuation(
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
): PrintNode {
  return { id, kind: "continuation", label, x, y, width, height: 42 };
}

function process(processId: string, label: string, x: number, y: number): PrintNode {
  return {
    id: processId,
    kind: "process",
    label,
    processId,
    x,
    y,
    width: processWidth,
    height: processHeight,
  };
}

function decision(id: string, label: string, x: number, y: number): PrintNode {
  return { id, kind: "decision", label, x, y, width: decisionSize, height: decisionSize };
}

function edge(
  id: string,
  points: Point[],
  active: boolean,
  label?: string,
  notApplicable?: boolean,
): PrintEdge {
  return { id, points, active, label, notApplicable };
}

function PageBadge({ index, total }: { index: number; total: number }) {
  return (
    <g>
      <rect fill={colors.card} height="30" rx="15" stroke={colors.active} width="170" x="846" y="22" />
      <text
        fill={colors.white}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="800"
        textAnchor="middle"
        x="931"
        y="42"
      >
        Flujo Operativo ({index + 1}/{total})
      </text>
    </g>
  );
}

function Connector({ edge }: { edge: PrintEdge }) {
  const stroke = edge.active ? colors.active : colors.lineMuted;
  const strokeWidth = edge.active ? 4 : 2;
  const opacity = edge.active ? 1 : 0.5;
  const arrow = buildArrow(edge.points);
  const labelPoint = getLabelPoint(edge.points);

  return (
    <g>
      <polyline
        fill="none"
        opacity={opacity}
        points={edge.points.map((point) => `${point.x},${point.y}`).join(" ")}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      {arrow ? (
        <polygon
          fill={stroke}
          opacity={opacity}
          points={arrow.map((point) => `${point.x},${point.y}`).join(" ")}
        />
      ) : null}
      {edge.label ? (
        <g>
          <rect
            fill={colors.card}
            height="26"
            rx="13"
            stroke={edge.active ? colors.active : colors.lineMuted}
            width={edge.notApplicable ? 124 : 102}
            x={labelPoint.x - (edge.notApplicable ? 62 : 51)}
            y={labelPoint.y - 18}
          />
          <text
            fill={colors.white}
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="14"
            fontWeight="900"
            textAnchor="middle"
            x={labelPoint.x}
            y={labelPoint.y}
          >
            {edge.notApplicable ? `${edge.label} · N/A` : edge.label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function NodeShape({
  activeProcessIds,
  node,
  processes,
  run,
}: {
  activeProcessIds: Set<string>;
  node: PrintNode;
  processes: ProcessDefinition[];
  run: AuditRun;
}) {
  if (node.kind === "terminal") {
    return <TerminalNode node={node} />;
  }

  if (node.kind === "decision") {
    return <DecisionNode node={node} />;
  }

  if (node.kind === "continuation") {
    return <ContinuationShape node={node} />;
  }

  const process = processes.find((item) => item.id === node.processId);
  if (!process) {
    return null;
  }

  const observation = run.observations.find(
    (item) => item.processId === node.processId,
  );
  const applicability = node.processId
    ? getProcessApplicability(run, node.processId)
    : "applicable";
  const isNotApplicable =
    applicability === "not_applicable" || observation?.isApplicable === false;
  const status: ProcessStatus =
    observation && observation.finalScore !== null && observation.isApplicable
      ? observation.status
      : process.status;
  const isActive =
    node.processId !== undefined && activeProcessIds.has(node.processId) && !isNotApplicable;
  const border = statusColor(status);
  const fill = isActive ? colors.card : colors.cardMuted;
  const opacity = isActive ? 1 : 0.72;

  return (
    <g opacity={opacity}>
      <rect
        fill={fill}
        height={node.height}
        rx="6"
        stroke={isNotApplicable ? colors.lineMuted : border}
        strokeWidth="2"
        width={node.width}
        x={node.x}
        y={node.y}
      />
      <text
        fill={colors.textMuted}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10"
        fontWeight="900"
        x={node.x + 14}
        y={node.y + 20}
      >
        {truncate(process.department.toUpperCase(), 24)}
      </text>
      <text
        fill={isNotApplicable ? colors.textMuted : border}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10"
        fontWeight="900"
        textAnchor="end"
        x={node.x + node.width - 14}
        y={node.y + 20}
      >
        {isNotApplicable ? "N/A" : processStatusLabelsEs[status].toUpperCase()}
      </text>
      <WrappedText
        fill={colors.text}
        fontSize={16}
        fontWeight={800}
        lines={wrapText(process.name, 26, 2)}
        x={node.x + 14}
        y={node.y + 46}
      />
      <Metric label="ESTÁNDAR" value={`${process.standardMinutes} min`} x={node.x + 14} y={node.y + 72} />
      <Metric
        label="REAL"
        value={
          observation?.actualTime !== null && observation?.actualTime !== undefined
            ? `${observation.actualTime} min`
            : "N/A"
        }
        x={node.x + 96}
        y={node.y + 72}
      />
      <Metric
        label="DESVIACIÓN"
        value={
          observation?.timeDifference !== null &&
          observation?.timeDifference !== undefined
            ? `${observation.timeDifference} min`
            : "N/A"
        }
        x={node.x + 178}
        y={node.y + 72}
      />
      {(observation?.notes || observation?.nonApplicableReason) ? (
        <text
          fill={colors.textMuted}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="9"
          fontWeight="800"
          x={node.x + 14}
          y={node.y + 104}
        >
          CON OBSERVACIÓN
        </text>
      ) : null}
    </g>
  );
}

function TerminalNode({ node }: { node: PrintNode }) {
  return (
    <g>
      <rect
        fill="#0b5164"
        height={node.height}
        rx={node.height / 2}
        stroke={colors.active}
        strokeWidth="2"
        width={node.width}
        x={node.x}
        y={node.y}
      />
      <text
        fill={colors.white}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="17"
        fontWeight="900"
        textAnchor="middle"
        x={node.x + node.width / 2}
        y={node.y + 29}
      >
        {node.label}
      </text>
    </g>
  );
}

function DecisionNode({ node }: { node: PrintNode }) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;

  return (
    <g>
      <polygon
        fill={colors.card}
        points={`${cx},${node.y} ${node.x + node.width},${cy} ${cx},${
          node.y + node.height
        } ${node.x},${cy}`}
        stroke={colors.active}
        strokeWidth="2"
      />
      <WrappedText
        fill={colors.text}
        fontSize={14}
        fontWeight={900}
        lines={wrapText(node.label, 17, 3)}
        textAnchor="middle"
        x={cx}
        y={cy - 14}
      />
    </g>
  );
}

function ContinuationShape({ node }: { node: PrintNode }) {
  return (
    <g>
      <rect
        fill="#06192b"
        height={node.height}
        rx="21"
        stroke={colors.active}
        strokeDasharray="7 5"
        strokeWidth="2"
        width={node.width}
        x={node.x}
        y={node.y}
      />
      <text
        fill={colors.text}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="900"
        textAnchor="middle"
        x={node.x + node.width / 2}
        y={node.y + 26}
      >
        {node.label}
      </text>
    </g>
  );
}

function Metric({
  label,
  value,
  x,
  y,
}: {
  label: string;
  value: string;
  x: number;
  y: number;
}) {
  return (
    <g>
      <rect fill="#081d30" height="28" stroke="#16364f" width="70" x={x} y={y} />
      <text
        fill={colors.textMuted}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7"
        fontWeight="900"
        x={x + 6}
        y={y + 10}
      >
        {label}
      </text>
      <text
        fill={colors.white}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="12"
        fontWeight="900"
        x={x + 6}
        y={y + 23}
      >
        {value}
      </text>
    </g>
  );
}

function WrappedText({
  fill,
  fontSize,
  fontWeight,
  lines,
  textAnchor = "start",
  x,
  y,
}: {
  fill: string;
  fontSize: number;
  fontWeight: number;
  lines: string[];
  textAnchor?: "middle" | "start";
  x: number;
  y: number;
}) {
  return (
    <text
      fill={fill}
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      x={x}
      y={y}
    >
      {lines.map((line, index) => (
        <tspan dy={index === 0 ? 0 : fontSize + 3} key={line} x={x}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function getLabelPoint(points: Point[]): Point {
  const middleIndex = Math.max(0, Math.floor((points.length - 1) / 2));
  const start = points[middleIndex];
  const end = points[middleIndex + 1] ?? points[middleIndex];

  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 8,
  };
}

function buildArrow(points: Point[]): Point[] | null {
  if (points.length < 2) {
    return null;
  }

  const end = points[points.length - 1];
  const previous = points[points.length - 2];
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  const size = 12;
  const wing = Math.PI / 7;

  return [
    end,
    {
      x: end.x - size * Math.cos(angle - wing),
      y: end.y - size * Math.sin(angle - wing),
    },
    {
      x: end.x - size * Math.cos(angle + wing),
      y: end.y - size * Math.sin(angle + wing),
    },
  ];
}

function statusColor(status: ProcessStatus) {
  if (status === "optimal") {
    return colors.active;
  }

  if (status === "improvable") {
    return colors.amber;
  }

  if (status === "critical") {
    return colors.critical;
  }

  return colors.lineMuted;
}

function wrapText(text: string, maxLength: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];

  words.forEach((word) => {
    const current = lines[lines.length - 1];
    if (!current) {
      lines.push(word);
      return;
    }

    if (`${current} ${word}`.length <= maxLength) {
      lines[lines.length - 1] = `${current} ${word}`;
      return;
    }

    if (lines.length < maxLines) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = truncate(`${lines[lines.length - 1]} ${word}`, maxLength);
    }
  });

  return lines;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}
