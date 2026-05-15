<script setup lang="ts">
const props = defineProps<{
	reservations: any[];
	filteredRooms: any[];
	newReservation: any;
	editingReservation: string | null;
}>();

const emit = defineEmits<{
	createReservation: [];
	modifyReservation: [reserva: any];
	cancelReservation: [id: number];
	resetForm: [];
	generateInvoice: [reserva: any];
}>();
</script>

<template>
	<div class="container">
		<div class="mb-3">
			<h2>Gestión de Reservas</h2>
		</div>
		<div class="mb-3">
			<label class="form-label"> Nombre del cliente</label>
			<input v-model="newReservation.cliente" type="text" class="form-control" />
		</div>
		<div class="mb-3">
			<label class="form-label">Fecha de Check-in</label>
			<input
				v-model="newReservation.fecha_inicio"
				type="date"
				class="form-control"
			/>
		</div>
		<div class="mb-3">
			<label class="form-label">Fecha de Check-out</label>
			<input
				v-model="newReservation.fecha_fin"
				type="date"
				class="form-control"
			/>
		</div>
		<div class="mb-3">
			<label class="form-label"> Número de huéspedes </label>
			<input
				v-model.number="newReservation.num_huespedes"
				type="number"
				min="1"
				class="form-control"
			/>
		</div>
		<div class="mb-3">
			<label class="form-label"> Habitación </label>
			<select v-model="newReservation.id_habitacion" class="form-select">
				<option
					v-for="h in filteredRooms.filter(
						(h) => h.estado === 'Disponible',
					)"
					:key="h.id_habitacion"
					:value="h.id_habitacion"
				>
					{{ h.numero }}
				</option>
			</select>
		</div>

		<button
			@click="emit('createReservation')"
			class="btn btn-primary me-1"
			title="Crear"
		>
			{{ editingReservation ? "Actualizar reserva" : "Crear reserva" }}
		</button>

		<button
			v-if="editingReservation"
			@click="emit('resetForm')"
			class="btn btn-danger me-1"
			title="Cancelar"
		>
			Cancelar edición
		</button>
	</div>

	<table class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">Cliente</th>
				<th scope="col">Habitación</th>
				<th scope="col">Entrada</th>
				<th scope="col">Salida</th>
				<th scope="col">Estado</th>
				<th scope="col">Acciones</th>
			</tr>
		</thead>

		<tbody>
			<tr v-for="reserva in reservations" :key="reserva.id">
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
							completada: reserva.estado === 'Completada',
							cancelada: reserva.estado === 'Cancelada',
						}"
					>
						{{ reserva.estado }}
					</span>
				</td>

				<td class="d-flex flex-column mb-3">
					<button
						@click="emit('modifyReservation', reserva)"
						class="btn btn-primary mb-1"
					>
						Modificar
					</button>

					<button
						@click="emit('cancelReservation', reserva.id)"
						class="btn btn-danger mb-1"
					>
						Cancelar
					</button>

					<button
						@click="emit('generateInvoice', reserva)"
						class="btn btn-secondary mb-1"
					>
						Facturar
					</button>
				</td>
			</tr>
		</tbody>
	</table>
</template>
