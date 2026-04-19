<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

interface CalendarEvent {
	id_reserva: number;
	title: string;
	start: string;
	end: string;
	habitacion_numero: number;
	estado: string;
}

const events = ref<CalendarEvent[]>([]);
const loading = ref(true);
const currentDate = ref(new Date());

const fetchCalendarEvents = async () => {
	try {
		const { data: userData } = await supabase.auth.getUser();

		if (!userData.user) return;

		const { data, error } = await supabase
			.from("reservas")
			.select(
				`
        id_reserva,
        fecha_inicio,
        fecha_fin,
        estado,
        habitaciones (
          numero
        )
      `,
			)
			.eq("auth_id_usuario", userData.user.id)
			.in("estado", ["Confirmada", "Pendiente"]);

		if (error) throw error;

		events.value = (data || []).map((reserva) => ({
			id_reserva: reserva.id_reserva,
			title: `Hab. ${reserva.habitaciones.numero} - ${reserva.estado === "Confirmada" ? "✓" : "⏳"}`,
			start: reserva.fecha_inicio,
			end: reserva.fecha_fin,
			habitacion_numero: reserva.habitaciones.numero,
			estado: reserva.estado,
		}));
	} catch (error) {
		console.error("Error fetching calendar events:", error);
		useToast().showMessage("error", "Error al cargar calendario");
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

const getEventClass = (estado: string) => {
	return estado === "Confirmada" ? "event-confirmed" : "event-pending";
};

onMounted(() => {
	fetchCalendarEvents();
	useToast().hideMessage();
});
</script>

<template>
	<div class="guest-calendar">
		<div class="calendar-header">
			<div>
				<h2>📅 Calendario de Reservas</h2>
				<p class="subtitle">Visualiza tus próximas estadías</p>
			</div>
			<div class="month-navigation">
				<button @click="prevMonth" class="btn-nav">←</button>
				<button @click="goToToday" class="btn-today">Hoy</button>
				<button @click="nextMonth" class="btn-nav">→</button>
			</div>
		</div>

		<div class="calendar-month">
			<h3>
				{{
					currentDate.toLocaleString("es", { month: "long", year: "numeric" })
				}}
			</h3>
		</div>

		<div v-if="loading" class="loading">
			<div class="spinner"></div>
			<p>Cargando calendario...</p>
		</div>

		<div v-else class="calendar-container">
			<div class="calendar-weekdays">
				<div>Dom</div>
				<div>Lun</div>
				<div>Mar</div>
				<div>Mié</div>
				<div>Jue</div>
				<div>Vie</div>
				<div>Sáb</div>
			</div>

			<div class="calendar-days">
				<div
					v-for="(day, index) in getDaysInMonth(currentDate)"
					:key="index"
					:class="[
						'calendar-day',
						{
							empty: !day,
							today: isToday(day),
							'has-events': day && getEventsForDay(day).length > 0,
						},
					]"
				>
					<div v-if="day" class="day-content">
						<div class="day-number">{{ day.getDate() }}</div>
						<div v-if="getEventsForDay(day).length > 0" class="day-events">
							<div
								v-for="event in getEventsForDay(day)"
								:key="event.id_reserva"
								:class="['event-badge', getEventClass(event.estado)]"
								:title="`Habitación ${event.habitacion_numero} - ${event.estado}`"
							>
								{{ event.title }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="calendar-legend">
			<div class="legend-item">
				<span class="legend-color confirmed"></span>
				<span>Reserva Confirmada</span>
			</div>
			<div class="legend-item">
				<span class="legend-color pending"></span>
				<span>Reserva Pendiente</span>
			</div>
			<div class="legend-item">
				<span class="legend-color today"></span>
				<span>Hoy</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.guest-calendar {
	padding: 2rem;
	max-width: 1400px;
	margin: 0 auto;
}

.calendar-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 2rem;
	flex-wrap: wrap;
	gap: 1rem;
}

.calendar-header h2 {
	font-size: 2rem;
	color: #2c3e50;
	margin-bottom: 0.5rem;
}

.subtitle {
	color: #7f8c8d;
}

.month-navigation {
	display: flex;
	gap: 0.5rem;
	align-items: center;
}

.btn-nav,
.btn-today {
	background: white;
	border: 1px solid #ddd;
	padding: 0.5rem 1rem;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.btn-nav:hover,
.btn-today:hover {
	background: #667eea;
	color: white;
	border-color: #667eea;
}

.calendar-month {
	text-align: center;
	margin-bottom: 1.5rem;
}

.calendar-month h3 {
	font-size: 1.5rem;
	color: #2c3e50;
	text-transform: capitalize;
}

.calendar-container {
	background: white;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.calendar-weekdays {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
}

.calendar-weekdays div {
	padding: 1rem;
	text-align: center;
	font-weight: 600;
}

.calendar-days {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	min-height: 500px;
}

.calendar-day {
	border-right: 1px solid #e9ecef;
	border-bottom: 1px solid #e9ecef;
	min-height: 100px;
	background: white;
}

.calendar-day.empty {
	background: #f8f9fa;
}

.calendar-day.today {
	background: #fff3cd;
}

.calendar-day.has-events {
	background: #f0f8ff;
}

.day-content {
	padding: 0.5rem;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.day-number {
	font-size: 0.875rem;
	font-weight: 600;
	color: #2c3e50;
	margin-bottom: 0.5rem;
}

.today .day-number {
	color: #e74c3c;
	font-size: 1rem;
}

.day-events {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	flex: 1;
}

.event-badge {
	font-size: 0.7rem;
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	cursor: pointer;
	transition: transform 0.2s ease;
}

.event-badge:hover {
	transform: scale(1.05);
}

.event-confirmed {
	background: #27ae60;
	color: white;
}

.event-pending {
	background: #f39c12;
	color: white;
}

.calendar-legend {
	display: flex;
	justify-content: center;
	gap: 2rem;
	margin-top: 2rem;
	padding: 1rem;
	background: white;
	border-radius: 8px;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.legend-color {
	width: 20px;
	height: 20px;
	border-radius: 4px;
}

.legend-color.confirmed {
	background: #27ae60;
}

.legend-color.pending {
	background: #f39c12;
}

.legend-color.today {
	background: #fff3cd;
	border: 1px solid #e74c3c;
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

@media (max-width: 768px) {
	.guest-calendar {
		padding: 1rem;
	}

	.calendar-header {
		flex-direction: column;
		text-align: center;
	}

	.calendar-weekdays div {
		padding: 0.5rem;
		font-size: 0.75rem;
	}

	.event-badge {
		font-size: 0.6rem;
		padding: 0.125rem 0.25rem;
	}

	.calendar-legend {
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
}
</style>
