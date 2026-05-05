<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

interface Habitacion {
	id_habitacion: number;
	numero: number;
	tipo: "Individual" | "Doble" | "Suite" | "Familiar";
	capacidad: number;
	piso: number;
	vista: string | null;
	precio_noche: number;
	estado: "Libre" | "Reservada" | "Ocupada" | "Mantenimiento" | "Limpieza";
}

const habitaciones = ref<Habitacion[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingHabitacion = ref<Habitacion | null>(null);
const searchTerm = ref("");
const filterEstado = ref<string>("todos");
const filterTipo = ref<string>("todos");

const habitacionForm = ref({
	numero: 0,
	tipo: "Individual" as Habitacion["tipo"],
	capacidad: 1,
	piso: 1,
	vista: "",
	precio_noche: 0,
	estado: "Libre" as Habitacion["estado"],
});

const filteredHabitaciones = computed(() => {
	return habitaciones.value.filter((habitacion) => {
		const matchesSearch = searchTerm.value
			? habitacion.numero.toString().includes(searchTerm.value) ||
				habitacion.vista
					?.toLowerCase()
					.includes(searchTerm.value.toLowerCase()) ||
				habitacion.tipo.toLowerCase().includes(searchTerm.value.toLowerCase())
			: true;

		const matchesEstado =
			filterEstado.value === "todos" ||
			habitacion.estado === filterEstado.value;

		const matchesTipo =
			filterTipo.value === "todos" || habitacion.tipo === filterTipo.value;

		return matchesSearch && matchesEstado && matchesTipo;
	});
});

const loadHabitaciones = async () => {
	try {
		loading.value = true;
		const { data, error } = await supabase
			.from("habitaciones")
			.select("*")
			.order("numero", { ascending: true });
		if (error) throw error;
		habitaciones.value = data || [];
	} catch (error: any) {
		console.error("Error al cargar habitaciones:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar las habitaciones",
		);
	} finally {
		loading.value = false;
	}
};

const openEditModal = (habitacion: Habitacion) => {
	editingHabitacion.value = habitacion;
	habitacionForm.value = {
		numero: habitacion.numero,
		tipo: habitacion.tipo,
		capacidad: habitacion.capacidad,
		piso: habitacion.piso,
		vista: habitacion.vista ?? "",
		precio_noche: habitacion.precio_noche,
		estado: habitacion.estado,
	};
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
	editingHabitacion.value = null;
};

const saveHabitacion = async () => {
	try {
		if (!habitacionForm.value.numero || !habitacionForm.value.capacidad) {
			useToast().showMessage(
				"alert alert-danger",
				"Número, tipo y capacidad son requeridos",
			);
			return;
		}

		if (editingHabitacion.value) {
			const { error } = await supabase
				.from("habitaciones")
				.update({
					numero: habitacionForm.value.numero,
					tipo: habitacionForm.value.tipo,
					capacidad: habitacionForm.value.capacidad,
					piso: habitacionForm.value.piso,
					vista: habitacionForm.value.vista || null,
					precio_noche: habitacionForm.value.precio_noche,
					estado: habitacionForm.value.estado,
				})
				.eq("id_habitacion", editingHabitacion.value.id_habitacion);

			if (error) throw error;
			useToast().showMessage(
				"alert alert-success",
				"Habitación actualizada exitosamente",
			);
		} else {
			const { error } = await supabase.from("habitaciones").insert({
				numero: habitacionForm.value.numero,
				tipo: habitacionForm.value.tipo,
				capacidad: habitacionForm.value.capacidad,
				piso: habitacionForm.value.piso,
				vista: habitacionForm.value.vista || null,
				precio_noche: habitacionForm.value.precio_noche,
				estado: habitacionForm.value.estado,
			});

			if (error) throw error;
			useToast().showMessage(
				"alert alert-success",
				"Habitación creada exitosamente",
			);
		}

		closeModal();
		await loadHabitaciones();
	} catch (error: any) {
		console.error("Error al guardar habitación:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al guardar la habitación",
		);
	}
};

onMounted(() => {
	loadHabitaciones();
});
</script>

<template>
	<div>
		<div class="admin-controls">
			<div class="filters">
				<input
					type="search"
					v-model="searchTerm"
					placeholder="Buscar por número, vista o tipo"
				/>
				<select v-model="filterTipo">
					<option value="todos">Todos los tipos</option>
					<option value="Individual">Individual</option>
					<option value="Doble">Doble</option>
					<option value="Suite">Suite</option>
					<option value="Familiar">Familiar</option>
				</select>
				<select v-model="filterEstado">
					<option value="todos">Todos los estados</option>
					<option value="Libre">Libre</option>
					<option value="Reservada">Reservada</option>
					<option value="Ocupada">Ocupada</option>
					<option value="Mantenimiento">Mantenimiento</option>
					<option value="Limpieza">Limpieza</option>
				</select>
			</div>
		</div>

		<div v-if="loading" class="loading-message">Cargando habitaciones...</div>

		<table v-else class="admin-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Número</th>
					<th>Tipo</th>
					<th>Capacidad</th>
					<th>Piso</th>
					<th>Vista</th>
					<th>Precio noche</th>
					<th>Estado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="habitacion in filteredHabitaciones"
					:key="habitacion.id_habitacion"
				>
					<td>{{ habitacion.id_habitacion }}</td>
					<td>{{ habitacion.numero }}</td>
					<td>{{ habitacion.tipo }}</td>
					<td>{{ habitacion.capacidad }}</td>
					<td>{{ habitacion.piso }}</td>
					<td>{{ habitacion.vista || "N/A" }}</td>
					<td>${{ habitacion.precio_noche }}</td>
					<td>
						<span :class="['estado-badge', habitacion.estado.toLowerCase()]">{{
							habitacion.estado
						}}</span>
					</td>
					<td class="actions-cell">
						<button class="btn" @click="openEditModal(habitacion)">✏️</button>
					</td>
				</tr>
				<tr v-if="!filteredHabitaciones.length && !loading">
					<td colspan="9">No se encontraron habitaciones.</td>
				</tr>
			</tbody>
		</table>

		<div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
			<div class="modal-card">
				<h2>
					{{ editingHabitacion ? "Editar Habitación" : "Crear Habitación" }}
				</h2>

				<form @submit.prevent="saveHabitacion">
					<div class="field-row">
						<label>Número *</label>
						<input
							type="number"
							v-model.number="habitacionForm.numero"
							min="1"
							required
						/>
					</div>

					<div class="field-row">
						<label>Tipo *</label>
						<select v-model="habitacionForm.tipo" required>
							<option value="Individual">Individual</option>
							<option value="Doble">Doble</option>
							<option value="Suite">Suite</option>
							<option value="Familiar">Familiar</option>
						</select>
					</div>

					<div class="field-row">
						<label>Capacidad *</label>
						<input
							type="number"
							v-model.number="habitacionForm.capacidad"
							min="1"
							required
						/>
					</div>

					<div class="field-row">
						<label>Piso *</label>
						<input
							type="number"
							v-model.number="habitacionForm.piso"
							min="1"
							required
						/>
					</div>

					<div class="field-row">
						<label>Vista</label>
						<input type="text" v-model="habitacionForm.vista" />
					</div>

					<div class="field-row">
						<label>Precio noche *</label>
						<input
							type="number"
							v-model.number="habitacionForm.precio_noche"
							min="0"
							step="0.01"
							required
						/>
					</div>

					<div class="field-row">
						<label>Estado *</label>
						<select v-model="habitacionForm.estado" required>
							<option value="Libre">Libre</option>
							<option value="Reservada">Reservada</option>
							<option value="Ocupada">Ocupada</option>
							<option value="Mantenimiento">Mantenimiento</option>
							<option value="Limpieza">Limpieza</option>
						</select>
					</div>

					<div class="modal-actions">
						<button class="btn" type="submit">Guardar</button>
						<button class="btn btn-critical" type="button" @click="closeModal">
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
.admin-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

.filters {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	align-items: center;
}

.filters input,
.filters select {
	padding: 0.75rem 1rem;
	border: 1px solid #d1d5db;
	border-radius: 0.5rem;
	min-width: 180px;
}

.admin-table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border-radius: 0.75rem;
	overflow: hidden;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.admin-table th,
.admin-table td {
	padding: 0.9rem 1rem;
	text-align: left;
	border-bottom: 1px solid #e5e7eb;
}

.admin-table th {
	background: #f8fafc;
	color: #111827;
}

.admin-table tbody tr:nth-child(even) {
	background: #f9fafb;
}

.actions-cell {
	display: flex;
	gap: 0.5rem;
}

.btn {
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 0.5rem;
	padding: 0.65rem 1rem;
	cursor: pointer;
	transition: background 0.2s ease;
}

.btn:hover {
	background: #2563eb;
}

.btn-critical {
	background: #ef4444;
}

.btn-critical:hover {
	background: #dc2626;
}

.loading-message {
	padding: 1rem 0;
	color: #6b7280;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
	z-index: 20;
}

.modal-card {
	background: white;
	width: min(720px, 100%);
	border-radius: 1rem;
	padding: 1.5rem;
	box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
}

.field-row {
	display: grid;
	gap: 0.5rem;
	margin-bottom: 1rem;
}

.field-row label {
	font-weight: 600;
	color: #111827;
}

.field-row input,
.field-row select {
	width: 100%;
	padding: 0.8rem 1rem;
	border: 1px solid #d1d5db;
	border-radius: 0.75rem;
}

.modal-actions {
	display: flex;
	gap: 0.75rem;
	justify-content: flex-end;
	margin-top: 1rem;
}

/* Estado Badges */
.estado-badge {
	padding: 0.35rem 0.85rem;
	border-radius: 9999px;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	display: inline-block;
}

.estado-badge.libre {
	background: #dcfce7;
	color: #166534;
}

.estado-badge.reservada {
	background: #fef3c7;
	color: #92400e;
}

.estado-badge.ocupada {
	background: #dbeafe;
	color: #1e40af;
}

.estado-badge.mantenimiento {
	background: #fee2e2;
	color: #991b1b;
}

.estado-badge.limpieza {
	background: #f3e8ff;
	color: #6b21a8;
}
</style>
