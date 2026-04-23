import html2pdf from "html2pdf.js";


export function usePdf() {
  const exportarPdf = async (filename: string,element: HTMLElement | null): Promise<void> => {
    try {
        
        console.log("filename en exportarPdf:", filename);
        console.log("element en exportarPdf:", element);
        
    if (!element) return;
      const options = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("Error al exportar PDF:", error);
    }
  };

  return {
    exportarPdf
  };
}

