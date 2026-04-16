<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

interface Reserva {
	id_reserva: number;
	fecha_reserva: string;
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	estado: "Pendiente" | "Confirmada" | "Cancelada" | "Completada" | "No_show";
	check_in: string | null;
	check_out: string | null;
	costo_total: number | null;
	penalizacion: number;
	observaciones: string | null;
	id_habitacion: number;
	habitaciones: {
		numero: number;
		tipo: string;
		precio_noche: number;
	};
}

const reservations = ref<Reserva[]>([]);
const loading = ref(true);

const fetchReservations = async () => {
	try {
		const { data: userData } = await supabase.auth.getUser();

		if (!userData.user) {
			throw new Error("Usuario no autenticado");
		}

		const { data, error } = await supabase
			.from("reservas")
			.select(`*, habitaciones ( numero, tipo, precio_noche) `)
			.eq("auth_id_usuario", userData.user.id)
			.order("fecha_inicio", { ascending: false });

		if (error) throw error;
		reservations.value = data || [];
	} catch (error) {
		console.error("Error fetching reservations:", error);
		useToast().showMessage("error", "Error al cargar reservas");
	} finally {
		loading.value = false;
	}
};

const cancelReservation = async (id: number) => {
	if (!confirm("¿Estás seguro de cancelar esta reserva?")) return;

	try {
		const { error } = await supabase
			.from("reservas")
			.update({
				estado: "Cancelada",
				penalizacion: calcularPenalizacion(id),
			})
			.eq("id_reserva", id);

		if (error) throw error;

		useToast().showMessage("success", "Reserva cancelada exitosamente");
		await fetchReservations();
	} catch (error) {
		console.error("Error cancelling reservation:", error);
		useToast().showMessage("error", "Error al cancelar reserva");
	}
};

const calcularPenalizacion = async (id: number) => {
	const reserva = reservations.value.find((r) => r.id_reserva === id);
	if (!reserva) return 0;

	const hoy = new Date();
	const fechaInicio = new Date(reserva.fecha_inicio);
	const diffDays = Math.ceil(
		(fechaInicio.getTime() - hoy.getTime()) / (1000 * 3600 * 24),
	);

	if (diffDays < 2) {
		return reserva.costo_total || 0;
	} else if (diffDays < 7) {
		return (reserva.costo_total || 0) * 0.5;
	}
	return 0;
};

const getEstadoClass = (estado: string) => {
	const classes = {
		Pendiente: "status-pending",
		Confirmada: "status-confirmed",
		Cancelada: "status-cancelled",
		Completada: "status-completed",
		No_show: "status-no-show",
	};
	return classes[estado as keyof typeof classes] || "";
};

const getEstadoTexto = (estado: string) => {
	const textos = {
		Pendiente: "⏳ Pendiente",
		Confirmada: "✅ Confirmada",
		Cancelada: "❌ Cancelada",
		Completada: "🏁 Completada",
		No_show: "🚫 No Show",
	};
	return textos[estado as keyof typeof textos] || estado;
};

const formatearFecha = (fecha: string) => {
	return new Date(fecha).toLocaleDateString("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

const getDiasEstadia = (inicio: string, fin: string) => {
	const start = new Date(inicio);
	const end = new Date(fin);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
};

onMounted(() => {
	fetchReservations();
	useToast().hideMessage();
});
</script>

<template>
	<div class="guest-reservations">
		<div class="reservations-header">
			<h2>📋 Mis Reservas</h2>
			<p class="subtitle">Historial y estado de tus reservas</p>
		</div>

		<div v-if="loading" class="loading">
			<div class="spinner"></div>
			<p>Cargando reservas...</p>
		</div>

		<div v-else-if="reservations.length === 0" class="empty-state">
			<p>📭 No tienes reservas aún</p>
			<router-link to="/guest/dashboard" class="btn btn-primary">
				Ver habitaciones disponibles
			</router-link>
		</div>

		<div v-else class="reservations-list">
			<div
				v-for="reservation in reservations"
				:key="reservation.id_reserva"
				class="reservation-card"
			>
				<div class="reservation-header">
					<div class="room-info">
						<h3>Habitación #{{ reservation.habitaciones.numero }}</h3>
						<span class="room-type">{{ reservation.habitaciones.tipo }}</span>
					</div>
					<span :class="['status-badge', getEstadoClass(reservation.estado)]">
						{{ getEstadoTexto(reservation.estado) }}
					</span>
				</div>

				<div class="reservation-details">
					<div class="detail-row">
						<div class="detail-item">
							<span class="detail-icon">📅</span>
							<div>
								<div class="detail-label">Check-in</div>
								<div class="detail-value">
									{{ formatearFecha(reservation.fecha_inicio) }}
								</div>
							</div>
						</div>
						<div class="detail-item">
							<span class="detail-icon">📅</span>
							<div>
								<div class="detail-label">Check-out</div>
								<div class="detail-value">
									{{ formatearFecha(reservation.fecha_fin) }}
								</div>
							</div>
						</div>
					</div>

					<div class="detail-row">
						<div class="detail-item">
							<span class="detail-icon">👥</span>
							<div>
								<div class="detail-label">Huéspedes</div>
								<div class="detail-value">
									{{ reservation.num_huespedes }} personas
								</div>
							</div>
						</div>
						<div class="detail-item">
							<span class="detail-icon">⏱️</span>
							<div>
								<div class="detail-label">Días de estadía</div>
								<div class="detail-value">
									{{
										getDiasEstadia(
											reservation.fecha_inicio,
											reservation.fecha_fin,
										)
									}}
									noches
								</div>
							</div>
						</div>
					</div>

					<div class="detail-row">
						<div class="detail-item">
							<span class="detail-icon">💰</span>
							<div>
								<div class="detail-label">Costo total</div>
								<div class="detail-value price">
									${{ reservation.costo_total?.toFixed(2) || "0.00" }}
								</div>
							</div>
						</div>
						<div v-if="reservation.penalizacion > 0" class="detail-item">
							<span class="detail-icon">⚠️</span>
							<div>
								<div class="detail-label">Penalización</div>
								<div class="detail-value penalty">
									${{ reservation.penalizacion.toFixed(2) }}
								</div>
							</div>
						</div>
					</div>

					<div v-if="reservation.observaciones" class="observaciones">
						<span class="detail-icon">📝</span>
						<div>
							<div class="detail-label">Observaciones</div>
							<div class="detail-value">{{ reservation.observaciones }}</div>
						</div>
					</div>
				</div>

				<div class="reservation-footer">
					<button
						v-if="
							reservation.estado === 'Pendiente' ||
							reservation.estado === 'Confirmada'
						"
						class="btn btn-danger"
						@click="cancelReservation(reservation.id_reserva)"
					>
						Cancelar Reserva
					</button>
					<div
						v-if="
							reservation.estado === 'Cancelada' && reservation.penalizacion > 0
						"
						class="penalty-note"
					>
						Se aplicó penalización por cancelación tardía
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.guest-reservations {
	padding: 2rem;
	max-width: 1200px;
	margin: 0 auto;
}

.reservations-header {
	text-align: center;
	margin-bottom: 2rem;
}

.reservations-header h2 {
	font-size: 2rem;
	color: #2c3e50;
	margin-bottom: 0.5rem;
}

.subtitle {
	color: #7f8c8d;
}

.reservations-list {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.reservation-card {
	background: white;
	border-radius: 12px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	overflow: hidden;
	transition: transform 0.3s ease;
}

.reservation-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.reservation-header {
	background: #f8f9fa;
	padding: 1.5rem;
	border-bottom: 1px solid #e9ecef;
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 1rem;
}

.room-info h3 {
	margin: 0 0 0.25rem 0;
	color: #2c3e50;
}

.room-type {
	color: #7f8c8d;
	font-size: 0.875rem;
}

.status-badge {
	padding: 0.5rem 1rem;
	border-radius: 20px;
	font-weight: 600;
	font-size: 0.875rem;
}

.status-pending {
	background: #fff3cd;
	color: #856404;
}

.status-confirmed {
	background: #d4edda;
	color: #155724;
}

.status-cancelled {
	background: #f8d7da;
	color: #721c24;
}

.status-completed {
	background: #d1ecf1;
	color: #0c5460;
}

.status-no-show {
	background: #e2e3e5;
	color: #383d41;
}

.reservation-details {
	padding: 1.5rem;
}

.detail-row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 1.5rem;
	margin-bottom: 1rem;
}

.detail-item {
	display: flex;
	gap: 0.75rem;
	align-items: flex-start;
}

.detail-icon {
	font-size: 1.25rem;
}

.detail-label {
	font-size: 0.75rem;
	color: #7f8c8d;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.detail-value {
	font-size: 1rem;
	color: #2c3e50;
	font-weight: 500;
	margin-top: 0.25rem;
}

.price {
	color: #27ae60;
	font-weight: bold;
}

.penalty {
	color: #e74c3c;
}

.observaciones {
	display: flex;
	gap: 0.75rem;
	margin-top: 1rem;
	padding-top: 1rem;
	border-top: 1px solid #e9ecef;
}

.reservation-footer {
	padding: 1rem 1.5rem 1.5rem;
	border-top: 1px solid #e9ecef;
}

.btn-danger {
	background: #e74c3c;
	color: white;
	border: none;
	padding: 0.5rem 1rem;
	border-radius: 6px;
	cursor: pointer;
	font-weight: 600;
	transition: all 0.2s ease;
}

.btn-danger:hover {
	background: #c0392b;
	transform: translateY(-1px);
}

.penalty-note {
	margin-top: 0.5rem;
	font-size: 0.75rem;
	color: #e74c3c;
}

.loading {
	text-align: center;
	padding: 3rem;
}

.spinner {
	border: 3px solid #f3f3f3;
	border-top: 3px solid #667eea;
	border-radius: 50%;
	width: 40px;
	height: 40px;
	animation: spin 1s linear infinite;
	margin: 0 auto 1rem;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.empty-state {
	text-align: center;
	padding: 3rem;
	color: #7f8c8d;
}

.btn-primary {
	display: inline-block;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	text-decoration: none;
	padding: 0.75rem 1.5rem;
	border-radius: 8px;
	margin-top: 1rem;
	transition: transform 0.2s ease;
}

.btn-primary:hover {
	transform: translateY(-2px);
}
</style>
