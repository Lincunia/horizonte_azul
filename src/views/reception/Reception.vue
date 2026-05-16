<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { usePDF } from "../../composables/usePDF.ts";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { calculuateDaysStaying } from "../../composables/reservationMethods.ts";
import Modal from "../../components/Modal.vue";
import ReceptionCheck from "./ReceptionCheck.vue";
import ReceptionReservation from "./ReceptionReservation.vue";
import ReceptionRoom from "./ReceptionRoom.vue";
import logo from "../../assets/logo.png";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();

const rooms = ref<any[]>([]);
const reservations = ref<any[]>([]);
const filteredText = ref("");
const filteredStatus = ref("");
const editingReservation = ref<string | null>(null);

const pdfRef = ref<HTMLElement | null>(null);
const facturaSeleccionada = ref<any | null>(null);
const showModal = ref(false);

const newReservation = ref({
	cliente: "",
	id_habitacion: null as number | null,
	fecha_inicio: "",
	fecha_fin: "",
	num_huespedes: 1,
	estado: "Pendiente",
	fecha_reserva: new Date().toISOString(),
	check_in: null as string | null,
	check_out: null as string | null,
	costo_total: 0,
	penalizacion: 0,
	observaciones: "",
	auth_id_usuario: null as string | null,
});

type ReservaHabitacion = {
	id_reserva: number;
	cliente: {
		nombre: string;
	};
	id_habitacion: number;
	habitacion: {
		numero: number;
	};
	fecha_inicio: string;
	fecha_fin: string;
	estado: string;
	num_huespedes: number;
	check_in: string;
	check_out: string;
};

const hoy = new Date().toISOString().split("T")[0];

const loadRooms = async () => {
	const { data, error } = await supabase.from("habitaciones").select("*");
	if (error) {
		useToast().showMessage(
			"alert alert-danger",
			"Error cargando habitaciones:",
		);
		throw error;
	}
	rooms.value = data || [];
};

const loadReservations = async () => {
	const { data, error } = (await supabase
		.from("reservas")
		.select(
			"id_reserva, cliente:usuarios!inner(nombre), id_habitacion, " +
				"habitacion:habitaciones!inner(numero), fecha_inicio, fecha_fin, " +
				"estado, num_huespedes, check_in, check_out",
		)) as {
		data: ReservaHabitacion[] | null;
		error: any;
	};
	if (error) {
		useToast().showMessage("alert alert-danger", "Error cargando reservations");
		throw error;
	}
	reservations.value = (data || []).map((r) => {
		return {
			id: r.id_reserva,
			cliente: r.cliente.nombre,
			habitacionId: r.id_habitacion,
			habitacion: r.habitacion.numero,
			entrada: r.fecha_inicio,
			salida: r.fecha_fin,
			estado: r.estado,
			num_huespedes: r.num_huespedes,
			check_in: r.check_in,
			check_out: r.check_out,
		};
	});
};

const filteredRooms = computed(() => {
	const hoyDate = new Date(hoy);
	return rooms.value
		.map((h) => {
			const ocupada = reservations.value.some((r) => {
				const inicio = new Date(r.entrada);
				const fin = new Date(r.salida);
				return (
					r.habitacionId === h.id_habitacion &&
					r.estado !== "Cancelada" &&
					r.estado !== "Completada" &&
					hoyDate >= inicio &&
					hoyDate < fin
				);
			});
			return {
				...h,
				estado: ocupada ? "Ocupada" : "Libre",
			};
		})
		.filter((h) => {
			const texto = filteredText.value.toLowerCase();
			return (
				(h.numero.toString().includes(texto) ||
					h.tipo.toLowerCase().includes(texto)) &&
				(filteredStatus.value === "" || h.estado === filteredStatus.value)
			);
		});
});

const isTroubled = (
	habitacion: number,
	entrada: string,
	salida: string,
): boolean => {
	if (!entrada || !salida) return false;
	const fechaEntrada = new Date(entrada);
	const fechaSalida = new Date(salida);
	const estadosActivos = ["Pendiente", "Confirmada", "No_show"];
	return reservations.value.some((r) => {
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

const updateReservation = async (reserva: any) => {
	const { error } = await supabase
		.from("reservas")
		.update({
			cliente: reserva.cliente,
			id_habitacion: Number(reserva.id_habitacion),
			fecha_inicio: reserva.fecha_inicio,
			fecha_fin: reserva.fecha_fin,
			num_huespedes: reserva.num_huespedes,
		})
		.eq("id_reserva", Number(editingReservation.value));

	if (error) {
		useToast().showMessage("alert alert-danger", "Error al actualizar");
		return;
	}
	useToast().showMessage("alert alert-success", "Reserva actualizada");
};

const createReservation = async () => {
	const reserva = newReservation.value;

	if (
		!reserva.cliente ||
		reserva.id_habitacion === null ||
		!reserva.fecha_inicio ||
		!reserva.fecha_fin
	) {
		useToast().showMessage("alert alert-danger", "Completa todos los campos");
		return;
	}

	if (
		isTroubled(
			Number(reserva.id_habitacion),
			reserva.fecha_inicio,
			reserva.fecha_fin,
		)
	) {
		useToast().showMessage(
			"alert alert-danger",
			"La habitación ya está reservada",
		);
		return;
	}

	if (editingReservation.value) {
		updateReservation(reserva);
		editingReservation.value = null;
		await loadReservations();
		resetForm();
		return;
	}

	let exists = reservations.value.some((r) => {
		return (
			r.habitacionId === Number(reserva.id_habitacion) &&
			r.entrada === reserva.fecha_inicio &&
			r.salida === reserva.fecha_fin &&
			["Pendiente", "Confirmada", "No_show"].includes(r.estado)
		);
	});

	if (exists) {
		useToast().showMessage("alert alert-danger", "Esta reserva ya existe");
		return;
	}

	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError) {
		useToast().showMessage("alert alert-danger", "Error obteniendo usuario");
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
			observaciones: "",
		},
	]);

	if (error) {
		useToast().showMessage("alert alert-danger", error.message);
		return;
	}

	await loadReservations();
	useToast().showMessage("alert alert-success", "Reserva creada");
	resetForm();
};

const modifyReservation = (reserva: any) => {
	editingReservation.value = reserva.id;
	newReservation.value = {
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
		auth_id_usuario: null,
	};
};

const cancelReservation = async (id: number) => {
	const { error } = await supabase
		.from("reservas")
		.update({ estado: "Cancelada" })
		.eq("id_reserva", id);

	if (error) {
		useToast().showMessage(
			"alert alert-danger",
			"Error al cancelar la reserva",
		);
		return;
	}

	await loadReservations();
	useToast().showMessage("alert alert-success", "Reserva cancelada");
};

const resetForm = () => {
	newReservation.value = {
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
		auth_id_usuario: null,
	};
};

const checkIn = async (reserva: any) => {
	if (reserva.estado !== "Confirmada") {
		useToast().showMessage(
			"alert alert-danger",
			"Solo reservations confirmadas pueden hacer check-in",
		);
		return;
	}

	const hoyDate = new Date();
	const entrada = new Date(reserva.entrada);

	if (hoyDate < entrada) {
		useToast().showMessage(
			"alert alert-danger",
			"Aún no es la fecha de entrada",
		);
		return;
	}

	const { error } = await supabase
		.from("reservas")
		.update({
			estado: "No_show",
			check_in: new Date().toISOString(),
		})
		.eq("id_reserva", reserva.id);

	if (error) {
		useToast().showMessage("alert alert-danger", "Error en check-in");
		return;
	}

	useToast().showMessage("alert alert-success", "Check-in realizado");
	await loadReservations();
};

const checkOut = async (reserva: any) => {
	if (reserva.estado !== "No_show") {
		useToast().showMessage("alert alert-danger", "La reserva no está en curso");
		return;
	}

	const now = new Date();
	let noches = calculuateDaysStaying(now.toString(), reserva.entrada);
	const nightRate = 100;

	const { error } = await supabase
		.from("reservas")
		.update({
			estado: "Completada",
			check_out: now.toISOString(),
			costo_total: noches * nightRate,
		})
		.eq("id_reserva", reserva.id);

	if (error) {
		console.error(error);
		useToast().showMessage("alert alert-danger", "Error en check-out");
		return;
	}

	useToast().showMessage(
		"alert alert-success",
		"Check-out realizado correctamente",
	);
	await loadReservations();
};

const generateInvoice = (reserva: any) => {
	const habitacion = rooms.value.find(
		(h) => Number(h.id_habitacion) === Number(reserva.habitacionId),
	);

	if (!habitacion) {
		useToast().showMessage("alert alert-danger", "Habitación no encontrada");
		return;
	}
	let inicio = new Date(reserva.check_in || reserva.entrada);
	let fin = new Date(reserva.check_out || reserva.salida);
	let dias = calculuateDaysStaying(inicio.toString(), fin.toString());
	const precio = Number(habitacion.precio_noche);
	facturaSeleccionada.value = {
		cliente: reserva.cliente,
		numero: habitacion.numero,
		inicio: inicio.toLocaleDateString(),
		salida: fin.toLocaleDateString(),
		tiempo: dias,
		precio: precio,
		total: dias * precio,
	};
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
};

const filteredOperativoReservations = computed(() => {
	return reservations.value.filter(
		(r) => r.estado === "Confirmada" || r.estado === "No_show",
	);
});

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		useToast().showMessage("alert alert-danger", "Error al cerrar sesión");
		return;
	}
	reservations.value = [];
	rooms.value = [];
	useToast().showMessage("alert alert-success", "Sesión cerrada correctamente");
	router.push("/login");
};

onMounted(async () => {
	try {
		await loadRooms();
		await loadReservations();
	} catch (error: any) {
		console.error("Error en la carga: ", error);
	}
});
</script>

<template>
	<nav class="navbar navbar-expand-lg navbar-light bg-light p-4">
		<div class="navbar-brand">
			<img v-if="logo" :src="logo" width="30" height="30" alt="Logo" />
			Panel de Recepcionista
		</div>
		<div class="collapse navbar-collapse"></div>
		<button class="btn btn-danger" @click="handleLogout">Cerrar Sesión</button>
	</nav>

	<ToastMessage />

	<main class="d-flex flex-row container py-4">
		<div class="w-50 p-3">
			<ReceptionRoom
				:filtered-rooms="filteredRooms"
				:filtered-text="filteredText"
				:filtered-status="filteredStatus"
				@update:filtered-text="filteredText = $event"
				@update:filtered-status="filteredStatus = $event"
			/>
		</div>
		<div class="d-flex flex-column mb-3">
			<div class="p-3">
				<ReceptionReservation
					:reservations="reservations"
					:filtered-rooms="filteredRooms"
					:new-reservation="newReservation"
					:editing-reservation="editingReservation"
					@create-reservation="createReservation"
					@modify-reservation="modifyReservation"
					@cancel-reservation="cancelReservation"
					@reset-form="resetForm"
					@generate-invoice="generateInvoice"
				/>
			</div>
			<div class="p-3">
				<ReceptionCheck
					:filtered-operativo-reservations="filteredOperativoReservations"
					@check-in="checkIn"
					@check-out="checkOut"
				/>
			</div>
		</div>
	</main>

	<Modal v-model="showModal" :title="`Factura electrónica`" @close="closeModal">
		<div ref="pdfRef" v-if="facturaSeleccionada" class="container-sm">
			<h2 style="text-align: center">FACTURA</h2>
			<ul class="list-group">
				<li class="list-group-item">
					<strong>Cliente:</strong> {{ facturaSeleccionada.cliente }}
				</li>
				<li class="list-group-item">
					<strong>Habitación:</strong> {{ facturaSeleccionada.numero }}
				</li>
				<li class="list-group-item">
					<strong>Fecha entrada:</strong> {{ facturaSeleccionada.inicio }}
				</li>
				<li class="list-group-item">
					<strong>Fecha salida:</strong> {{ facturaSeleccionada.salida }}
				</li>
				<li class="list-group-item">
					<strong>Días:</strong> {{ facturaSeleccionada.tiempo }}
				</li>
				<li class="list-group-item">
					<strong>Precio por noche:</strong> ${{ facturaSeleccionada.precio }}
				</li>

				<li class="list-group-item">
					<strong>TOTAL:</strong> ${{ facturaSeleccionada.total }}
				</li>
			</ul>
		</div>
		<div class="modal-actions">
			<button
				type="button"
				class="btn btn-secondary m-3"
				@click="usePDF().exportarPdf(`factura_reserva.pdf`, pdfRef)"
			>
				🖨️ Imprimir Factura
			</button>
			<button class="btn btn-danger m-3" type="button" @click="closeModal">
				Cancelar
			</button>
		</div>
	</Modal>
</template>
