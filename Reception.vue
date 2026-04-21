<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();

const habitaciones = ref<any[]>([]);

const reservas = ref<any[]>([]);

const filtroTexto = ref("");

const filtroEstado = ref("");

const reservaEditando = ref<string | null>(null);

const nuevaReserva = ref({
	cliente: "",
	habitacion: null as number | null,
	entrada: "",
	salida: "",
	num_huespedes: 1
});

const hoy = new Date().toISOString().split("T")[0];

const cargarHabitaciones = async () => {
	const { data } = await supabase.from("habitaciones").select("*");
	habitaciones.value = data || [];
};

const cargarReservas = async () => {
	const { data } = await supabase.from("reservas").select("*");

	reservas.value =
		(data || []).map((r) => {
			const habitacion = habitaciones.value.find(
				(h) => Number(h.id) === Number(r.id_habitacion)
			);

			return {
				id: r.id_reserva,
				cliente: r.cliente,
				habitacionId: r.id_habitacion,
				habitacion: habitacion ? habitacion.numero : r.id_habitacion,
				entrada: r.fecha_inicio,
				salida: r.fecha_fin,
				estado: r.estado,
				num_huespedes: r.num_huespedes
			};
		}) || [];
};

onMounted(async () => {
	await cargarHabitaciones();
	await cargarReservas();
});

const habitacionesFiltradas = computed(() => {
	return habitaciones.value
		.map((h) => {
			const ocupada = reservas.value.some(
				(r) =>
					r.habitacion == h.numero &&
					r.estado !== "Cancelada" &&
					r.estado !== "Completada" &&
					new Date(hoy) >= new Date(r.entrada) &&
					new Date(hoy) < new Date(r.salida)
			);

			return {
				...h,
				estado: ocupada ? "Ocupada" : "Disponible"
			};
		})
		.filter((h) => {
			return (
				(h.numero.toString().includes(filtroTexto.value) ||
					h.tipo.toLowerCase().includes(filtroTexto.value.toLowerCase())) &&
				(filtroEstado.value === "" || h.estado === filtroEstado.value)
			);
		});
});

const hayConflicto = (habitacion: number, entrada: string, salida: string) => {
	return reservas.value.some((r) => {
		return (
			r.habitacionId == habitacion &&
			r.estado !== "Cancelada" &&
			r.estado !== "Completada" &&
			new Date(entrada) < new Date(r.salida) &&
			new Date(salida) > new Date(r.entrada)
		);
	});
};

const crearReserva = async () => {
	const toast = useToast();

	if (
		!nuevaReserva.value.cliente ||
		nuevaReserva.value.habitacion === null ||
		!nuevaReserva.value.entrada ||
		!nuevaReserva.value.salida
	) {
		toast.showMessage("error", "Completa todos los campos");
		return;
	}

	if (
		hayConflicto(
			Number(nuevaReserva.value.habitacion),
			nuevaReserva.value.entrada,
			nuevaReserva.value.salida
		)
	) {
		toast.showMessage("error", "La habitación ya está reservada");
		return;
	}

	if (reservaEditando.value) {
		const { error } = await supabase
			.from("reservas")
			.update({
				cliente: nuevaReserva.value.cliente,
				id_habitacion: Number(nuevaReserva.value.habitacion),
				fecha_inicio: nuevaReserva.value.entrada,
				fecha_fin: nuevaReserva.value.salida,
				num_huespedes: nuevaReserva.value.num_huespedes
			})
			.eq("id_reserva", Number(reservaEditando.value));

		if (error) {
			toast.showMessage("error", "Error al actualizar");
			return;
		}

		toast.showMessage("success", "Reserva actualizada");

		reservaEditando.value = null;
		await cargarReservas();
		resetForm();
		return;
	}

	const existe = reservas.value.some(
		(r) =>
			r.habitacionId == Number(nuevaReserva.value.habitacion) &&
			r.entrada === nuevaReserva.value.entrada &&
			r.salida === nuevaReserva.value.salida &&
			r.estado !== "Cancelada" &&
			r.estado !== "Completada"
	);

	if (existe) {
		toast.showMessage("error", "Esta reserva ya existe");
		return;
	}

	const { data: userData } = await supabase.auth.getUser();

	const { error } = await supabase.from("reservas").insert([
		{
			cliente: nuevaReserva.value.cliente,
			id_habitacion: Number(nuevaReserva.value.habitacion),
			fecha_inicio: nuevaReserva.value.entrada,
			fecha_fin: nuevaReserva.value.salida,
			num_huespedes: nuevaReserva.value.num_huespedes,
			estado: "Confirmada",
			fecha_reserva: new Date().toISOString(),
			auth_id_usuario: userData?.user?.id
		}
	]);

	if (error) {
		toast.showMessage("error", error.message);
		return;
	}

	await cargarReservas();
	toast.showMessage("success", "Reserva creada");
	resetForm();
};

const modificarReserva = (reserva: any) => {
	reservaEditando.value = reserva.id;

	nuevaReserva.value = {
		cliente: reserva.cliente,
		habitacion: reserva.habitacionId,
		entrada: reserva.entrada,
		salida: reserva.salida,
		num_huespedes: reserva.num_huespedes || 1
	};
};

const cancelarReserva = async (id: string) => {
	await supabase.from("reservas").update({ estado: "Cancelada" }).eq("id_reserva", id);
	await cargarReservas();
};

const resetForm = () => {
	nuevaReserva.value = {
		cliente: "",
		habitacion: null,
		entrada: "",
		salida: "",
		num_huespedes: 1
	};
};

const checkIn = async (reserva: any) => {
	const toast = useToast();

	if (reserva.estado !== "Confirmada") {
		toast.showMessage("error", "No se puede hacer check-in");
		return;
	}

	const { error } = await supabase
		.from("reservas")
		.update({ estado: "En curso" })
		.eq("id_reserva", reserva.id);

	if (error) {
		toast.showMessage("error", "Error en check-in");
		return;
	}

	toast.showMessage("success", "Check-in realizado");
	await cargarReservas();
};

const checkOut = async (reserva: any) => {
	const toast = useToast();

	if (reserva.estado !== "En curso") {
		toast.showMessage("error", "No se puede hacer check-out");
		return;
	}

	const { error } = await supabase
		.from("reservas")
		.update({ estado: "Completada" })
		.eq("id_reserva", reserva.id);


	if (error) {
		console.error(error);
		toast.showMessage("error", "Error en check-out");
		return;
	}

	toast.showMessage("success", "Check-out realizado correctamente");

	await cargarReservas();
};

const handleLogout = async () => {
	await supabase.auth.signOut();
	router.push("/login");
};

const generarFactura = (reserva: any) => {
	const habitacion = habitaciones.value.find(
		(h) =>
			Number(h.id) === Number(reserva.habitacionId)
	);

	if (!habitacion) {
		useToast().showMessage("error", "Habitación no encontrada");
		return;
	}

	const inicio = new Date(reserva.entrada);
	const fin = new Date(reserva.salida);

	if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
		useToast().showMessage("error", "Fechas inválidas");
		return;
	}

	let dias = Math.ceil(
		(fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
	);

	if (dias <= 0) dias = 1;

	const total = dias * (Number(habitacion.precio) || 0);

	alert(
`FACTURA HOTEL

Cliente: ${reserva.cliente}
Habitación: ${habitacion.numero}
Días: ${dias}
Precio noche: $${habitacion.precio}

TOTAL: $${total}
`
	);
};

</script>

<template>

	<div class="recepcion-container">

		<h1>Panel de Recepcionista</h1>
	
	</div>
	
	<div class="grid-container">
		
			<section class="panel">
			
			<h2>Buscar Habitaciones</h2>

				<input
					v-model="filtroTexto"
					type="text"
					placeholder="Número o tipo de habitación"
				/>

				<select v-model="filtroEstado">
					<option value="">Estado</option>
					<option>Disponible</option>
					<option>Ocupada</option>
					<option>Mantenimiento</option>
				</select>
				
				<button>Buscar</button>

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

		<section class="panel">
			
			<h2>Gestión de Reservas</h2>

			<div>
				<input
					v-model="nuevaReserva.cliente"
					type="text"
					placeholder="Nombre del cliente"
				/>
				<input v-model="nuevaReserva.entrada" type="date" />
				<input v-model="nuevaReserva.salida" type="date" />
				<input v-model.number="nuevaReserva.num_huespedes"
				type="number"
				min="1"
				placeholder="Número de huéspedes"
				/>
				<select v-model="nuevaReserva.habitacion">
					<option disabled :value="null">Habitación</option>
					<option v-for="h in habitaciones" :key="h.id_habitacion" :value="h.id_habitacion">
						{{ h.numero }}
					</option>
				</select>

				<button @click="crearReserva">
					{{ reservaEditando ? "Actualizar Reserva" : "Crear Reserva" }}
				</button>
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
				<tbody>
					<tr v-for="reserva in reservas" :key="reserva.id">
						<td>{{ reserva.cliente }}</td>
						<td>{{ reserva.habitacion }}</td>
						<td>{{ reserva.entrada }}</td>
						<td>{{ reserva.salida }}</td>
						<td>
							<button
								@click="checkIn(reserva)"
								:disabled="reserva.estado !== 'Confirmada'"
							>
								Check-in
							</button>
							<button
								@click="checkOut(reserva)"
								:disabled="reserva.estado !== 'En curso'"
							>
								Check-out
							</button>
						</td>
					</tr>
				</tbody>
			</table>

		<button class="btn btn-critical" @click="handleLogout">
			Cerrar Sesión
		</button>
		<ToastMessage />
	</section>
	</div>
</template>
