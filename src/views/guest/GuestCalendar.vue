<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { useMisc } from "../../composables/useMisc.ts";
import type { ReservationStatus } from "../../composables/dbInformation.ts";
import LoaderMessage from "../../components/LoaderMessage.vue";
import Calendar from "../../components/Calendar.vue";

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
				"id_reserva, fecha_inicio, fecha_fin, estado, " +
					"habitacion:habitaciones!inner(numero)",
			)
			.eq("auth_id_usuario", userData.user.id)
			.in("estado", ["Confirmada", "Pendiente"])) as {
			data: ReservaWithHabitacion[] | null;
			error: any;
		};

		if (error) throw error;

		events.value = (data || []).map((reservation) => ({
			reservationId: reservation.id_reserva,
			title: `Hab. ${reservation.habitacion.numero} - ${
				reservation.estado === "Confirmada" ? "✓" : "⏳"
			}`,
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

const getEventsForDay = (day: Date | null) => {
	if (!day) return [];
	return events.value.filter((event) => {
		const eventStart = new Date(event.start);
		const eventEnd = new Date(event.end);
		const currentDay = new Date(day);

		eventStart.setHours(0, 0, 0, 0);
		eventEnd.setHours(0, 0, 0, 0);
		currentDay.setHours(0, 0, 0, 0);

		return currentDay >= eventStart && currentDay <= eventEnd;
	});
};

onMounted(() => {
	fetchCalendarEvents();
	useToast().hideMessage();
});
</script>

<template>
	<div class="container py-4">
		<LoaderMessage v-if="loading" message="Cargando calendario..." />

		<Calendar
			v-else
			:current-date="currentDate"
			@update:current-date="currentDate = $event"
		>
			<template #header>
				<h2>📅 Calendario de Reservas</h2>
				<p class="text-muted">Visualiza tus próximas estadías</p>
			</template>

			<template #day-content="{ day }">
				<div
					v-if="getEventsForDay(day).length > 0"
					class="d-flex flex-column gap-1"
				>
					<div
						v-for="event in getEventsForDay(day)"
						:key="event.reservationId"
						class="badge rounded-pill mb-1 w-100"
						:class="useMisc().getBookStatusBadgeClass(event.estado)"
						:title="`Habitación ${event.room_number} - ${event.estado}`"
						style="font-size: 0.7rem; font-weight: 500; cursor: pointer"
					>
						{{ event.title }}
					</div>
				</div>
			</template>

			<!-- Legend using only Bootstrap classes -->
			<template #footer>
				<div class="mt-4 pt-3 border-top">
					<div class="d-flex justify-content-center gap-4 flex-wrap">
						<div class="d-flex align-items-center gap-2">
							<div
								class="bg-success rounded"
								style="width: 20px; height: 20px"
							></div>
							<span class="text-secondary small">Reserva Confirmada</span>
						</div>
						<div class="d-flex align-items-center gap-2">
							<div
								class="bg-warning rounded"
								style="width: 20px; height: 20px"
							></div>
							<span class="text-secondary small">Reserva Pendiente</span>
						</div>
						<div class="d-flex align-items-center gap-2">
							<div
								class="bg-primary rounded"
								style="width: 20px; height: 20px"
							></div>
							<span class="text-secondary small">Hoy</span>
						</div>
					</div>
				</div>
			</template>
		</Calendar>
	</div>
</template>

<style scoped>
/* Only keep styles that aren't easily replaced by Bootstrap */
@media (max-width: 576px) {
	.calendar-day-cell.has-event::after {
		content: "●";
		display: block;
		text-align: center;
		color: #0d6efd;
		font-size: 0.8rem;
	}
}
</style>
