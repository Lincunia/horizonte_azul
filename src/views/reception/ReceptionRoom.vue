<script setup lang="ts">
import { useMisc } from "../../composables/useMisc.ts";
const props = defineProps<{
	filteredRooms: any[];
	filteredText: string;
	filteredStatus: string;
}>();

const emit = defineEmits<{
	"update:filteredText": [value: string];
	"update:filteredStatus": [value: string];
}>();
</script>
<template>
	<div class="container">
		<div class="mb-3">
			<h2>Buscar Habitaciones</h2>
		</div>
		<div class="mb-3">
			<label class="form-label"> Número o tipo de habitación </label>
			<input
				:value="filteredText"
				@input="
					emit('update:filteredText', ($event.target as HTMLInputElement).value)
				"
				type="text"
				class="form-control"
			/>
		</div>
		<div class="mb-3">
			<select
				:value="filteredStatus"
				@change="
					emit(
						'update:filteredStatus',
						($event.target as HTMLSelectElement).value,
					)
				"
				class="form-select"
			>
				<option value="">Estado</option>
				<option>Disponible</option>
				<option>Ocupada</option>
				<option>Mantenimiento</option>
			</select>
		</div>
	</div>

	<table class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">Habitación</th>
				<th scope="col">Tipo</th>
				<th scope="col">Estado</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="h in filteredRooms" :key="h.id_habitacion">
				<td scope="row">{{ h.numero }}</td>
				<td>{{ h.tipo }}</td>

				<td>
					<span
						:class="useMisc().getRoomStatusBadgeClass(h.estado)"
						class="badge"
					>
						{{ h.estado }}
					</span>
				</td>
			</tr>
			<tr v-if="filteredRooms.length === 0">
				<td colspan="3">No hay habitaciones disponibles</td>
			</tr>
		</tbody>
	</table>
</template>
