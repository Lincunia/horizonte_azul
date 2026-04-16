<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { useRouter } from "vue-router";

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

const rooms = ref<Habitacion[]>([]);
const loading = ref(true);
const router = useRouter();

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
		useToast().showMessage("error", "Error al cargar habitaciones");
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

const getTipoTexto = (tipo: string) => {
	const textos = {
		Individual: "Individual",
		Doble: "Doble",
		Suite: "Suite",
		Familiar: "Familiar",
	};
	return textos[tipo as keyof typeof textos] || tipo;
};

const reservarHabitacion = (habitacion: Habitacion) => {
	if (habitacion.estado == "Libre") {
		router.push({
			path: "/guest/reservar",
			query: {
				id: habitacion.id_habitacion.toString(),
				numero: habitacion.numero.toString(),
				precio: habitacion.precio_noche.toString(),
			},
		});
	}
};

onMounted(() => {
	fetchRooms();
	useToast().hideMessage();
});
</script>

<template>
	<div class="guest-dashboard">
		<div class="dashboard-header">
			<h2>🏨 Habitaciones Disponibles</h2>
			<p>Encuentra la habitación perfecta para tu estadía</p>
		</div>

		<div v-if="loading" class="loading">
			<div class="spinner"></div>
			<p>Cargando habitaciones...</p>
		</div>

		<div v-else-if="rooms.length === 0" class="empty-state">
			<p>😕 No hay habitaciones disponibles en este momento</p>
		</div>

		<div v-else class="rooms-grid">
			<div v-for="room in rooms" :key="room.id_habitacion" class="room-card">
				<div class="room-header">
					<span class="room-icon">{{ getTipoIcon(room.tipo) }}</span>
					<span class="room-number">Habitación #{{ room.numero }}</span>
				</div>

				<div class="room-body">
					<h3>{{ getTipoTexto(room.tipo) }}</h3>

					<div class="room-details">
						<div class="detail">
							<span>Capacidad:</span>
							<span>{{ room.capacidad }} personas</span>
						</div>
						<div class="detail">
							<span>Piso:</span>
							<span>{{ room.piso }}°</span>
						</div>
						<div v-if="room.vista" class="detail">
							<span>Vista:</span>
							<span>{{ room.vista }}</span>
						</div>
						<div class="detail">
							<span>Estado:</span>
							<span>{{ room.estado }}</span>
						</div>
					</div>

					<div class="room-price">
						<span class="price">${{ room.precio_noche }}</span>
						<span class="per-night">/ noche</span>
					</div>
				</div>

				<div class="room-footer">
					<button class="btn btn-primary" @click="reservarHabitacion(room)">
						Reservar Ahora
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.guest-dashboard {
	padding: 2rem;
	max-width: 1400px;
	margin: 0 auto;
}

.dashboard-header {
	text-align: center;
	margin-bottom: 2rem;
}

.dashboard-header h2 {
	font-size: 2rem;
	margin-bottom: 0.5rem;
}

.rooms-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: 1.5rem;
}

.room-card {
	background: white;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	transition:
		transform 0.3s ease,
		box-shadow 0.3s ease;
}

.room-header {
	background: var(--naranja);
	padding: 1rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	color: white;
}

.room-icon {
	font-size: 1.5rem;
}

.room-number {
	font-weight: bold;
	background: rgba(255, 255, 255, 0.2);
	padding: 0.25rem 0.75rem;
	border-radius: 20px;
	font-size: 0.875rem;
}

.room-body {
	padding: 1.5rem;
}

.room-body h3 {
	margin: 0 0 1rem 0;
	color: #2c3e50;
	font-size: 1.25rem;
}

.room-details {
	margin-bottom: 1rem;
}

.detail {
	display: flex;
	justify-content: space-between;
	padding: 0.5rem 0;
	border-bottom: 1px solid #ecf0f1;
}

.room-price {
	margin-top: 1rem;
	text-align: right;
}

.price {
	font-size: 1.5rem;
	font-weight: bold;
	color: var();
}

.per-night {
	color: #7f8c8d;
	font-size: 0.875rem;
}

.room-footer {
	padding: 1rem 1.5rem 1.5rem;
}


.loading {
	text-align: center;
	padding: 3rem;
}

.spinner {
	border: 3px solid #f3f3f3;
	border-top: 3px solid #667eea;
	border-radius: 50%;
	width: 40px;
	height: 40px;
	animation: spin 1s linear infinite;
	margin: 0 auto 1rem;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.empty-state {
	text-align: center;
	padding: 3rem;
}
</style>
