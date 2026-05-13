export function useMisc() {
	const getBookStatusBadgeClass = (estado: string) => {
		const classes = {
			Pendiente: "bg-warning text-dark",
			Confirmada: "bg-success",
			Cancelada: "bg-danger",
			Completada: "bg-info text-dark",
		};
		return classes[estado as keyof typeof classes] || "bg-secondary";
	};

	const getRoomStatusBadgeClass = (estado: string) => {
		const classes = {
			Libre: "bg-success",
			Reservada: "bg-info text-dark",
			Ocupada: "bg-warning text-dark",
			Mantenimiento: "bg-danger",
			Limpieza: "bg-danger-subtle text-dark",
		};
		return classes[estado as keyof typeof classes] || "bg-secondary";
	};

	const getUserRoleBadgeClass = (rol: string) => {
		const classes = {
			Huesped: "bg-success",
			Recepcionista: "bg-info text-dark",
			Administrador: "bg-warning-subtle text-dark",
		};
		return classes[rol as keyof typeof classes] || "bg-secondary";
	};

	const getTypeIcon = (tipo: string) => {
		const icons = {
			Individual: "🛏️",
			Doble: "🛏️🛏️",
			Suite: "👑",
			Familiar: "👨‍👩‍👧‍👦",
		};
		return icons[tipo as keyof typeof icons] || "🏠";
	};

	return {
		getBookStatusBadgeClass,
		getRoomStatusBadgeClass,
		getUserRoleBadgeClass,
		getTypeIcon,
	};
}
