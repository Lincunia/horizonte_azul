<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { useMisc } from "../../composables/useMisc.ts";
import type {
	PaymentMethod,
	PaymentStatus,
	ReservationStatus,
} from "../../composables/dbInformation.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";
import Modal from "../../components/Modal.vue";
import GuestInvoice from "./GuestInvoice.vue";

interface Reserva {
	id_reserva: number;
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	estado: ReservationStatus;
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
		metodo_pago: PaymentMethod;
		estado_pago: PaymentStatus;
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
			useToast().showMessage("alert alert-danger", "Usuario no autenticado");
			return;
		}

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
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar tus reservas",
		);
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
			"alert alert-danger",
			"No hay factura disponible para esta reserva",
		);
	}
};

const closeModal = () => {
	showModal.value = false;
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
	<header class="text-center mb-4">
		<h2>📋 Mis Reservas</h2>
		<p class="text-muted">Historial de todas tus reservas</p>
	</header>

	<LoaderMessage v-if="loading" visible message="Cargando reservas..." />
	<LoaderMessage
		v-else-if="reservations.length === 0"
		message="😕 No tienes reservas aún"
	/>

	<div v-else class="row g-4">
		<div
			v-for="reserva in reservations"
			:key="reserva.id_reserva"
			class="col-12 col-md-6 col-lg-4"
		>
			<div class="card h-100">
				<!-- Header de la tarjeta -->
				<div class="card-header bg-white border-bottom-0 pb-0">
					<div class="d-flex justify-content-between align-items-start">
						<div>
							<h5 class="card-title mb-1">
								🏠 Habitación #{{ reserva.habitaciones.numero }}
							</h5>
							<span class="badge bg-secondary">{{
								reserva.habitaciones.tipo
							}}</span>
						</div>
						<span
							:class="useMisc().getBookStatusBadgeClass(reserva.estado)"
							class="badge"
						>
							{{ reserva.estado }}
						</span>
					</div>
				</div>

				<!-- Cuerpo de la tarjeta -->
				<div class="card-body">
					<!-- Fechas -->
					<div class="mb-3">
						<div class="d-flex justify-content-between mb-2">
							<small class="text-muted">
								<strong>📅 Check-in:</strong>
							</small>
							<small>{{ formatDate(reserva.fecha_inicio) }}</small>
						</div>
						<div class="d-flex justify-content-between mb-2">
							<small class="text-muted">
								<strong>📆 Check-out:</strong>
							</small>
							<small>{{ formatDate(reserva.fecha_fin) }}</small>
						</div>
						<div class="d-flex justify-content-between">
							<small class="text-muted">
								<strong>👥 Huéspedes:</strong>
							</small>
							<small>{{ reserva.num_huespedes }} personas</small>
						</div>
					</div>

					<!-- Separador -->
					<hr class="my-3" />

					<!-- Total y botón -->
					<div class="d-flex justify-content-between align-items-center">
						<div>
							<small class="text-muted">Total</small>
							<h6 class="mb-0 text-primary">
								{{ formatCurrency(reserva.costo_total) }}
							</h6>
						</div>
						<button
							v-if="reserva.facturas"
							class="btn btn-sm btn-outline-primary"
							@click="viewInvoice(reserva)"
						>
							📄 Ver Factura
						</button>
						<button v-else class="btn btn-sm btn-secondary" disabled>
							📄 Sin factura
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Modal de factura -->
	<Modal v-model="showModal" :title="`Factura electrónica`" @close="closeModal">
		<GuestInvoice
			v-if="selectedReserva"
			:factura="selectedFactura"
			:reserva="selectedReserva"
		/>
		<div v-else class="alert alert-danger">
			No se pudo cargar la información de la factura
		</div>
	</Modal>
</template>
