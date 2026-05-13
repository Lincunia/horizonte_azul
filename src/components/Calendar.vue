<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
	currentDate?: Date;
}>();

const emit = defineEmits<{
	(e: "update:currentDate", date: Date): void;
	(e: "monthChange", date: Date): void;
}>();

const internalCurrentDate = ref(props.currentDate || new Date());

const currentDate = computed({
	get: () => props.currentDate || internalCurrentDate.value,
	set: (value: Date) => {
		if (props.currentDate) {
			emit("update:currentDate", value);
		} else {
			internalCurrentDate.value = value;
		}
		emit("monthChange", value);
	},
});

const getDaysInMonth = (date: Date) => {
	const year = date.getFullYear();
	const month = date.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const days = [];

	const firstDayOfWeek = firstDay.getDay();
	for (let i = 0; i < firstDayOfWeek; i++) {
		days.push(null);
	}

	for (let i = 1; i <= lastDay.getDate(); i++) {
		days.push(new Date(year, month, i));
	}

	return days;
};

const daysInMonth = computed(() => getDaysInMonth(currentDate.value));

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
</script>

<template>
	<div class="calendar-container">
		<!-- Header con controles -->
		<header class="text-center mb-4">
			<slot name="header">
				<h2>📅 Calendario</h2>
			</slot>

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
				v-for="(day, index) in daysInMonth"
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
					<slot name="day-content" :day="day"></slot>
				</div>
			</div>
		</div>
		<slot name="footer"></slot>
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

.calendar-day-cell:not(.bg-light):hover {
	background-color: #f8f9fa;
	transform: translateY(-2px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	z-index: 1;
	position: relative;
}

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
}

@media (max-width: 576px) {
	.calendar-day-cell {
		min-height: 80px;
	}

	.calendar-day-content {
		padding: 0.25rem;
	}
}
</style>
