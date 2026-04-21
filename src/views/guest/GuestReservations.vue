<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import Modal from "../../components/Modal.vue";
import InvoiceGuest from "./InvoiceGuest.vue";

interface Reserva {
	id_reserva: number;
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	estado: string;
	costo_total: number;
	habitaciones: {
		numero: number;
		tipo: string;
	};
	factura?: {
		id_factura: number;
		fecha_emision: string;
		subtotal: number;
		impuestos: number;
		total: number;
		metodo_pago: string;
		estado_pago: string;
	};
}

const reservations = ref<Reserva[]>([]);
const loading = ref(true);
const showModal = ref(false);
const selectedFactura = ref<any>(null);
const selectedReserva = ref<any>(null);

const fetchReservations = async () => {
	try {
		const { data: userData } = await supabase.auth.getUser();
		if (!userData.user) {
			useToast().showMessage("error", "Usuario no autenticado");
			return;
		}

		// Obtener reservas del usuario con información de habitación y factura
		const { data, error } = await supabase
			.from("reservas")
			.select(`
				*,
				habitaciones (
					numero,
					tipo
				),
				facturas (
					id_factura,
					fecha_emision,
					subtotal,
					impuestos,
					total,
					metodo_pago,
					estado_pago
				)
			`)
			.eq("auth_id_usuario", userData.user.id)
			.order("fecha_inicio", { ascending: false });

		if (error) throw error;

		reservations.value = data || [];
	} catch (error) {
		console.error("Error fetching reservations:", error);
		useToast().showMessage("error", "Error al cargar tus reservas");
	} finally {
		loading.value = false;
	}
};

const viewInvoice = (reserva: Reserva) => {
	if (reserva.facturas) {
		selectedFactura.value = reserva.facturas;
		selectedReserva.value = {
			...reserva,
			habitaciones: reserva.habitaciones
		};
		showModal.value = true;
	} else {
		useToast().showMessage("error", "No hay factura disponible para esta reserva");
	}
};

const closeModal = () => {
	showModal.value = false;
};


const getEstadoColor = (estado: string) => {
	const colors = {
		Pendiente: "status-pending",
		Confirmada: "status-confirmed",
		Cancelada: "status-cancelled",
		Completada: "status-completed"
	};
	return colors[estado as keyof typeof colors] || "status-pending";
};

const getEstadoPagoColor = (estado: string) => {
	const colors = {
		Pendiente: "status-pending",
		Pagado: "status-paid",
		Reembolsado: "status-refunded",
		Cancelado: "status-cancelled"
	};
	return colors[estado as keyof typeof colors] || "status-pending";
};

const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
};

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
};

onMounted(() => {
	fetchReservations();
});
</script>

<template>
	<div class="guest-reservations">
		<div class="dashboard-header">
			<h2>📋 Mis Reservas</h2>
			<p>Historial de todas tus reservas</p>
		</div>

		<div v-if="loading" class="loading">
			<div class="spinner"></div>
			<p>Cargando tus reservas...</p>
		</div>

		<div v-else-if="reservations.length === 0" class="empty-state">
			<p>😕 No tienes reservas aún</p>
			<p>¡Reserva tu primera habitación ahora!</p>
		</div>

		<div v-else class="reservations-list">
			<div v-for="reserva in reservations" :key="reserva.id_reserva" class="reservation-card">
				<div class="reservation-header">
					<div class="room-info">
						<span class="room-number">Habitación #{{ reserva.habitaciones.numero }}</span>
						<span class="room-type">{{ reserva.habitaciones.tipo }}</span>
					</div>
					<div class="status-badge" :class="getEstadoColor(reserva.estado)">
						{{ reserva.estado }}
					</div>
				</div>

				<div class="reservation-body">
					<div class="dates">
						<div class="date-item">
							<strong>Check-in:</strong>
							<span>{{ formatDate(reserva.fecha_inicio) }}</span>
						</div>
						<div class="date-item">
							<strong>Check-out:</strong>
							<span>{{ formatDate(reserva.fecha_fin) }}</span>
						</div>
						<div class="date-item">
							<strong>Huéspedes:</strong>
							<span>{{ reserva.num_huespedes }} personas</span>
						</div>
					</div>

					<div class="payment-info">
						<div class="total-amount">
							<strong>Total:</strong>
							<span>{{ formatCurrency(reserva.costo_total) }}</span>
						</div>
						<div v-if="reserva.facturas" class="payment-status">
							<strong>Estado pago:</strong>
							<span :class="getEstadoPagoColor(reserva.facturas.estado_pago)">
								{{ reserva.facturas.estado_pago }}
							</span>
						</div>
					</div>

					<div class="reservation-actions">
						<button 
							v-if="reserva.facturas" 
							class="btn btn-secondary" 
							@click="viewInvoice(reserva)"
						>
							📄 Ver Factura
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal de factura -->
		<Modal 
			v-model="showModal" 
			:title="`Factura electrónica`"
			@close="closeModal"
		>
		<InvoiceGuest
			v-if="selectedReserva"
			:factura="selectedFactura"
			:reserva="selectedReserva"
		/>

		</Modal>
	</div>
</template>

<style scoped>
.guest-reservations {
	padding: 2rem;
	max-width: 1200px;
	margin: 0 auto;
}

.dashboard-header {
	text-align: center;
	margin-bottom: 2rem;
}

.dashboard-header h2 {
	font-size: 2rem;
	margin-bottom: 0.5rem;
	color: var(--text-h);
}

.reservations-list {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.reservation-card {
	background: white;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	transition: transform 0.3s ease;
}

.reservation-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
}

.reservation-header {
	background: var(--azul-oscuro);
	padding: 1rem 1.5rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	color: white;
}

.room-info {
	display: flex;
	gap: 1rem;
	align-items: baseline;
}

.room-number {
	font-size: 1.25rem;
	font-weight: bold;
}

.room-type {
	font-size: 0.875rem;
	opacity: 0.9;
}

.status-badge {
	padding: 0.25rem 0.75rem;
	border-radius: 20px;
	font-size: 0.875rem;
	font-weight: 500;
}

.status-pending {
	background: #f39c12;
	color: white;
}

.status-confirmed {
	background: #27ae60;
	color: white;
}

.status-cancelled {
	background: #e74c3c;
	color: white;
}

.status-completed {
	background: #3498db;
	color: white;
}

.status-paid {
	background: #27ae60;
	color: white;
}

.status-refunded {
	background: #95a5a6;
	color: white;
}

.reservation-body {
	padding: 1.5rem;
}

.dates {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 1.5rem;
}

.date-item {
	display: flex;
	justify-content: space-between;
	padding: 0.5rem;
	background: #f8f9fa;
	border-radius: 8px;
}

.payment-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
	padding: 1rem;
	background: #f8f9fa;
	border-radius: 8px;
}

.total-amount span {
	font-size: 1.25rem;
	font-weight: bold;
	color: var(--verde);
}

.payment-status span {
	padding: 0.25rem 0.75rem;
	border-radius: 20px;
	font-size: 0.875rem;
	font-weight: 500;
}

.reservation-actions {
	display: flex;
	justify-content: flex-end;
}

.loading {
	text-align: center;
	padding: 3rem;
}

.spinner {
	border: 3px solid #f3f3f3;
	border-top: 3px solid var(--azul-principal);
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
</style>
