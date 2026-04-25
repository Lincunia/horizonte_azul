<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";
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
	facturas?: {
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
			.select(
				`
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
			`,
			)
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
			habitaciones: reserva.habitaciones,
		};
		showModal.value = true;
	} else {
		useToast().showMessage(
			"error",
			"No hay factura disponible para esta reserva",
		);
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
		Completada: "status-completed",
	};
	return colors[estado as keyof typeof colors] || "status-pending";
};

const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

onMounted(() => {
	fetchReservations();
});
</script>

<template>
	<main>
		<header class="dashboard">
			<h2>📋 Mis Reservas</h2>
			<p>Historial de todas tus reservas</p>
		</header>

		<LoaderMessage v-if="loading" message="Cargando habitaciones..." />
		<LoaderMessage
			v-else-if="reservations.length === 0"
			message="😕 No tienes reservas aún"
		/>

		<ol v-else>
			<li
				v-for="reserva in reservations"
				:key="reserva.id_reserva"
				class="item-card"
			>
				<header>
					<div class="room-info">
						<span class="room-number"
							>Habitación #{{ reserva.habitaciones.numero }}</span
						>
						<span class="room-type">{{ reserva.habitaciones.tipo }}</span>
					</div>
					<div class="status-badge" :class="getEstadoColor(reserva.estado)">
						{{ reserva.estado }}
					</div>
				</header>

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
					<div>
						<strong>Total:</strong>
						<span>{{ formatCurrency(reserva.costo_total) }}</span>
					</div>

					<button
						v-if="reserva.facturas"
						class="btn-secondary"
						@click="viewInvoice(reserva)"
					>
						📄 Ver Factura
					</button>
				</div>
			</li>
		</ol>

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
	</main>
</template>

<style scoped>


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
	border-radius: 4px;
	font-size: 0.875rem;
	font-weight: 500;
}

.status-pending {
	background: var(--amarillo-principal);
	color: var(--text-h);
}

.status-confirmed {
	background: var(--verde-oscuro);
	color: var(--blanco);
}

.status-cancelled {
	background: var(--rojo);
	color: var(--blanco);
}

.status-completed {
	background: var(--blanco);
	color: var(--text-h);
}

.status-paid {
	background: var(--verde-claro);
	color: var(--text-h);
}

.status-refunded {
	background: var(--rojo);
	color: var(--blanco)o
}

.reservation-body {
	padding: 1.5rem;
}

.dates {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
}

.date-item {
	display: flex;
	justify-content: space-between;
	padding: 0.5rem;
}

.payment-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
	padding: 1rem;
}
</style>
