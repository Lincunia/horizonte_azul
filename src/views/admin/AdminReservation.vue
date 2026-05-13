<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { useMisc } from "../../composables/useMisc.ts";
import Modal from "../../components/Modal.vue";

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
/*
interface Factura {
	subtotal: number;
	impuestos: number;
	total: number;
	metodo_pago:
		| "Efectivo"
		| "Tarjeta débito"
		| "Tarjeta crédito"
		| "Transferencia";
	estado_pago: "Pagada" | "Pendiente" | "Cancelada";
	id_reserva: number;
}
*/
// Estado
const reservas = ref<Reserva[]>([]);
const habitaciones = ref<Habitacion[]>([]);
const users = ref<User[]>([]);
//const facturas = ref<Factura[]>([]);
const showEditReservaModal = ref(false);
const showCreateReservaModal = ref(false);
const editingReserva = ref<Reserva | null>(null);
const searchTerm = ref("");
const filterEstado = ref<string>("todos");

// Formulario para editar reserva
const reservaForm = ref({
	id_habitacion: 0,
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	estado: "Pendiente" as "Pendiente" | "Confirmada" | "Cancelada",
	observaciones: "",
});
/*
const facturaForm = ref({
	subtotal: 0,
	impuestos: 0,
	total: 0,
	metodo_pago: "Efectivo" as "Efectivo" | "Tarjeta débito" | "Tarjeta crédito" | "Transferencia",
	estado_pago: "Pendiente" as "Pagada" | "Pendiente" | "Cancelada",
	id_reserva: 0,
});
*/
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

const filteredReservas = computed(() => {
	return reservas.value.filter((reserva) => {
		const matchesSearch = searchTerm.value
			? reserva.nombre_usuario
					?.toLowerCase()
					.includes(searchTerm.value.toLowerCase()) ||
				reserva.email_usuario
					?.toLowerCase()
					.includes(searchTerm.value.toLowerCase()) ||
				reserva.id_reserva.toString().includes(searchTerm.value)
			: true;

		const matchesEstado =
			filterEstado.value === "todos" || reserva.estado === filterEstado.value;

		return matchesSearch && matchesEstado;
	});
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
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar las reservas",
		);
	}
};

const loadHabitaciones = async () => {
	try {
		const { data, error } = await supabase.from("habitaciones").select("*");
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
		fecha_inicio: reserva.fecha_inicio.split("T")[0], // Para input date
		fecha_fin: reserva.fecha_fin.split("T")[0],
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

		useToast().showMessage(
			"alert alert-success",
			"Reserva actualizada exitosamente",
		);
		closeEditReservaModal();
		await loadReservas();
	} catch (error: any) {
		console.error("Error al actualizar reserva:", error);
		useToast().showMessage(
			"alert alert-danger",
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
		id_habitacion:
			habitaciones.value.length > 0 ? habitaciones.value[0].id_habitacion : 0,
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
	if (
		!reservaCreateForm.value.auth_id_usuario ||
		!reservaCreateForm.value.id_habitacion
	) {
		useToast().showMessage(
			"alert alert-danger",
			"Selecciona usuario y habitación",
		);
		return;
	}

	try {
		const { error: reservasError } = await supabase.from("reservas").insert({
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

		if (reservasError) throw reservasError;
		try {
			const { data: newReserva } = await supabase
				.from("reservas")
				.select("*")
				.order("id_reserva", { ascending: false })
				.limit(1)
				.single();

			if (newReserva) {
				const facturaData = {
					subtotal: reservaCreateForm.value.costo_total / 1.19,
					impuestos:
						reservaCreateForm.value.costo_total -
						reservaCreateForm.value.costo_total / 1.19,
					total: reservaCreateForm.value.costo_total,
					metodo_pago: "Efectivo",
					estado_pago: "Pendiente",
					id_reserva: newReserva.id_reserva,
				};

				const { error: facturaError } = await supabase
					.from("facturas")
					.insert(facturaData);

				if (facturaError) throw facturaError;
			}
		} catch (error: any) {
			console.error("Error al crear factura:", error);
			useToast().showMessage(
				"alert alert-danger",
				error.message || "Reserva creada pero error al crear factura",
			);
			return;
		}
		//console.log("Reserva creada:", data);
		useToast().showMessage(
			"alert alert-success",
			"Reserva creada exitosamente",
		);

		closeCreateReservaModal();
		await loadReservas();
	} catch (error: any) {
		console.error("Error al crear reserva:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al crear la reserva",
		);
	}
};

const deleteReserva = async (reserva: Reserva) => {
	if (
		!confirm(
			`¿Estás seguro de que deseas eliminar la reserva ${reserva.id_reserva}?`,
		)
	)
		return;

	try {
		const { error } = await supabase
			.from("reservas")
			.delete()
			.eq("id_reserva", reserva.id_reserva);

		if (error) throw error;

		useToast().showMessage(
			"alert alert-success",
			"Reserva eliminada exitosamente",
		);
		await loadReservas();
	} catch (error: any) {
		console.error("Error al eliminar reserva:", error);
		useToast().showMessage(
			"alert alert-danger",
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
	<div class="container">
		<div class="mb-3">
			<button class="btn btn-primary" @click="openCreateReservaModal">
				➕ Crear Reserva
			</button>
		</div>
		<div class="mb-3">
			<label class="form-label">
				Buscar por nombre, email o ID de reserva
			</label>
			<input type="search" v-model="searchTerm" class="form-control" />
		</div>
		<div class="mb-3">
			<select v-model="filterEstado" class="form-select">
				<option value="todos">Todos los estados</option>
				<option value="Pendiente">Pendiente</option>
				<option value="Confirmada">Confirmada</option>
				<option value="Cancelada">Cancelada</option>
			</select>
		</div>
	</div>

	<h2>Reservas</h2>
	<table class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">ID Reserva</th>
				<th scope="col">Nombre Usuario</th>
				<th scope="col">Email Usuario</th>
				<th scope="col">Número Habitación</th>
				<th scope="col">Huéspedes</th>
				<th scope="col">Fecha Reserva</th>
				<th scope="col">Fecha Inicio</th>
				<th scope="col">Fecha Fin</th>
				<th scope="col">Estado</th>
				<th scope="col">Costo Total</th>
				<th scope="col">Acciones</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="reserva in filteredReservas" :key="reserva.id_reserva">
				<td scope="row">{{ reserva.id_reserva }}</td>
				<td>{{ reserva.nombre_usuario }}</td>
				<td>{{ reserva.email_usuario }}</td>
				<td>{{ reserva.numero_habitacion }}</td>
				<td>{{ reserva.num_huespedes }}</td>
				<td>{{ formatDate(reserva.fecha_reserva) }}</td>
				<td>{{ formatDate(reserva.fecha_inicio) }}</td>
				<td>{{ formatDate(reserva.fecha_fin) }}</td>
				<td>
					<span
						:class="useMisc().getBookStatusBadgeClass(reserva.estado)"
						class="badge"
					>
						{{ reserva.estado }}
					</span>
				</td>
				<td>${{ reserva.costo_total }}</td>
				<td class="d-flex justify-content-between align-items-center">
					<button
						class="btn btn-primary me-1"
						@click="openEditReservaModal(reserva)"
						title="Editar"
					>
						✏️
					</button>
					<button
						class="btn btn-danger ms-1"
						@click="deleteReserva(reserva)"
						title="Eliminar"
					>
						🗑️
					</button>
				</td>
			</tr>
		</tbody>
	</table>

	<!-- Modal para editar reserva -->
	<Modal
		v-model="showEditReservaModal"
		:title="`Editar Reserva`"
		@close="closeEditReservaModal"
	>
		<form @submit.prevent="updateReserva()">
			<div>
				<label>Número de Habitación *</label>
				<select v-model="reservaForm.id_habitacion" required>
					<option
						v-for="hab in habitaciones"
						:key="hab.id_habitacion"
						:value="hab.id_habitacion"
					>
						{{ hab.numero }}
					</option>
				</select>
			</div>

			<div>
				<label>Número de huéspedes *</label>
				<input
					type="number"
					min="1"
					v-model.number="reservaForm.num_huespedes"
					required
				/>
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
				<button class="btn btn-success m-2" type="submit">Actualizar</button>
				<button
					type="button"
					class="btn btn-danger m-2"
					@click="closeEditReservaModal"
				>
					Cancelar
				</button>
			</div>
		</form>
	</Modal>

	<!-- Modal para crear reserva -->
	<Modal
		v-model="showCreateReservaModal"
		:title="`Crear Reserva`"
		@close="closeCreateReservaModal"
	>
		<form @submit.prevent="createReserva()">
			<div>
				<label>Usuario *</label>
				<select v-model="reservaCreateForm.auth_id_usuario" required>
					<option value="" disabled>Selecciona un usuario</option>
					<option
						v-for="user in users"
						:key="user.auth_id"
						:value="user.auth_id"
					>
						{{ user.nombre }} - {{ user.email }}
					</option>
				</select>
			</div>

			<div>
				<label>Número de Habitación *</label>
				<select v-model="reservaCreateForm.id_habitacion" required>
					<option value="" disabled>Selecciona una habitación</option>
					<option
						v-for="hab in habitaciones"
						:key="hab.id_habitacion"
						:value="hab.id_habitacion"
					>
						{{ hab.numero }}
					</option>
				</select>
			</div>

			<div>
				<label>Número de huéspedes *</label>
				<input
					type="number"
					min="1"
					v-model.number="reservaCreateForm.num_huespedes"
					required
				/>
			</div>

			<div>
				<div>
					<label>Fecha Inicio *</label>
					<input
						type="date"
						v-model="reservaCreateForm.fecha_inicio"
						required
					/>
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
				<input
					type="number"
					v-model.number="reservaCreateForm.costo_total"
					min="0"
				/>
			</div>

			<div>
				<label>Observaciones</label>
				<textarea v-model="reservaCreateForm.observaciones"></textarea>
			</div>

			<div>
				<button class="btn btn-primary" type="submit">Crear</button>
				<button
					type="button"
					class="btn btn-danger"
					@click="closeCreateReservaModal"
				>
					Cancelar
				</button>
			</div>
		</form>
	</Modal>
</template>
