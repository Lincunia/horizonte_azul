<script setup lang="ts">
const props = defineProps<{
	filteredOperativoReservations: any[];
}>();

const emit = defineEmits<{
	checkIn: [reserva: any];
	checkOut: [reserva: any];
}>();
</script>

<template>
	<h2>Check-in / Check-out</h2>

	<p v-if="filteredOperativoReservations.length === 0">
		No hay operaciones pendientes
	</p>
	<table v-else class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">Cliente</th>
				<th scope="col">Habitación</th>
				<th scope="col">Entrada</th>
				<th scope="col">Salida</th>
				<th scope="col">Estado</th>
				<th scope="col">Acción</th>
			</tr>
		</thead>

		<tbody>
			<tr v-for="reserva in filteredOperativoReservations" :key="reserva.id">
				<td scope="row">{{ reserva.cliente }}</td>
				<td>{{ reserva.habitacion }}</td>
				<td>{{ reserva.entrada }}</td>
				<td>{{ reserva.salida }}</td>

				<td>
					<span
						:class="{
							estado: true,
							confirmada: reserva.estado === 'Confirmada',
							checkin: reserva.estado === 'Check-in',
						}"
					>
						{{ reserva.estado }}
					</span>
				</td>

				<td>
					<button
						v-if="reserva.estado === 'Confirmada'"
						@click="emit('checkIn', reserva)"
						class="btn-checkin"
					>
						Check-in
					</button>

					<button
						v-else-if="reserva.estado === 'Check-in'"
						@click="emit('checkOut', reserva)"
						class="btn-checkout"
					>
						Check-out
					</button>
				</td>
			</tr>
		</tbody>
	</table>
</template>
