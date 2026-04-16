<script setup lang="ts">
import { ref, computed } from "vue";

const habitaciones = ref([
  { numero: 101, tipo: "Individual", estado: "Disponible", precio: 100000 },
  { numero: 203, tipo: "Doble", estado: "Ocupada", precio: 180000 }
]);

const filtroTexto = ref("");
const filtroEstado = ref("");

const habitacionesFiltradas = computed(() => {
  return habitaciones.value.filter(h => {
    return (
      (h.numero.toString().includes(filtroTexto.value) ||
        h.tipo.toLowerCase().includes(filtroTexto.value.toLowerCase())) &&
      (filtroEstado.value === "" || h.estado === filtroEstado.value)
    );
  });
});

const reservas = ref([
  {
    id: 1,
    cliente: "Juan Pérez",
    habitacion: 101,
    entrada: "2026-04-15",
    salida: "2026-04-18",
    estado: "Activa"
  }
]);

const nuevaReserva = ref({
  cliente: "",
  habitacion: "",
  entrada: "",
  salida: ""
});

const crearReserva = () => {
  reservas.value.push({
    id: Date.now(),
    ...nuevaReserva.value,
    estado: "Activa"
  });
};

const cancelarReserva = (id: number) => {
  reservas.value = reservas.value.map(r =>
    r.id === id ? { ...r, estado: "Cancelada" } : r
  );
};

const modificarReserva = (reserva: any) => {
  nuevaReserva.value = { ...reserva };
};

const checkIn = (reserva: any) => {
  reserva.estado = "Check-in";
};

const checkOut = (reserva: any) => {
  reserva.estado = "Finalizada";
};

const calcularDias = (entrada: string, salida: string) => {
  const inicio = new Date(entrada);
  const fin = new Date(salida);
  const diff = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
  return diff || 1;
};

const generarFactura = (reserva: any) => {
  const habitacion = habitaciones.value.find(
    h => h.numero == reserva.habitacion
  );

  if (!habitacion) {
    alert("Habitación no encontrada");
    return;
  }

  const dias = calcularDias(reserva.entrada, reserva.salida);
  const total = dias * habitacion.precio;

  alert(`
    FACTURA
    ------------------------
    Cliente: ${reserva.cliente}
    Habitación: ${reserva.habitacion}
    Días: ${dias}
    Precio por noche: $${habitacion.precio}
    TOTAL: $${total}
  `);
};
</script>

<template>
	<div class="recepcion-container">
		<h1>Panel de Recepcionista</h1>

		<section>
			<h2>Buscar Habitaciones</h2>

			<div>
				<input v-model="filtroTexto" type="text" placeholder="Número o tipo de habitación" />
				<select v-model="filtroEstado">
  					<option value="">Estado</option>
					<option>Disponible</option>
					<option>Ocupada</option>
					<option>Mantenimiento</option>
				</select>
				<button>Buscar</button>
			</div>

			<table>
				<thead>
					<tr>
						<th>Habitación</th>
						<th>Tipo</th>
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="h in habitacionesFiltradas" :key="h.numero">
						<td>{{ h.numero }}</td>
						<td>{{ h.tipo }}</td>
						<td>{{ h.estado }}</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section>
			<h2>Gestión de Reservas</h2>

			<div>
				<input v-model="nuevaReserva.cliente" type="text" placeholder="Nombre del cliente" />
				<input v-model="nuevaReserva.entrada" type="date" />
				<input v-model="nuevaReserva.salida" type="date" />
				<select v-model="nuevaReserva.habitacion">
					<option disabled value="">Habitación</option>
					<option v-for="h in habitaciones" :key="h.numero" :value="h.numero">
						{{ h.numero }}
					</option>
				</select>

				<button @click="crearReserva">Crear Reserva</button>

			</div>

 			<table>
				<thead>
					<tr>
						<th>Cliente</th>
						<th>Habitación</th>
						<th>Entrada</th>
						<th>Salida</th>
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="reserva in reservas" :key="reserva.id">
						<td>{{ reserva.cliente }}</td>
						<td>{{ reserva.habitacion }}</td>
						<td>{{ reserva.entrada }}</td>
						<td>{{ reserva.salida }}</td>
						<td>{{ reserva.estado }}</td>
						<td>
							<button @click="modificarReserva(reserva)">Modificar</button>
							<button @click="cancelarReserva(reserva.id)">Cancelar</button>
							<button @click="generarFactura(reserva)">Facturar</button>
						</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section>
			<h2>Check-in / Check-out</h2>

			<table>
				<thead>
					<tr>
						<th>Cliente</th>
						<th>Habitación</th>
						<th>Entrada</th>
						<th>Salida</th>
						<th>Acción</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Ana Gómez</td>
						<td>203</td>
						<td>2026-04-13</td>
						<td>2026-04-16</td>
						<td>
							<button>Check-in</button>
							<button>Check-out</button>
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	</div>
</template>
