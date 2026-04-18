<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

// Interfaces
interface Habitacion {
	id_habitacion: number;
	numero: string;
	// Agregar otros campos si es necesario
}

interface Reserva {
	id_reserva: number;
	auth_id_usuario: string;
	id_habitacion: number;
	fecha_reserva: string;
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	estado: "Pendiente" | "Confirmada" | "Cancelada";
	costo_total: number;
	observaciones: string;
	nombre_usuario?: string;
	email_usuario?: string;
	numero_habitacion?: string;
}

interface User {
	id_usuario: number;
	auth_id: string;
	nombre: string;
	email: string;
}

// Estado
const reservas = ref<Reserva[]>([]);
const habitaciones = ref<Habitacion[]>([]);
const users = ref<User[]>([]);
const showEditReservaModal = ref(false);
const showCreateReservaModal = ref(false);
const editingReserva = ref<Reserva | null>(null);

// Formulario para editar reserva
const reservaForm = ref({
	id_habitacion: 0,
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	estado: "Pendiente" as "Pendiente" | "Confirmada" | "Cancelada",
	observaciones: "",
});

const reservaCreateForm = ref({
	auth_id_usuario: "",
	id_habitacion: 0,
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	estado: "Pendiente" as "Pendiente" | "Confirmada" | "Cancelada",
	observaciones: "",
	costo_total: 0,
});

// Funciones
const loadReservas = async () => {
	try {
		const { data: dataReserva, error: errorReserva } = await supabase
			.from("reservas")
			.select("*")
			.order("fecha_inicio", { ascending: false });
		if (errorReserva) throw errorReserva;

		const { data: dataUsuarios, error: errorUsuarios } = await supabase
			.from("usuarios")
			.select("id_usuario, auth_id, nombre, email");
		if (errorUsuarios) throw errorUsuarios;

		const { data: dataHabitaciones, error: errorHabitaciones } = await supabase
			.from("habitaciones")
			.select("*");
		if (errorHabitaciones) throw errorHabitaciones;

		habitaciones.value = dataHabitaciones || [];
		users.value = dataUsuarios || [];

		const reservasConDetalles = dataReserva.map((reserva: Reserva) => {
			const usuario = dataUsuarios.find(
				(u: User) => u.auth_id === reserva.auth_id_usuario,
			);
			const habitacion = dataHabitaciones.find(
				(h: Habitacion) => h.id_habitacion === reserva.id_habitacion,
			);
			return {
				...reserva,
				nombre_usuario: usuario ? usuario.nombre : "Desconocido",
				email_usuario: usuario ? usuario.email : "Desconocido",
				numero_habitacion: habitacion ? habitacion.numero : "Desconocido",
			};
		});

		reservas.value = reservasConDetalles;
	} catch (error: any) {
		console.error("Error al cargar reservas:", error);
		useToast().showMessage("error", "Error al cargar las reservas");
	}
};

const loadHabitaciones = async () => {
	try {
		const { data, error } = await supabase
			.from("habitaciones")
			.select("*");
		if (error) throw error;
		habitaciones.value = data || [];
	} catch (error: any) {
		console.error("Error al cargar habitaciones:", error);
	}
};

const loadUsers = async () => {
	try {
		const { data, error } = await supabase
			.from("usuarios")
			.select("id_usuario, auth_id, nombre, email");
		if (error) throw error;
		users.value = data || [];
	} catch (error: any) {
		console.error("Error al cargar usuarios:", error);
	}
};

const openEditReservaModal = (reserva: Reserva) => {
	editingReserva.value = reserva;
	reservaForm.value = {
		id_habitacion: reserva.id_habitacion,
		fecha_inicio: reserva.fecha_inicio.split('T')[0], // Para input date
		fecha_fin: reserva.fecha_fin.split('T')[0],
		num_huespedes: reserva.num_huespedes,
		estado: reserva.estado,
		observaciones: reserva.observaciones,
	};
	showEditReservaModal.value = true;
};

const updateReserva = async () => {
	if (!editingReserva.value) return;

	try {
		const { error } = await supabase
			.from("reservas")
			.update({
				id_habitacion: reservaForm.value.id_habitacion,
				fecha_inicio: reservaForm.value.fecha_inicio,
				fecha_fin: reservaForm.value.fecha_fin,
				num_huespedes: reservaForm.value.num_huespedes,
				estado: reservaForm.value.estado,
				observaciones: reservaForm.value.observaciones,
			})
			.eq("id_reserva", editingReserva.value.id_reserva);

		if (error) throw error;

		useToast().showMessage("success", "Reserva actualizada exitosamente");
		closeEditReservaModal();
		await loadReservas();
	} catch (error: any) {
		console.error("Error al actualizar reserva:", error);
		useToast().showMessage(
			"error",
			error.message || "Error al actualizar la reserva",
		);
	}
};

const closeEditReservaModal = () => {
	showEditReservaModal.value = false;
	editingReserva.value = null;
	reservaForm.value = {
		id_habitacion: 0,
		fecha_inicio: "",
		fecha_fin: "",
		num_huespedes: 1,
		estado: "Pendiente",
		observaciones: "",
	};
};

const openCreateReservaModal = () => {
	showCreateReservaModal.value = true;
	reservaCreateForm.value = {
		auth_id_usuario: users.value.length > 0 ? users.value[0].auth_id : "",
		id_habitacion: habitaciones.value.length > 0 ? habitaciones.value[0].id_habitacion : 0,
		fecha_inicio: "",
		fecha_fin: "",
		num_huespedes: 1,
		estado: "Pendiente",
		observaciones: "",
		costo_total: 0,
	};
};

const closeCreateReservaModal = () => {
	showCreateReservaModal.value = false;
	reservaCreateForm.value = {
		auth_id_usuario: "",
		id_habitacion: 0,
		fecha_inicio: "",
		fecha_fin: "",
		num_huespedes: 1,
		estado: "Pendiente",
		observaciones: "",
		costo_total: 0,
	};
};

const createReserva = async () => {
	if (!reservaCreateForm.value.auth_id_usuario || !reservaCreateForm.value.id_habitacion) {
		useToast().showMessage("error", "Selecciona usuario y habitación");
		return;
	}

	try {
		const { error } = await supabase.from("reservas").insert({
			auth_id_usuario: reservaCreateForm.value.auth_id_usuario,
			id_habitacion: reservaCreateForm.value.id_habitacion,
			fecha_reserva: new Date().toISOString(),
			fecha_inicio: reservaCreateForm.value.fecha_inicio,
			fecha_fin: reservaCreateForm.value.fecha_fin,
			num_huespedes: reservaCreateForm.value.num_huespedes,
			estado: reservaCreateForm.value.estado,
			costo_total: reservaCreateForm.value.costo_total,
			observaciones: reservaCreateForm.value.observaciones,
		});

		if (error) throw error;

		useToast().showMessage("success", "Reserva creada exitosamente");
		closeCreateReservaModal();
		await loadReservas();
	} catch (error: any) {
		console.error("Error al crear reserva:", error);
		useToast().showMessage(
			"error",
			error.message || "Error al crear la reserva",
		);
	}
};

const deleteReserva = async (reserva: Reserva) => {
	if (!confirm(`¿Estás seguro de que deseas eliminar la reserva ${reserva.id_reserva}?`))
		return;

	try {
		const { error } = await supabase
			.from("reservas")
			.delete()
			.eq("id_reserva", reserva.id_reserva);

		if (error) throw error;

		useToast().showMessage("success", "Reserva eliminada exitosamente");
		await loadReservas();
	} catch (error: any) {
		console.error("Error al eliminar reserva:", error);
		useToast().showMessage(
			"error",
			error.message || "Error al eliminar la reserva",
		);
	}
};

const formatDate = (date: string) => {
	if (!date) return "Nunca";
	return new Date(date).toLocaleString("es-CO");
};

// Lifecycle
onMounted(() => {
	loadReservas();
	loadHabitaciones();
	loadUsers();
});
</script>

<template>
	<div>
		<!-- Controles -->
		<div>
			<button class="btn" @click="openCreateReservaModal">
				➕ Crear Reserva
			</button>
		</div>

		<!-- Tabla de reservas -->
		<div>
			<h2>Reservas</h2>
			<table class="users-table">
				<thead>
				<tr>
					<th>ID Reserva</th>
					<th>Nombre Usuario</th>
					<th>Email Usuario</th>
					<th>Número Habitación</th>
					<th>Huéspedes</th>
					<th>Fecha Reserva</th>
					<th>Fecha Inicio</th>
					<th>Fecha Fin</th>
					<th>Estado</th>
					<th>Costo Total</th>
					<th>Acciones</th>
				</tr>
				</thead>
				<tbody>
				<tr v-for="reserva in reservas" :key="reserva.id_reserva">
					<td>{{ reserva.id_reserva }}</td>
					<td>{{ reserva.nombre_usuario }}</td>
					<td>{{ reserva.email_usuario }}</td>
					<td>{{ reserva.numero_habitacion }}</td>
					<td>{{ reserva.num_huespedes }}</td>
					<td>{{ formatDate(reserva.fecha_reserva) }}</td>
					<td>{{ formatDate(reserva.fecha_inicio) }}</td>
					<td>{{ formatDate(reserva.fecha_fin) }}</td>
					<td>{{ reserva.estado }}</td>
					<td>${{ reserva.costo_total }}</td>
					<td>
						<button class="btn" @click="openEditReservaModal(reserva)" title="Editar">
							✏️
						</button>
						<button
							class="btn btn-critical"
							@click="deleteReserva(reserva)"
							title="Eliminar"
						>
							🗑️
						</button>
					</td>
				</tr>
				</tbody>
			</table>
		</div>

		<!-- Modal para editar reserva -->
		<div v-if="showEditReservaModal" @click.self="closeEditReservaModal">
			<div>
				<div>
					<h2>Editar Reserva</h2>
				</div>

				<form @submit.prevent="updateReserva()">
					<div>
						<label>Número de Habitación *</label>
						<select v-model="reservaForm.id_habitacion" required>
							<option v-for="hab in habitaciones" :key="hab.id_habitacion" :value="hab.id_habitacion">
								{{ hab.numero }}
							</option>
						</select>
					</div>

					<div>
						<label>Número de huéspedes *</label>
						<input type="number" min="1" v-model.number="reservaForm.num_huespedes" required />
					</div>

					<div>
						<div>
							<label>Fecha Inicio *</label>
							<input type="date" v-model="reservaForm.fecha_inicio" required />
						</div>

						<div>
							<label>Fecha Fin *</label>
							<input type="date" v-model="reservaForm.fecha_fin" required />
						</div>
					</div>

					<div>
						<label>Estado *</label>
						<select v-model="reservaForm.estado" required>
							<option>Pendiente</option>
							<option>Confirmada</option>
							<option>Cancelada</option>
						</select>
					</div>

					<div>
						<label>Observaciones</label>
						<textarea v-model="reservaForm.observaciones"></textarea>
					</div>

					<div>
						<button class="btn" type="submit">
							Actualizar
						</button>
						<button type="button" class="btn btn-critical" @click="closeEditReservaModal">
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Modal para crear reserva -->
		<div v-if="showCreateReservaModal" @click.self="closeCreateReservaModal">
			<div>
				<div>
					<h2>Crear Reserva</h2>
				</div>

				<form @submit.prevent="createReserva()">
					<div>
						<label>Usuario *</label>
						<select v-model="reservaCreateForm.auth_id_usuario" required>
							<option value="" disabled>Selecciona un usuario</option>
							<option v-for="user in users" :key="user.auth_id" :value="user.auth_id">
								{{ user.nombre }} - {{ user.email }}
							</option>
						</select>
					</div>

					<div>
						<label>Número de Habitación *</label>
						<select v-model="reservaCreateForm.id_habitacion" required>
							<option value="" disabled>Selecciona una habitación</option>
							<option v-for="hab in habitaciones" :key="hab.id_habitacion" :value="hab.id_habitacion">
								{{ hab.numero }}
							</option>
						</select>
					</div>

					<div>
						<label>Número de huéspedes *</label>
						<input type="number" min="1" v-model.number="reservaCreateForm.num_huespedes" required />
					</div>

					<div>
						<div>
							<label>Fecha Inicio *</label>
							<input type="date" v-model="reservaCreateForm.fecha_inicio" required />
						</div>

						<div>
							<label>Fecha Fin *</label>
							<input type="date" v-model="reservaCreateForm.fecha_fin" required />
						</div>
					</div>

					<div>
						<label>Estado *</label>
						<select v-model="reservaCreateForm.estado" required>
							<option>Pendiente</option>
							<option>Confirmada</option>
							<option>Cancelada</option>
						</select>
					</div>

					<div>
						<label>Costo Total</label>
						<input type="number" v-model.number="reservaCreateForm.costo_total" min="0" />
					</div>

					<div>
						<label>Observaciones</label>
						<textarea v-model="reservaCreateForm.observaciones"></textarea>
					</div>

					<div>
						<button class="btn" type="submit">Crear</button>
						<button type="button" class="btn btn-critical" @click="closeCreateReservaModal">Cancelar</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Controles */
div:has(> .btn:first-child) {
	display: flex;
	gap: 1rem;
	align-items: center;
	margin-bottom: 2rem;
	flex-wrap: wrap;
}

div:has(> .btn:first-child) .btn {
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 6px;
	cursor: pointer;
	font-weight: 500;
	transition: all 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

div:has(> .btn:first-child) .btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

div:has(> .btn:first-child) .btn-critical {
	background: #dc2626;
	color: white;
}

div:has(> .btn:first-child) .btn-critical:hover {
	background: #b91c1c;
}

/* Tabla de reservas */
.users-table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	margin-top: 1rem;
}

.users-table thead {
	background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.users-table th {
	padding: 1rem;
	text-align: left;
	font-weight: 600;
	color: #374151;
	border-bottom: 2px solid #d1d5db;
	font-size: 0.9rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.users-table td {
	padding: 1rem;
	border-bottom: 1px solid #e5e7eb;
	font-size: 0.9rem;
}

.users-table tbody tr {
	transition: background-color 0.2s ease;
}

.users-table tbody tr:hover {
	background-color: #f9fafb;
}

.users-table tbody tr:last-child td {
	border-bottom: none;
}

/* Botones en tabla */
.users-table .btn {
	padding: 0.5rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
	transition: all 0.2s ease;
	margin-right: 0.25rem;
}

.users-table .btn:hover {
	transform: scale(1.1);
}

.users-table .btn-critical {
	background: #fee2e2;
	color: #991b1b;
}

.users-table .btn-critical:hover {
	background: #fecaca;
}

/* Modales */
div[v-if] {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
}

div[v-if] > div {
	background: white;
	padding: 2rem;
	border-radius: 8px;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	max-width: 500px;
	width: 90%;
	max-height: 90vh;
	overflow-y: auto;
}

div[v-if] > div > div:first-child {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

div[v-if] > div h2 {
	margin: 0;
	color: #1f2937;
	font-size: 1.5rem;
}

div[v-if] form > div {
	margin-bottom: 1rem;
}

div[v-if] label {
	display: block;
	margin-bottom: 0.5rem;
	font-weight: 500;
	color: #374151;
	font-size: 0.9rem;
}

div[v-if] input,
div[v-if] select,
div[v-if] textarea {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	font-size: 0.9rem;
	transition: border-color 0.2s ease;
	box-sizing: border-box;
}

div[v-if] input:focus,
div[v-if] select:focus,
div[v-if] textarea:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

div[v-if] textarea {
	resize: vertical;
	min-height: 80px;
}

div[v-if] form > div:has(> div) {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
}

div[v-if] form > div:has(button) {
	display: flex;
	gap: 1rem;
	justify-content: flex-end;
	margin-top: 2rem;
	padding-top: 1rem;
	border-top: 1px solid #e5e7eb;
}
</style>