<script setup lang="ts">
import { ref, reactive } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";
import { format } from "date-fns";

const props = defineProps<{
	roomId: number;
	roomNumber: number;
	pricePerNight: number;
}>();

interface Reservation {
	startDate: string;
	endDate: string;
	numGuests: number;
	observations: string;
	totalPrice: number;
	paymentMethod:
		| "Efectivo"
		| "Tarjeta crédito"
		| "Tarjeta débito"
		| "Transferencia"
		| "Otro";
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
	startDate: "",
	endDate: "",
	numGuests: 1,
	observations: "",
	totalPrice: 0,
	paymentMethod: "Efectivo",
});

const calculatePrice = () => {
	if (newReservation.startDate && newReservation.endDate) {
		const startDate = new Date(newReservation.startDate);
		const endDate = new Date(newReservation.endDate);
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		daysStaying.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		subtotal.value = daysStaying.value * props.pricePerNight;
		taxes.value = subtotal.value * TAX_RATE;
		newReservation.totalPrice = subtotal.value + taxes.value;
	}
};

const checkDates = (): boolean => {
	const currentDate = new Date();
	const today = format(currentDate, "yyyy-MM-dd");

	if (!newReservation.startDate) {
		useToast().showMessage("error", "Selecciona una fecha de check-in");
		return false;
	}

	if (!newReservation.endDate) {
		useToast().showMessage("error", "Selecciona una fecha de check-out");
		return false;
	}

	if (newReservation.startDate < today) {
		useToast().showMessage(
			"error",
			"La fecha de check-in no puede ser anterior a hoy",
		);
		return false;
	}

	if (newReservation.startDate >= newReservation.endDate) {
		useToast().showMessage(
			"error",
			"La fecha de check-out debe ser posterior a la fecha de check-in",
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

		const newStartDate = new Date(newReservation.startDate);
		const newEndDate = new Date(newReservation.endDate);

		for (const reserva of data || []) {
			const startReservation = new Date(reserva.fecha_inicio);
			const endReservation = new Date(reserva.fecha_fin);

			if (
				(newStartDate >= startReservation && newStartDate < endReservation) ||
				(newEndDate > startReservation && newEndDate <= endReservation) ||
				(newStartDate <= startReservation && newEndDate >= endReservation)
			) {
				useToast().showMessage(
					"error",
					"La habitación no está disponible en las fechas seleccionadas",
				);
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error("Error verificando disponibilidad:", error);
		useToast().showMessage("error", "Error al verificar disponibilidad");
		return false;
	}
};

const insertReservation = async (userId: string) => {
	const { data, error } = await supabase
		.from("reservas")
		.insert({
			fecha_inicio: newReservation.startDate,
			fecha_fin: newReservation.endDate,
			num_huespedes: newReservation.numGuests,
			estado: "Pendiente",
			costo_total: newReservation.totalPrice,
			auth_id_usuario: userId,
			id_habitacion: props.roomId,
			observaciones: newReservation.observations || null,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
};

const insertBill = async (reservationId: number) => {
	const { error } = await supabase
		.from("facturas")
		.insert({
			subtotal: subtotal.value,
			impuestos: taxes.value,
			total: newReservation.totalPrice,
			metodo_pago: newReservation.paymentMethod,
			estado_pago: "Pendiente",
			id_reserva: reservationId,
		})
		.select()
		.single();

	if (error) throw error;
};

const insertTablesInformation = async () => {
	// Validar fechas
	if (!checkDates()) {
		return;
	}

	// Validar número de huéspedes
	if (!newReservation.numGuests || newReservation.numGuests < 1) {
		useToast().showMessage("error", "Ingresa un número válido de huéspedes");
		return;
	}

	// Obtener usuario actual
	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData.user) {
		useToast().showMessage("error", "Usuario no autenticado");
		return;
	}

	loading.value = true;

	try {
		// Verificar disponibilidad
		const available = await checkAvailability();
		if (!available) {
			return;
		}

		// Insertar reserva
		const reservationData = await insertReservation(userData.user.id);

		// Insertar factura
		await insertBill(reservationData.id_reserva);

		useToast().showMessage("success", "Reserva creada exitosamente");

		// Emitir evento y cerrar modal después de un delay
		setTimeout(() => {
			emit("reservation-complete");
		}, 1500);
	} catch (error: any) {
		console.error("Error creating reservation:", error);

		if (error.code === "23505") {
			useToast().showMessage(
				"error",
				"Ya existe una reserva para estas fechas",
			);
		} else if (error.message) {
			useToast().showMessage("error", error.message);
		} else {
			useToast().showMessage("error", "Error al crear reserva");
		}
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
	<form @submit.prevent="insertTablesInformation">
		<fieldset>
			<legend>
				<h2>${{ pricePerNight }} / noche</h2>
			</legend>
			<div class="input-group">
				<label>Fecha de Check-in</label>
				<input
					type="date"
					v-model="newReservation.startDate"
					@change="calculatePrice"
					:min="getMinDate()"
					required
				/>
			</div>

			<div class="input-group">
				<label>Fecha de Check-out</label>
				<input
					type="date"
					v-model="newReservation.endDate"
					@change="calculatePrice"
					:min="newReservation.startDate || getMinDate()"
					required
				/>
			</div>

			<div class="input-group">
				<label>Número de Huéspedes</label>
				<input
					type="number"
					v-model="newReservation.numGuests"
					min="1"
					max="10"
					required
				/>
			</div>

			<div class="input-group">
				<label>Método de pago</label>
				<select v-model="newReservation.paymentMethod" required>
					<option value="Efectivo">Efectivo</option>
					<option value="Tarjeta crédito">Tarjeta crédito</option>
					<option value="Tarjeta débito">Tarjeta débito</option>
					<option value="Transferencia">Transferencia</option>
					<option value="Otro">Otro</option>
				</select>
			</div>

			<div class="input-group">
				<label>Observaciones (opcional)</label>
				<textarea
					v-model="newReservation.observations"
					rows="3"
					placeholder="Requerimientos especiales..."
				></textarea>
			</div>

			<div v-if="newReservation.totalPrice > 0">
				<h3>Resumen de la reserva</h3>
				<p>Habitación #{{ props.roomNumber }}</p>
				<p>Días de estadía: {{ daysStaying }} noches</p>
				<p>Check-in: {{ newReservation.startDate }}</p>
				<p>Check-out: {{ newReservation.endDate }}</p>
				<p>Huéspedes: {{ newReservation.numGuests }}</p>
				<p>Método de pago: {{ newReservation.paymentMethod }}</p>
				<hr />
				<p>Subtotal: ${{ subtotal.toFixed(2) }}</p>
				<p>Impuestos (19%): ${{ taxes.toFixed(2) }}</p>
				<p class="total">Total: ${{ newReservation.totalPrice.toFixed(2) }}</p>
			</div>

			<button type="button" class="btn-critical" @click="cancelBook">
				Cancelar
			</button>

			<button type="submit" class="btn" :disabled="loading">
				{{ loading ? "Procesando..." : "Confirmar Reserva" }}
			</button>

			<ToastMessage />
		</fieldset>
	</form>
</template>
