export function useMisc() {
	const getBookStateBadgeClass = (estado: string) => {
		const classes = {
			Pendiente: "bg-warning text-dark",
			Confirmada: "bg-success",
			Cancelada: "bg-danger",
			Completada: "bg-info text-dark",
		};
		return classes[estado as keyof typeof classes] || "bg-secondary";
	};
	return {
		getBookStateBadgeClass,
	};
}
