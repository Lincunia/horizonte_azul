<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "../../composables/useToast.ts";
import { fetchRooms, updateRooms, insertRooms } from "../../composables/roomMethods.ts";
import { useMisc } from "../../composables/useMisc.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";
import type { Room } from "../../composables/roomMethods.ts";
import Modal from "../../components/Modal.vue";

const editingRoom = ref<Room | null>(null);
const rooms = ref<Room[]>([]);
const loading = ref(true);
const showModal = ref(false);
const searchTerm = ref("");
const filterStatus = ref<string>("todos");
const filterType = ref<string>("todos");

const roomForm = ref<Room>({
	id_habitacion: 0,
	numero: 0,
	tipo: "Individual",
	capacidad: 1,
	piso: 1,
	vista: "",
	precio_noche: 0,
	estado: "Libre"
});

const filteredRooms = computed(() => {
	return rooms.value.filter((room) => {
		const matchesSearch = searchTerm.value
			? room.numero.toString().includes(searchTerm.value) ||
				room.vista?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
				room.tipo.toLowerCase().includes(searchTerm.value.toLowerCase())
			: true;

		const matchesEstado =
			filterStatus.value === "todos" || room.estado === filterStatus.value;

		const matchesTipo =
			filterType.value === "todos" || room.tipo === filterType.value;

		return matchesSearch && matchesEstado && matchesTipo;
	});
});

const loadRooms = async () => {
	try {
		loading.value = true;
		rooms.value = await fetchRooms();
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

const openEditModal = (room: Room) => {
	editingRoom.value = room;
	roomForm.value = {
		id_habitacion: room.id_habitacion,
		numero: room.numero,
		tipo: room.tipo,
		capacidad: room.capacidad,
		piso: room.piso,
		vista: room.vista ?? "",
		precio_noche: room.precio_noche,
		estado: room.estado,
	};
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
	editingRoom.value = null;
};

const saveRoom = async () => {
	try {
		if (!roomForm.value.numero || !roomForm.value.capacidad) {
			useToast().showMessage(
				"alert alert-danger",
				"Número, tipo y capacidad son requeridos",
			);
			return;
		}

		if (editingRoom.value) {
			updateRooms(roomForm.value as Room);
			useToast().showMessage(
				"alert alert-success",
				"Habitación actualizada exitosamente",
			);
		} else {
			insertRooms (roomForm.value as Room);
			useToast().showMessage(
				"alert alert-success",
				"Habitación creada exitosamente",
			);
		}

		closeModal();
		loadRooms();
	} catch (error: any) {
		console.error("Error al guardar habitación:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al guardar la habitación",
		);
	}
};

onMounted(() => {
	loadRooms();
});
</script>

<template>
	<div class="container">
		<div class="mb-3">
			<label class="form-label"> Buscar por número, vista o tipo </label>
			<input type="search" v-model="searchTerm" class="form-control" />
		</div>
		<div class="mb-3">
			<select v-model="filterType" class="form-select">
				<option value="todos">Todos los tipos</option>
				<option>Individual</option>
				<option>Doble</option>
				<option>Suite</option>
				<option>Familiar</option>
			</select>
			<select v-model="filterStatus" class="form-select">
				<option value="todos">Todos los estados</option>
				<option>Libre</option>
				<option>Reservada</option>
				<option>Ocupada</option>
				<option>Mantenimiento</option>
				<option>Limpieza</option>
			</select>
		</div>
	</div>

	<LoaderMessage v-if="loading" visible message="Cargando habitaciones..." />
	<LoaderMessage v-else-if="rooms.length === 0" message="No hay habitaciones" />

	<table v-else class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">ID</th>
				<th scope="col">Número</th>
				<th scope="col">Tipo</th>
				<th scope="col">Capacidad</th>
				<th scope="col">Piso</th>
				<th scope="col">Vista</th>
				<th scope="col">Precio noche</th>
				<th scope="col">Estado</th>
				<th scope="col">Acciones</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="room in filteredRooms" :key="room.id_habitacion">
				<td scope="row">{{ room.id_habitacion }}</td>
				<td>{{ room.numero }}</td>
				<td>{{ room.tipo }}</td>
				<td>{{ room.capacidad }}</td>
				<td>{{ room.piso }}</td>
				<td>{{ room.vista || "N/A" }}</td>
				<td>${{ room.precio_noche }}</td>
				<td>
					<span
						:class="useMisc().getRoomStatusBadgeClass(room.estado)"
						class="badge"
						>{{ room.estado }}</span
					>
				</td>
				<td class="d-flex justify-content-between align-items-center">
					<button
						class="btn btn-primary me-1"
						@click="openEditModal(room)"
						title="Editar"
					>
						✏️
					</button>
				</td>
			</tr>
		</tbody>
	</table>

	<Modal
		v-model="showModal"
		:title="editingRoom ? 'Editar Habitación' : 'Crear Habitación'"
		@close="closeModal"
	>
		<form @submit.prevent="saveRoom" class="container-sm">
			<div class="mb-3">
				<label class="form-label">Número *</label>
				<input
					type="number"
					v-model.number="roomForm.numero"
					min="1"
					class="form-select"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Tipo *</label>
				<select v-model="roomForm.tipo" class="form-select" required>
					<option>Individual</option>
					<option>Doble</option>
					<option>Suite</option>
					<option>Familiar</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Capacidad *</label>
				<input
					type="number"
					v-model.number="roomForm.capacidad"
					min="1"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Piso *</label>
				<input
					type="number"
					v-model.number="roomForm.piso"
					min="1"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Vista</label>
				<input type="text" v-model="roomForm.vista" class="form-control" />
			</div>

			<div class="mb-3">
				<label class="form-label">Precio noche *</label>
				<input
					type="number"
					v-model.number="roomForm.precio_noche"
					min="0"
					step="0.01"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Estado *</label>
				<select v-model="roomForm.estado" class="form-select" required>
					<option>Libre</option>
					<option>Reservada</option>
					<option>Ocupada</option>
					<option>Mantenimiento</option>
					<option>Limpieza</option>
				</select>
			</div>

			<div class="d-flex justify-content-center">
				<button type="submit" class="btn btn-success m-2">Guardar</button>
				<button type="button" class="btn btn-danger m-2" @click="closeModal">
					Cancelar
				</button>
			</div>
		</form>
	</Modal>
</template>
