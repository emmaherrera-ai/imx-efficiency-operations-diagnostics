const pdfDownloadErrorMessage =
  "No fue posible generar el informe PDF. Abre la aplicación en Safari o Chrome e intenta nuevamente.";

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

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [1123, 794],
      compress: true,
    });

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2.2,
        useCORS: true,
        logging: false,
        windowWidth: 1123,
        windowHeight: 794,
      });
      const image = canvas.toDataURL("image/jpeg", 0.98);

      if (index > 0) {
        pdf.addPage([1123, 794], "landscape");
      }

      pdf.addImage(image, "JPEG", 0, 0, 1123, 794);
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
