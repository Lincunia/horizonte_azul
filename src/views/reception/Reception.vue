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
	id_habitacion: null as number | null,
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	estado: "pendiente",
	fecha_reserva: new Date().toISOString(),
	check_in: null as string | null,
	check_out: null as string | null,
	costo_total: 0,
	penalizacion: 0,
	observaciones: "",
	auth_id_usuario: null as string | null
});

const hoy = new Date().toISOString().split("T")[0];

const cargarHabitaciones = async () => {
	const { data, error } = await supabase
		.from("habitaciones")
		.select("*");

	if (error) {
		console.error("Error cargando habitaciones:", error);
		return;
	}

	habitaciones.value = data || [];
};

const cargarReservas = async () => {
	const { data , error } = await supabase
	.from("reservas")
	.select("*");

	if (error) {
		console.error("Error cargando reservas:", error);
		return;
	}

	reservas.value = (data || []).map((r) => {
		const habitacion = habitaciones.value.find(
				(h) => Number(h.id_habitacion) === Number(r.id_habitacion)
			);

			return {
				id: r.id_reserva,
				cliente: r.cliente,
				habitacionId: r.id_habitacion,
				habitacion: habitacion ? habitacion.numero : `#${r.id_habitacion}`,
				entrada: r.fecha_inicio,
				salida: r.fecha_fin,
				estado: r.estado,
				num_huespedes: r.num_huespedes
			};
		});
};

onMounted(async () => {
	await cargarHabitaciones();
	await cargarReservas();
});

const habitacionesFiltradas = computed(() => {
	const hoyDate = new Date(hoy);

	return habitaciones.value
		.map((h) => {
			const ocupada = reservas.value.some((r) => {
				const inicio = new Date(r.entrada);
				const fin = new Date(r.salida);

					r.habitacionId === h.id_habitacion &&
					r.estado !== "Cancelada" &&
					r.estado !== "Completada" &&
					hoyDate >= inicio &&
					hoyDate < fin
		});

		return {
			...h,
			estado: ocupada ? "Ocupada" : "Disponible"
			};
		})
		.filter((h) => {
			const texto = filtroTexto.value.toLowerCase();

			return (
				(h.numero.toString().includes(texto) ||
					h.tipo.toLowerCase().includes(texto)) &&
				(filtroEstado.value === "" || h.estado === filtroEstado.value)
			);
		});
});

const hayConflicto = (
	habitacion: number, 
	entrada: string, 
	salida: string
) => {

	if (!entrada || !salida) return false;
	
	const fechaEntrada = new Date(entrada);
	const fechaSalida = new Date(salida);

	const estadosActivos = ["Pendiente", "Confirmada", "Check-in"];

	return reservas.value.some((r) => {
		
		const inicio = new Date(r.entrada);
		const fin = new Date(r.salida);

		return (
			r.habitacionId == habitacion &&
			estadosActivos.includes(r.estado) &&
			fechaEntrada < fin &&
			fechaSalida > inicio
		);
	});
};

const crearReserva = async () => {
	const toast = useToast();

	const reserva = nuevaReserva.value;

	if (
		!reserva.cliente ||
		reserva.id_habitacion === null ||
		!reserva.fecha_inicio ||
		!reserva.fecha_fin
	) {
		toast.showMessage("alert alert-danger", "Completa todos los campos");
		return;
	}

	if (
		hayConflicto(
			Number(reserva.id_habitacion),
			reserva.fecha_inicio,
			reserva.fecha_fin
		)
	) {
		toast.showMessage("alert alert-danger", "La habitación ya está reservada");
		return;
	}

	if (reservaEditando.value) {
		const { error } = await supabase
			.from("reservas")
			.update({
				cliente: reserva.cliente,
				id_habitacion: Number(reserva.id_habitacion),
				fecha_inicio: reserva.fecha_inicio,
				fecha_fin: reserva.fecha_fin,
				num_huespedes: reserva.num_huespedes
			})
			.eq("id_reserva", Number(reservaEditando.value));

		if (error) {
			toast.showMessage("alert alert-danger", "Error al actualizar");
			return;
		}

		toast.showMessage("alert alert-success", "Reserva actualizada");

		reservaEditando.value = null;
		await cargarReservas();
		resetForm();
		return;
	}

	const existe = reservas.value.some((r) => {
		return(
			r.habitacionId === Number(reserva.id_habitacion) &&
			r.entrada === reserva.fecha_inicio &&
			r.salida === reserva.fecha_fin &&
			["Pendiente", "Confirmada", "Check-in"].includes(r.estado)
		)
	});

	if (existe) {
		toast.showMessage("alert alert-danger", "Esta reserva ya existe");
		return;
	}

	const { data: userData, error: userError } =
		await supabase.auth.getUser();

	if (userError) {
		toast.showMessage("alert alert-danger", "Error obteniendo usuario");
		return;
	}

	const { error } = await supabase.from("reservas").insert([
		{
			cliente: reserva.cliente,
			id_habitacion: Number(reserva.id_habitacion),
			fecha_inicio: reserva.fecha_inicio,
			fecha_fin: reserva.fecha_fin,
			num_huespedes: reserva.num_huespedes,
			estado: "Confirmada",
			fecha_reserva: new Date().toISOString(),
			auth_id_usuario: userData?.user?.id,
			check_in: null,
			check_out: null,
			costo_total: 0,
			penalizacion: 0,
			observaciones: ""
		}
	]);

	if (error) {
		toast.showMessage("alert alert-danger", error.message);
		return;
	}

	await cargarReservas();
	toast.showMessage("alert alert-success", "Reserva creada");
	resetForm();
};

const modificarReserva = (reserva: any) => {
	reservaEditando.value = reserva.id;

	nuevaReserva.value = {
		cliente: reserva.cliente,
		id_habitacion: reserva.habitacionId,
		fecha_inicio: reserva.entrada,
		fecha_fin: reserva.salida,
		num_huespedes: reserva.num_huespedes || 1,
		estado: reserva.estado || "Confirmada",
		fecha_reserva: new Date().toString(),
		check_in: null,
		check_out: null,
		costo_total: 0,
		penalizacion: 0,
		observaciones: "",
		auth_id_usuario: null
	};
};

const cancelarReserva = async (id: number) => {
	
	const toast = useToast();

	const { error } = await supabase
		.from("reservas")
		.update({ estado: "Cancelada" })
		.eq("id_reserva", id);

	if (error) {
		toast.showMessage("alert alert-danger", "Error al cancelar la reserva");
		return;
	}

	await cargarReservas();
	toast.showMessage("alert alert-success", "Reserva cancelada");
};

const resetForm = () => {
	nuevaReserva.value = {
		cliente: "",
		id_habitacion: null,
		fecha_inicio: "",
		fecha_fin: "",
		num_huespedes: 1,
		estado: "Confirmada",
		fecha_reserva: new Date().toString(),
		check_in: null,
		check_out: null,
		costo_total: 0,
		penalizacion: 0,
		observaciones: "",
		auth_id_usuario: null	
	};
};

const checkIn = async (reserva: any) => {
	const toast = useToast();

	if (reserva.estado !== "Confirmada") {
		toast.showMessage("alert alert-danger", "Solo reservas confirmadas pueden hacer check-in");
		return;
	}

	const hoyDate = new Date();
	const entrada = new Date(reserva.entrada);

	if (hoyDate < entrada) {
		toast.showMessage("alert alert-danger", "Aún no es la fecha de entrada");
		return;
	}

	const { error } = await supabase
		.from("reservas")
		.update({ 
			estado: "Check-in",
			check_in: new Date().toISOString()
		})
		.eq("id_reserva", reserva.id);

	if (error) {
		toast.showMessage("alert alert-danger", "Error en check-in");
		return;
	}

	toast.showMessage("alert alert-success", "Check-in realizado");
	await cargarReservas();
};

const checkOut = async (reserva: any) => {
	const toast = useToast();

	if (reserva.estado !== "Check-in") {
		toast.showMessage("alert alert-danger", "La reserva no está en curso");
		return;
	}

	const ahora = new Date();
	const entrada = new Date(reserva.entrada);

	const diffTiempo = ahora.getTime() - entrada.getTime();
	const noches = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

	const precioPorNoche = 100;
	const costoTotal = noches * precioPorNoche;

	const { error } = await supabase
		.from("reservas")
		.update({ 
			estado: "Completada",
			check_out: ahora.toISOString(),
			costo_total: costoTotal 
		})
		.eq("id_reserva", reserva.id);


	if (error) {
		console.error(error);
		toast.showMessage("alert alert-danger", "Error en check-out");
		return;
	}

	toast.showMessage("alert alert-success", "Check-out realizado correctamente");

	await cargarReservas();
};

const handleLogout = async () => {
	const toast = useToast();

	const { error } = await supabase.auth.signOut();

	if (error) {
		toast.showMessage("alert alert-danger", "Error al cerrar sesión");
		return;
	}

	reservas.value = [];
	habitaciones.value = [];

	toast.showMessage("alert alert-success", "Sesión cerrada correctamente");

	router.push("/login");
};

const generarFactura = (reserva: any) => {
	const toast = useToast();

	const habitacion = habitaciones.value.find(
		(h) =>
			Number(h.id_habitacion) === Number(reserva.habitacionId)
	);

	if (!habitacion) {
		toast.showMessage("alert alert-danger", "Habitación no encontrada");
		return;
	}

	const inicio = new Date(reserva.check_in || reserva.entrada);
	const fin = new Date(reserva.check_out || reserva.salida);

	if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
		useToast().showMessage("alert alert-danger", "Fechas inválidas");
		return;
	}

	let dias = Math.ceil(
		(fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
	);

	if (dias <= 0) dias = 1;

	const precio = Number(habitacion.precio) || 0;
	const total = dias * precio;

	const factura = `
FACTURA HOTEL

Cliente: ${reserva.cliente}
Habitación: ${habitacion.numero}
Fecha entrada: ${inicio.toLocaleDateString()}
Fecha salida: ${fin.toLocaleDateString()}

Días: ${dias}
Precio por noche: $${precio}

TOTAL: $${total}
`;

	alert(factura);
};

const reservasFiltradasOperativas = computed(() => {
	return reservas.value.filter(
		(r) => r.estado === "Confirmada" || r.estado === "Check-in"
	);
});

</script>

<template>	
	<div class="recepcion-container">
		<header class="top-bar">
			<h1>Panel de Recepcionista</h1>

			<button class="btn btn-critical" @click="handleLogout">
				Cerrar Sesión
			</button>
			
		</header>	

		<ToastMessage />

		<div class="grid-main">
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

				<table>
					<thead>
						<tr>
							<th>Habitación</th>
							<th>Tipo</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody>
						<tr 
							v-for="h in habitacionesFiltradas" 
							:key="h.id_habitacion"
						>
							<td>{{ h.numero }}</td>
							<td>{{ h.tipo }}</td>

							<td>
								<span 
									:class="{
										estado: true,
										disponible: h.estado === 'Disponible',
										ocpada: h.estado === 'Ocupada',
										mantenimiento: h.estado === 'Mantenimiento',
									}"
								>
									{{ h.estado }}
								</span>
							</td>
						</tr>
						<tr v-if="habitacionesFiltradas.length === 0">
							<td colspan="3">No hay habitaciones disponibles</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section class="panel">
				<h2>Gestión de Reservas</h2>

				<div class="form-reserva">
					<input
						v-model="nuevaReserva.cliente"
						type="text"
						placeholder="Nombre del cliente"
					/>

					<input v-model="nuevaReserva.fecha_inicio" type="date" />
					<input v-model="nuevaReserva.fecha_fin" type="date" />

					<input
						v-model.number="nuevaReserva.num_huespedes"
						type="number"
						min="1"
						placeholder="Número de huéspedes"
					/>

					<select v-model="nuevaReserva.id_habitacion">
						<option disabled :value="null">Habitación</option>

						<option 
							v-for="h in habitacionesFiltradas.filter(h => h.estado === 'Disponible')"
							:key="h.id_habitacion"
							:value="h.id_habitacion"
						>
							{{ h.numero }}
						</option>
					</select>

					<button @click="crearReserva">
						{{ reservaEditando ? "Actualizar Reserva" : "Crear Reserva" }}
					</button>

					<button v-if="reservaEditando" @click="resetForm">
						Cancelar edición
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
							<th>Acciones</th>
						</tr>
					</thead>
				
					<tbody>
						<tr v-for="reserva in reservas" :key="reserva.id">
							<td>{{ reserva.cliente }}</td>
							<td>{{ reserva.habitacion }}</td>
							<td>{{ reserva.entrada }}</td>
							<td>{{ reserva.salida }}</td>

							<td>
								<span 
									:class = "{
										estado: true,
										confirmada: reserva.estado === 'Confirmada',
										checkin: reserva.estado === 'Check-in',
										completada: reserva.estado === 'Completada',
										cancelada: reserva.estado === 'Cancelada'
									}"
								>
									{{ reserva.estado }}
								</span>
							</td>

							<td>
								<button @click="modificarReserva(reserva)">
									Modificar
								</button>
							
								<button @click="cancelarReserva(reserva.id)">
									Cancelar
								</button>
							
								<button @click="generarFactura(reserva)">
									Facturar
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>

		<div class="check-container">
			<section class="panel operativo">
				<h2>Check-in / Check-out</h2>

				<table>
					<thead>
						<tr>
							<th>Cliente</th>
							<th>Habitación</th>
							<th>Entrada</th>
							<th>Salida</th>
							<th>Estado</th>
							<th>Acción</th>
						</tr>
					</thead>
						
					<tbody>
						<tr
							v-for="reserva in reservasFiltradasOperativas"
							:key="reserva.id"
						>
							<td>{{ reserva.cliente }}</td>
							<td>{{ reserva.habitacion }}</td>
							<td>{{ reserva.entrada }}</td>
							<td>{{ reserva.salida }}</td>

							<td>
								<span
									:class="{
										estado: true,
										confirmada: reserva.estado === 'Confirmada',
										checkin: reserva.estado === 'Check-in'
									}"
								>
									{{ reserva.estado }}
								</span>
							</td>
						
							<td>

								<button
									v-if="reserva.estado === 'Confirmada'"
									@click="checkIn(reserva)"
									class="btn-checkin"
								>
									Check-in
								</button>
							
								<button
									v-else-if="reserva.estado === 'Check-in'"
									@click="checkOut(reserva)"
									class="btn-checkout"
								>
									Check-out
								</button>
							</td>
						</tr>

						<tr v-if="reservasFiltradasOperativas.length === 0">
							<td colspan="6">No hay operaciones pendientes</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	</div>
</template>
