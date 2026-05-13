<script setup lang="ts">
import { ref, reactive } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { calculuateDaysStaying } from "../../composables/reservationMethods.ts";
import type { PaymentMethod } from "../../composables/dbInformation.ts";
import ToastMessage from "../../components/ToastMessage.vue";
import { format } from "date-fns";

const props = defineProps<{
	roomId: number;
	roomNumber: number;
	pricePerNight: number;
	roomCapacity: number;
}>();

interface Reservation {
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	observaciones: string;
	costo_total: number;
	metodo_pago: PaymentMethod;
}

const emit = defineEmits<{
	(e: "reservation-complete"): void;
}>();

const loading = ref(false);
const TAX_RATE = 0.19;
const daysStaying = ref(0);
const subtotal = ref(0);
const taxes = ref(0);

const newReservation = reactive<Reservation>({
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	observaciones: "",
	costo_total: 0,
	metodo_pago: "Efectivo",
});

const calculatePrice = () => {
	if (newReservation.fecha_inicio && newReservation.fecha_fin) {
		daysStaying.value = calculuateDaysStaying(newReservation.fecha_fin, newReservation.fecha_inicio);
		subtotal.value = daysStaying.value * props.pricePerNight;
		taxes.value = subtotal.value * TAX_RATE;
		newReservation.costo_total = subtotal.value + taxes.value;
	}
};

const checkDates = (): boolean => {
	const currentDate = new Date();
	const today = format(currentDate, "yyyy-MM-dd");

	if (!newReservation.fecha_inicio) {
		useToast().showMessage(
			"alert alert-danger",
			"Selecciona una fecha de check-in",
		);
		return false;
	}

	if (!newReservation.fecha_fin) {
		useToast().showMessage(
			"alert alert-danger",
			"Selecciona una fecha de check-out",
		);
		return false;
	}

	if (newReservation.fecha_inicio < today) {
		useToast().showMessage(
			"alert alert-danger",
			"La fecha de check-in no puede ser anterior a hoy",
		);
		return false;
	}

	if (newReservation.fecha_inicio >= newReservation.fecha_fin) {
		useToast().showMessage(
			"alert alert-danger",
			"La fecha de check-out debe ser posterior a la fecha de check-in",
		);
		return false;
	}

	return true;
};

const checkNumGuests = (): boolean => {
	if (!newReservation.num_huespedes || newReservation.num_huespedes < 1) {
		useToast().showMessage(
			"alert alert-danger",
			"Ingresa un número válido de huéspedes",
		);
		return false;
	}
	if (newReservation.num_huespedes > roomCapacity) {
		useToast().showMessage(
			"alert alert-danger",
			"El número de personas excede en capacidad",
		);
		return false;
	}
	return true;
};

const checkAvailability = async (): Promise<boolean> => {
	try {
		const { data, error } = await supabase
			.from("reservas")
			.select("fecha_inicio, fecha_fin")
			.eq("id_habitacion", props.roomId)
			.in("estado", ["Pendiente", "Confirmada"]);

		if (error) throw error;

		const newStartDate = new Date(newReservation.fecha_inicio);
		const newEndDate = new Date(newReservation.fecha_fin);

		for (const reserva of data || []) {
			const startReservation = new Date(reserva.fecha_inicio);
			const endReservation = new Date(reserva.fecha_fin);

			if (
				(newStartDate >= startReservation && newStartDate < endReservation) ||
				(newEndDate > startReservation && newEndDate <= endReservation) ||
				(newStartDate <= startReservation && newEndDate >= endReservation)
			) {
				useToast().showMessage(
					"alert alert-danger",
					"La habitación no está disponible en las fechas seleccionadas",
				);
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error("Error verificando disponibilidad:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al verificar disponibilidad",
		);
		return false;
	}
};

const insertReservation = async (userId: string) => {
	const { data, error } = await supabase
		.from("reservas")
		.insert({
			fecha_inicio: newReservation.fecha_inicio,
			fecha_fin: newReservation.fecha_fin,
			num_huespedes: newReservation.num_huespedes,
			estado: "Pendiente",
			costo_total: newReservation.costo_total,
			auth_id_usuario: userId,
			id_habitacion: props.roomId,
			observaciones: newReservation.observaciones || null,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
};

const insertInvoice = async (reservationId: number) => {
	const { error } = await supabase
		.from("facturas")
		.insert({
			subtotal: subtotal.value,
			impuestos: taxes.value,
			total: newReservation.costo_total,
			metodo_pago: newReservation.metodo_pago,
			estado_pago: "Pendiente",
			id_reserva: reservationId,
		})
		.select()
		.single();

	if (error) throw error;
};

const insertTablesInformation = async () => {
	if (!checkDates() && !checkNumGuests()) {
		return;
	}

	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData.user) {
		useToast().showMessage("alert alert-danger", "Usuario no autenticado");
		return;
	}

	loading.value = true;

	try {
		const available = await checkAvailability();
		if (!available) {
			return;
		}

		// Insertar reserva
		const reservationData = await insertReservation(userData.user.id);
		await insertInvoice(reservationData.id_reserva);

		useToast().showMessage(
			"alert alert-success",
			"Reserva creada exitosamente",
		);

		// Emitir evento y cerrar modal después de un delay
		setTimeout(() => {
			emit("reservation-complete");
		}, 1500);
	} catch (error: any) {
		console.error("Error creating reservation:", error);
		useToast().showMessage("alert alert-danger", error.message);
	} finally {
		loading.value = false;
	}
};

const cancelBook = () => {
	emit("reservation-complete");
};

// Obtener fecha mínima (mañana)
const getMinDate = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return format(date, "yyyy-MM-dd");
};
</script>

<template>
	<form @submit.prevent="insertTablesInformation" class="container-sm">
		<div class="mb-3">
			<h2>${{ pricePerNight }} / noche</h2>
		</div>
		<div class="mb-3">
			<label class="form-label">Fecha de Check-in</label>
			<input
				type="date"
				v-model="newReservation.fecha_inicio"
				@change="calculatePrice"
				:min="getMinDate()"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Fecha de Check-out</label>
			<input
				type="date"
				v-model="newReservation.fecha_fin"
				@change="calculatePrice"
				:min="newReservation.fecha_inicio || getMinDate()"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Número de Huéspedes</label>
			<input
				type="number"
				v-model="newReservation.num_huespedes"
				min="1"
				max="10"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Método de pago</label>
			<select v-model="newReservation.metodo_pago" class="form-select" required>
				<option>Efectivo</option>
				<option>Tarjeta crédito</option>
				<option>Tarjeta débito</option>
				<option>Transferencia</option>
				<option>Otro</option>
			</select>
		</div>

		<div class="mb-3">
			<label class="form-label">Observaciones (opcional)</label>
			<textarea
				v-model="newReservation.observaciones"
				class="form-control"
				placeholder="Requerimientos especiales..."
			></textarea>
		</div>

		<div v-if="newReservation.costo_total > 0">
			<h3>Resumen de la reserva</h3>
			<ul class="list-group">
				<li class="list-group-item">Habitación #{{ props.roomNumber }}</li>
				<li class="list-group-item">
					Días de estadía: {{ daysStaying }} noches
				</li>
				<li class="list-group-item">
					Check-in: {{ newReservation.fecha_inicio }}
				</li>
				<li class="list-group-item">
					Check-out: {{ newReservation.fecha_fin }}
				</li>
				<li class="list-group-item">
					Huéspedes: {{ newReservation.num_huespedes }}
				</li>
				<li class="list-group-item">
					Método de pago: {{ newReservation.metodo_pago }}
				</li>
				<li class="list-group-item bg-info">
					Subtotal: ${{ subtotal.toFixed(2) }}
				</li>
				<li class="list-group-item bg-info">
					Impuestos (19%): ${{ taxes.toFixed(2) }}
				</li>
				<li class="list-group-item bg-warning">
					Total: ${{ newReservation.costo_total.toFixed(2) }}
				</li>
			</ul>
		</div>

		<div class="d-flex justify-content-center">
			<button type="button" class="btn btn-danger m-2" @click="cancelBook">
				Cancelar
			</button>

			<button type="submit" class="btn btn-success m-2" :disabled="loading">
				{{ loading ? "Procesando..." : "Confirmar Reserva" }}
			</button>
		</div>

		<ToastMessage />
	</form>
</template>
