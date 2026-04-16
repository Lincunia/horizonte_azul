<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

const route = useRoute();
const router = useRouter();

const habitacionId = ref(parseInt(route.query.id as string));
const habitacionNumero = ref(route.query.numero as string);
const precioNoche = ref(parseFloat(route.query.precio as string));

const fechaInicio = ref("");
const fechaFin = ref("");
const numHuespedes = ref(1);
const observaciones = ref("");
const loading = ref(false);
const costoTotal = ref(0);
const diasEstadia = ref(0);

const calcularCosto = () => {
	if (fechaInicio.value && fechaFin.value) {
		const inicio = new Date(fechaInicio.value);
		const fin = new Date(fechaFin.value);
		const diffTime = Math.abs(fin.getTime() - inicio.getTime());
		diasEstadia.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		costoTotal.value = diasEstadia.value * precioNoche.value;
	}
};

const crearReserva = async () => {
	if (!fechaInicio.value || !fechaFin.value) {
		useToast().showMessage("error", "Selecciona las fechas de estadía");
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
				fecha_inicio: fechaInicio.value,
				fecha_fin: fechaFin.value,
				num_huespedes: numHuespedes.value,
				estado: "Pendiente",
				costo_total: costoTotal.value,
				auth_id_usuario: userData.user.id,
				id_habitacion: habitacionId.value,
				observaciones: observaciones.value || null,
			})
			.select();

		if (error) throw error;

		useToast().showMessage("success", "Reserva creada exitosamente");
		setTimeout(() => {
			router.push("/guest/reservations");
		}, 1500);
	} catch (error) {
		console.error("Error creating reservation:", error);
		useToast().showMessage("error", "Error al crear reserva");
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<div class="reservar-container">
		<div class="reservar-card">
			<h2>Reservar Habitación #{{ habitacionNumero }}</h2>
			<p class="price">${{ precioNoche }} por noche</p>

			<form @submit.prevent="crearReserva">
				<div class="form-group">
					<label>Fecha de Check-in</label>
					<input
						type="date"
						v-model="fechaInicio"
						@change="calcularCosto"
						required
					/>
				</div>

				<div class="form-group">
					<label>Fecha de Check-out</label>
					<input
						type="date"
						v-model="fechaFin"
						@change="calcularCosto"
						required
					/>
				</div>

				<div class="form-group">
					<label>Número de Huéspedes</label>
					<input type="number" v-model="numHuespedes" min="1" required />
				</div>

				<div class="form-group">
					<label>Observaciones (opcional)</label>
					<textarea v-model="observaciones" rows="3"></textarea>
				</div>

				<div v-if="costoTotal > 0" class="resumen">
					<h3>Resumen de la reserva</h3>
					<p>Días de estadía: {{ diasEstadia }} noches</p>
					<p class="total">Total: ${{ costoTotal.toFixed(2) }}</p>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="btn btn-secondary"
						@click="router.back()"
					>
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary" :disabled="loading">
						{{ loading ? "Procesando..." : "Confirmar Reserva" }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<style scoped>
.reservar-container {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: calc(100vh - 200px);
	padding: 2rem;
}

.reservar-card {
	background: white;
	border-radius: 12px;
	padding: 2rem;
	max-width: 500px;
	width: 100%;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.reservar-card h2 {
	color: #2c3e50;
	margin-bottom: 0.5rem;
}

.price {
	color: #667eea;
	font-size: 1.25rem;
	font-weight: bold;
	margin-bottom: 2rem;
}

.form-group {
	margin-bottom: 1.5rem;
}

.form-group label {
	display: block;
	margin-bottom: 0.5rem;
	color: #2c3e50;
	font-weight: 500;
}

.form-group input,
.form-group textarea {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid #ddd;
	border-radius: 8px;
	font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
	outline: none;
	border-color: #667eea;
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

.btn {
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	font-weight: 600;
	transition: all 0.2s ease;
}

.btn-primary {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-2px);
}

.btn-secondary {
	background: #e74c3c;
	color: white;
}

.btn-secondary:hover {
	background: #c0392b;
}

.btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
