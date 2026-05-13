export type Role = "Huesped" | "Recepcionista" | "Administrador";

export type ReservationStatus =
	| "Pendiente"
	| "Confirmada"
	| "Cancelada"
	| "Completada"
	| "No_show";

export type RoomType = "Individual" | "Doble" | "Suite" | "Familiar";

export type RoomStatus =
	| "Libre"
	| "Reservada"
	| "Ocupada"
	| "Mantenimiento"
	| "Limpieza";

export type ReportType =
	| "Ocupación diaria"
	| "Ocupación semanal"
	| "Ingresos periodo"
	| "Lista huespedes";

export type IdentificationType = "CC" | "CE" | "Pasaporte" | "Otro";

export type PaymentMethod =
	| "Efectivo"
	| "Tarjeta crédito"
	| "Tarjeta débito"
	| "Transferencia"
	| "Otro";

export type PaymentStatus =
	| "Pendiente"
	| "Pagado"
	| "Reembolsado"
	| "Cancelado";
