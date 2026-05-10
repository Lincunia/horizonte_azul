<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { ReservationStatus } from "../../composables/dbInformation.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";

interface CalendarEvent {
	reservationId: number;
	title: string;
	start: string;
	end: string;
	room_number: number;
	estado: ReservationStatus;
}
type ReservaWithHabitacion = {
	id_reserva: number; 
	fecha_inicio: string;
	fecha_fin: string;
	estado: ReservationStatus;
	habitacion: {
		numero: number;
	};
};

const events = ref<CalendarEvent[]>([]);
const loading = ref(true);
const currentDate = ref(new Date());

const fetchCalendarEvents = async () => {
	try {
		const { data: userData } = await supabase.auth.getUser();

		if (!userData.user) return;

		const { data, error } = (await supabase
			.from("reservas")
			.select(
				`
        id_reserva,
        fecha_inicio,
        fecha_fin,
        estado,
        habitacion:habitaciones!inner(numero)
      `,
			)
			.eq("auth_id_usuario", userData.user.id)
			.in("estado", ["Confirmada", "Pendiente"])) as {
			data: ReservaWithHabitacion[] | null;
			error: any;
		};

		if (error) throw error;

		events.value = (data || []).map((reservation) => ({
			reservationId: reservation.id_reserva,
			title: `Hab. ${reservation.habitacion.numero} - ${reservation.estado === "Confirmada" ? "✓" : "⏳"}`,
			start: reservation.fecha_inicio,
			end: reservation.fecha_fin,
			room_number: reservation.habitacion.numero,
			estado: reservation.estado,
		}));
	} catch (error) {
		console.error("Error fetching calendar events:", error);
		useToast().showMessage("alert alert-danger", "Error al cargar calendario");
	} finally {
		loading.value = false;
	}
};

const getDaysInMonth = (date: Date) => {
	const year = date.getFullYear();
	const month = date.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const days = [];

	// Add empty cells for days before first day of month
	const firstDayOfWeek = firstDay.getDay();
	for (let i = 0; i < firstDayOfWeek; i++) {
		days.push(null);
	}

	// Add days of month
	for (let i = 1; i <= lastDay.getDate(); i++) {
		days.push(new Date(year, month, i));
	}

	return days;
};

const getEventsForDay = (day: Date | null) => {
	if (!day) return [];
	return events.value.filter((event) => {
		const eventStart = new Date(event.start);
		const eventEnd = new Date(event.end);
		const currentDay = new Date(day);

		// Reset time to compare dates only
		eventStart.setHours(0, 0, 0, 0);
		eventEnd.setHours(0, 0, 0, 0);
		currentDay.setHours(0, 0, 0, 0);

		return currentDay >= eventStart && currentDay <= eventEnd;
	});
};

const prevMonth = () => {
	currentDate.value = new Date(
		currentDate.value.getFullYear(),
		currentDate.value.getMonth() - 1,
	);
};

const nextMonth = () => {
	currentDate.value = new Date(
		currentDate.value.getFullYear(),
		currentDate.value.getMonth() + 1,
	);
};

const goToToday = () => {
	currentDate.value = new Date();
};

const isToday = (day: Date | null) => {
	if (!day) return false;
	const today = new Date();
	return (
		day.getDate() === today.getDate() &&
		day.getMonth() === today.getMonth() &&
		day.getFullYear() === today.getFullYear()
	);
};

onMounted(() => {
	fetchCalendarEvents();
	useToast().hideMessage();
});
</script>

<template>
	<div class="container py-4">
		<!-- Header con controles -->
		<header class="text-center mb-4">
			<h2>📅 Calendario de Reservas</h2>
			<p class="text-muted">Visualiza tus próximas estadías</p>

			<div class="btn-group" role="group">
				<button class="btn btn-outline-secondary" @click="prevMonth">
					← Mes anterior
				</button>
				<button class="btn btn-primary" @click="goToToday">Hoy</button>
				<button class="btn btn-outline-secondary" @click="nextMonth">
					Mes siguiente →
				</button>
			</div>
		</header>

		<div class="text-center mb-4">
			<h3 class="text-capitalize">
				{{
					currentDate.toLocaleString("es", { month: "long", year: "numeric" })
				}}
			</h3>
		</div>

		<LoaderMessage v-if="loading" message="Cargando calendario..." />

		<div v-else>
			<!-- Días de la semana -->
			<div class="row g-0 mb-2">
				<div class="col weekday-header">Dom</div>
				<div class="col weekday-header">Lun</div>
				<div class="col weekday-header">Mar</div>
				<div class="col weekday-header">Mié</div>
				<div class="col weekday-header">Jue</div>
				<div class="col weekday-header">Vie</div>
				<div class="col weekday-header">Sáb</div>
			</div>

			<!-- Grid de días -->
			<div class="calendar-grid">
				<div
					v-for="(day, index) in getDaysInMonth(currentDate)"
					:key="index"
					class="calendar-day-cell"
					:class="{
						'bg-light': !day,
						'border-primary': day && isToday(day),
					}"
				>
					<div v-if="day" class="calendar-day-content">
						<div
							class="day-number mb-2"
							:class="{ 'today-circle': isToday(day) }"
						>
							{{ day.getDate() }}
						</div>

						<div
							v-if="getEventsForDay(day).length > 0"
							class="events-container"
						>
							<div
								v-for="event in getEventsForDay(day)"
								:key="event.reservationId"
								class="event-badge mb-1"
								:class="{
									'event-confirmed': event.estado === 'Confirmada',
									'event-pending': event.estado === 'Pendiente',
								}"
								:title="`Habitación ${event.room_number} - ${event.estado}`"
							>
								<small>{{ event.title }}</small>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Leyenda -->
		<div class="legend-container mt-4 pt-3 border-top">
			<div class="row justify-content-center g-3">
				<div class="col-auto">
					<div class="d-flex align-items-center gap-2">
						<div class="legend-color bg-success"></div>
						<span class="small">Reserva Confirmada</span>
					</div>
				</div>
				<div class="col-auto">
					<div class="d-flex align-items-center gap-2">
						<div class="legend-color bg-warning"></div>
						<span class="small">Reserva Pendiente</span>
					</div>
				</div>
				<div class="col-auto">
					<div class="d-flex align-items-center gap-2">
						<div class="legend-color bg-primary"></div>
						<span class="small">Hoy</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.weekday-header {
	text-align: center;
	font-weight: 600;
	padding: 0.75rem;
	background-color: #f8f9fa;
	border: 1px solid #dee2e6;
	font-size: 0.9rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.calendar-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	border: 1px solid #dee2e6;
	border-top: none;
}

.calendar-day-cell {
	min-height: 120px;
	border-right: 1px solid #dee2e6;
	border-bottom: 1px solid #dee2e6;
	background-color: white;
	transition: all 0.2s ease;
}

.calendar-day-cell:nth-child(7n) {
	border-right: none;
}

.calendar-day-content {
	padding: 0.5rem;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.day-number {
	font-size: 1rem;
	font-weight: 500;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	transition: all 0.2s ease;
}

.today-circle {
	background-color: #0d6efd;
	color: white;
	font-weight: bold;
}

.events-container {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.event-badge {
	padding: 0.25rem 0.5rem;
	border-radius: 6px;
	font-size: 0.7rem;
	font-weight: 500;
	text-align: center;
	cursor: pointer;
	transition: transform 0.1s ease;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.event-badge:hover {
	transform: scale(1.02);
}

.event-confirmed {
	background-color: #d1e7dd;
	color: #0a3622;
	border-left: 3px solid #198754;
}

.event-pending {
	background-color: #fff3cd;
	color: #856404;
	border-left: 3px solid #ffc107;
}

.legend-color {
	width: 20px;
	height: 20px;
	border-radius: 4px;
}

/* Efecto hover en celdas */
.calendar-day-cell:not(.bg-light):hover {
	background-color: #f8f9fa;
	transform: translateY(-2px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	z-index: 1;
	position: relative;
}

/* Responsive */
@media (max-width: 768px) {
	.calendar-day-cell {
		min-height: 100px;
	}

	.weekday-header {
		font-size: 0.75rem;
		padding: 0.5rem;
	}

	.day-number {
		width: 28px;
		height: 28px;
		font-size: 0.85rem;
	}

	.event-badge {
		font-size: 0.6rem;
		padding: 0.15rem 0.3rem;
		white-space: normal;
		word-break: break-word;
	}

	.calendar-wrapper {
		padding: 0.5rem;
	}
}

@media (max-width: 576px) {
	.calendar-day-cell {
		min-height: 80px;
	}

	.calendar-day-content {
		padding: 0.25rem;
	}

	.event-badge {
		display: none; /* Ocultar textos en móvil muy pequeño */
	}

	.calendar-day-cell.has-event::after {
		content: "●";
		display: block;
		text-align: center;
		color: #0d6efd;
		font-size: 0.8rem;
	}
}
</style>
