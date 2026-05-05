<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";
import Modal from "../../components/Modal.vue";
import GuestBook from "./GuestBook.vue";

interface Room {
	id_habitacion: number;
	numero: number;
	tipo: "Individual" | "Doble" | "Suite" | "Familiar";
	capacidad: number;
	piso: number;
	vista: string | null;
	precio_noche: number;
	estado: "Libre" | "Reservada" | "Ocupada" | "Mantenimiento" | "Limpieza";
}

const rooms = ref<Room[]>([]);
const loading = ref(true);
const showModal = ref(false);
const selectedRoom = ref<Room | null>(null);

const fetchRooms = async () => {
	try {
		const { data, error } = await supabase
			.from("habitaciones")
			.select("*")
			.order("numero", { ascending: true });

		if (error) throw error;
		rooms.value = data || [];
	} catch (error) {
		console.error("Error fetching rooms:", error);
		useToast().showMessage("alert alert-danger", "Error al cargar habitaciones");
	} finally {
		loading.value = false;
	}
};

const getTipoIcon = (tipo: string) => {
	const icons = {
		Individual: "🛏️",
		Doble: "🛏️🛏️",
		Suite: "👑",
		Familiar: "👨‍👩‍👧‍👦",
	};
	return icons[tipo as keyof typeof icons] || "🏠";
};

const bookRoom = (habitacion: Room) => {
	if (habitacion.estado == "Libre") {
		showModal.value = true;
		selectedRoom.value = habitacion;
		return;
	}
	useToast().showMessage(
		"alert alert-danger",
		`La habitacion #${habitacion.numero} no se encuentra libre`,
	);
};

const closeModal = () => {
	showModal.value = false;
	selectedRoom.value = null;
};

onMounted(() => {
	fetchRooms();
	useToast().hideMessage();
});
</script>

<template>
	<header class="text-center mb-4">
		<h2>🏨Habitaciones Disponibles</h2>
		<p class="text-muted">Encuentra la habitación perfecta para tu estadía</p>
	</header>

	<LoaderMessage v-if="loading" message="Cargando habitaciones..." />
	<LoaderMessage
		v-else-if="rooms.length === 0"
		message="😕 No hay habitaciones disponibles en este momento"
	/>

	<ul v-else class="row g-4">
		<li v-for="room in rooms" :key="room.id_habitacion" class="col-12 col-md-6">
			<div>
				<span>{{ getTipoIcon(room.tipo) }}</span>
				<span>Habitación #{{ room.numero }}</span>
			</div>

			<div class="card-body">
				<h3 class="h4 mb-3 text-primary">{{ room.tipo }}</h3>

				<div class="mb-4">
					<div class="row g-2">
						<div
							class="col-6 d-flex justify-content-between align-items-center p-2 bg-light"
						>
							<span>Capacidad:</span>
							<span>{{ room.capacidad }} personas</span>
						</div>
						<div
							class="col-6 d-flex justify-content-between align-items-center p-2 bg-light"
						>
							<span>Piso:</span>
							<span>{{ room.piso }}°</span>
						</div>
						<div v-if="room.vista"
							class="col-12 d-flex justify-content-between align-items-center p-2 bg-light"
						>

							<span>Vista:</span>
							<span>{{ room.vista }}</span>
						</div>
						<div
							class="col-12 d-flex justify-content-between align-items-center p-2 bg-light"
						>
							<span>Estado:</span>
							<span>{{ room.estado }}</span>
						</div>
					</div>
				</div>

				<div
					class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top"
				>
					<button
						class="btn btn-primary"
						@click="bookRoom(room)"
						:disabled="room.estado !== 'Libre'"
					>
						Reservar Ahora
					</button>
					<span class="mb-0 text-primary">${{ room.precio_noche }}</span>
					<span class="text-muted">/ noche</span>
				</div>
			</div>
		</li>
	</ul>
	<!-- Modal para reservar -->
	<Modal
		v-model="showModal"
		:title="`Reservar Habitación #${selectedRoom?.numero || ''}`"
		@close="closeModal"
	>
		<GuestBook
			v-if="selectedRoom"
			:room-id="selectedRoom.id_habitacion"
			:room-number="selectedRoom.numero"
			:price-per-night="selectedRoom.precio_noche"
			@reservation-complete="closeModal"
		/>
	</Modal>
</template>
