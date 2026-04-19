<!-- src/views/guest/GuestBook.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";
import { format } from 'date-fns';

// Props en lugar de route.query
const props = defineProps<{
	roomId: number;
	roomNumber: number;
	pricePerNight: number;
}>();

interface Reservation {
	startDate: string;
	endDate: string;
	numHuespedes: number;
	observations: string;
	costoTotal: number;
}

const emit = defineEmits<{
	(e: "reservation-complete"): void;
}>();

const router = useRouter();

const loading = ref(false);

const daysStaying = ref(0);

const newReservation = ref<Reservation>({
	startDate: "",
	endDate: "",
	numHuespedes: "",
	observations: "",
	costoTotal: 0,
});

const calcularCosto = () => {
	if (newReservation.value.startDate && newReservation.value.endDate) {
		const sDate = new Date(newReservation.value.startDate);
		const eDate = new Date(newReservation.value.endDate);
		const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
		daysStaying.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		newReservation.value.costoTotal = daysStaying.value * props.pricePerNight;
	}
};

const insertReservation = async () => {

	if (!newReservation.value.startDate || !newReservation.value.endDate) {
		useToast().showMessage("error", "Selecciona las fechas de estadía");
		return;
	}

	const currentDate = new Date();
	const dateFormat = format(currentDate, 'yyyy-MM-dd');

	if (newReservation.value.startDate < dateFormat) {
		useToast().showMessage("error", "Fecha no válida de check in");
		return;
	}

	if (newReservation.value.startDate > newReservation.value.endDate || newReservation.value.endDate < dateFormat) {
		useToast().showMessage("error", "Fecha no válida de check out");
		return;
	}

	const { data: userData } = await supabase.auth.getUser();
	if (!userData.user) {
		useToast().showMessage("error", "Usuario no autenticado");
		return;
	}

	loading.value = true;


	try {
		const { data, error } = await supabase
			.from("reservas")
			.insert({
				fecha_inicio: newReservation.value.startDate,
				fecha_fin: newReservation.value.endDate,
				num_huespedes: newReservation.value.numHuespedes,
				estado: "Pendiente",
				costo_total: newReservation.value.costoTotal,
				auth_id_usuario: newReservation.value.userData.user.id,
				id_habitacion: newReservation.value.props.roomId,
				observaciones: newReservation.value.observaciones || null,
			})
			.select();

		if (error) throw error;
		useToast().showMessage("success", "Reserva creada exitosamente");

		// Emitir evento y cerrar modal después de un delay
		setTimeout(() => {
			emit("reservation-complete");
			// Opcional: recargar la lista de habitaciones
			// Puedes emitir otro evento para refrescar
		}, 1500);
	} catch (error) {
		console.error("Error creating reservation:", error);
		useToast().showMessage("error", "Error al crear reserva");
	} finally {
		loading.value = false;
	}
};

const cancelar = () => {
	emit("reservation-complete");
};
</script>

<template>
	<div class="guest-book">
		<p class="price">${{ pricePerNight }} por noche</p>

		<form @submit.prevent="insertReservation">
			<div class="form-group">
				<label>Fecha de Check-in</label>
				<input
					type="date"
					v-model="newReservation.startDate"
					@change="calcularCosto"
					required
				/>
			</div>

			<div class="form-group">
				<label>Fecha de Check-out</label>
				<input
					type="date"
					v-model="newReservation.endDate"
					@change="calcularCosto"
					required
				/>
			</div>

			<div class="form-group">
				<label>Número de Huéspedes</label>
				<input type="number" v-model="newReservation.numHuespedes" min="1" max="10" required />
			</div>

			<div class="form-group">
				<label>Observaciones (opcional)</label>
				<textarea
					v-model="newReservation.observations"
					rows="3"
					placeholder="Requerimientos especiales..."
				></textarea>
			</div>

			<div v-if="newReservation.costoTotal > 0" class="resumen">
				<h3>Resumen de la reserva</h3>
				<p>Días de estadía: {{ daysStaying }} noches</p>
				<p class="total">Total: ${{ newReservation.costoTotal.toFixed(2) }}</p>
			</div>


	<!-- Mensajes -->
	<ToastMessage />

			<div class="form-actions">
				<button type="button" class="btn btn-critical" @click="cancelar">
					Cancelar
				</button>
				<button type="submit" class="btn btn-primary" :disabled="loading">
					{{ loading ? "Procesando..." : "Confirmar Reserva" }}
				</button>
			</div>
		</form>
	</div>
</template>

<style scoped>
.guest-book {
	width: 100%;
}

.price {
	color: #667eea;
	font-size: 1.25rem;
	font-weight: bold;
	margin-bottom: 1.5rem;
	text-align: center;
}

.form-group {
	margin-bottom: 1.5rem;
}

.form-group textarea {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid #ddd;
	border-radius: 8px;
	font-size: 1rem;
	transition: border-color 0.2s;
}

.resumen {
	background: #f8f9fa;
	padding: 1rem;
	border-radius: 8px;
	margin-bottom: 1.5rem;
}

.resumen h3 {
	margin: 0 0 0.5rem 0;
	color: #2c3e50;
}

.total {
	font-size: 1.25rem;
	font-weight: bold;
	color: #27ae60;
	margin-top: 0.5rem;
}

.form-actions {
	display: flex;
	gap: 1rem;
	justify-content: flex-end;
}
</style>
