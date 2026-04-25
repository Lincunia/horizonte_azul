import html2pdf from "html2pdf.js";

export function usePDF() {
	const exportarPdf = async (
		filename: string,
		element: HTMLElement | null,
	): Promise<void> => {
		try {
			if (!element) return;
			await html2pdf()
				.set({
					margin: 0.5,
					filename: filename,
					image: { type: "jpeg", quality: 0.98 },
					html2canvas: { scale: 2 },
					jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
				})
				.from(element)
				.save();
		} catch (error) {
			console.error("Error al exportar PDF:", error);
		}
	};

	return {
		exportarPdf,
	};
}
