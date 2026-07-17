const pdfDownloadErrorMessage =
  "No fue posible generar el informe PDF. Abre la aplicación en Safari o Chrome e intenta nuevamente.";
const pdfMapRenderErrorMessage = "No fue posible renderizar el mapa operativo.";

export async function downloadExecutivePdf(
  reportElement: HTMLElement,
  filename: string,
) {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const pages = Array.from(
      reportElement.querySelectorAll<HTMLElement>("[data-pdf-page]"),
    );

    if (pages.length === 0) {
      throw new Error("No hay páginas disponibles para exportar.");
    }

    await waitForPrintableReport(reportElement);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [1123, 794],
      compress: true,
    });

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2.4,
        useCORS: true,
        logging: page.querySelector("[data-pdf-flow-page]") !== null,
        windowWidth: 1123,
        windowHeight: 794,
      });

      const hasFlowPage = page.querySelector("[data-pdf-flow-page]") !== null;
      if (hasFlowPage) {
        logFlowPageRenderDiagnostics(page, canvas, index);
      }

      if (canvas.width <= 0 || canvas.height <= 0) {
        if (hasFlowPage) {
          window.alert(pdfMapRenderErrorMessage);
          continue;
        }

        throw new Error("La página PDF no produjo una imagen válida.");
      }

      const image = canvas.toDataURL("image/png");

      if (index > 0) {
        pdf.addPage([1123, 794], "landscape");
      }

      pdf.addImage(image, "PNG", 0, 0, 1123, 794);
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error al generar PDF ejecutivo", error);
    window.alert(pdfDownloadErrorMessage);
  }
}

export function buildExecutivePdfFilename(runId: string, date: string) {
  return `EOD_informe_ejecutivo_${sanitizeFilePart(runId)}_${date}.pdf`;
}

function sanitizeFilePart(value: string): string {
  return value.trim().replaceAll(/\s+/g, "-").replaceAll(/[^a-zA-Z0-9-_]/g, "");
}

async function waitForPrintableReport(reportElement: HTMLElement) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  const flowPages = Array.from(
    reportElement.querySelectorAll<HTMLElement>("[data-pdf-flow-page]"),
  );

  flowPages.forEach((flowPage) => {
    const rect = flowPage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error(pdfMapRenderErrorMessage);
    }
  });
}

function logFlowPageRenderDiagnostics(
  page: HTMLElement,
  canvas: HTMLCanvasElement,
  pageIndex: number,
) {
  const flowPage = page.querySelector<HTMLElement>("[data-pdf-flow-page]");
  const dimensions = flowPage?.getBoundingClientRect();

  console.info("PDF mapa operativo", {
    canvasHeight: canvas.height,
    canvasWidth: canvas.width,
    connectorCount: page.querySelectorAll("polyline").length,
    dimensions: dimensions
      ? {
          height: Math.round(dimensions.height),
          width: Math.round(dimensions.width),
        }
      : null,
    nodeCount: page.querySelectorAll(".pdf-print-node").length,
    pageIndex: pageIndex + 1,
    workflowVersion:
      page.closest<HTMLElement>(".executive-pdf-document")?.dataset.workflowVersion ??
      "unknown",
  });
}
