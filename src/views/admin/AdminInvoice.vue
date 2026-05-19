<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { usePDF } from "../../composables/usePDF.ts";
import type {
	PaymentStatus,
	PaymentMethod,
} from "../../composables/dbInformation.ts";
import Modal from "../../components/Modal.vue";

interface Factura {
	id_factura: number;
	fecha_emision: string;
	subtotal: number;
	impuestos: number;
	total: number;
	metodo_pago: PaymentMethod;
	estado_pago: PaymentStatus;
	id_reserva: number;
}

const facturas = ref<Factura[]>([]);
const reservas = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingFactura = ref<Factura | null>(null);
const searchTerm = ref("");
const filterEstado = ref<string>("todos");
const filterMetodo = ref<string>("todos");

const facturaForm = ref({
	id_reserva: 0,
	subtotal: 0,
	impuestos: 0,
	metodo_pago: "Efectivo",
	estado_pago: "Pendiente",
});

const filteredFacturas = computed(() => {
	return facturas.value.filter((f) => {
		const matchesSearch = searchTerm.value
			? f.id_reserva.toString().includes(searchTerm.value) ||
				f.id_factura.toString().includes(searchTerm.value) ||
				(f.metodo_pago || "")
					.toLowerCase()
					.includes(searchTerm.value.toLowerCase())
			: true;

		const matchesEstado =
			filterEstado.value === "todos" || f.estado_pago === filterEstado.value;
		const matchesMetodo =
			filterMetodo.value === "todos" || f.metodo_pago === filterMetodo.value;

		return matchesSearch && matchesEstado && matchesMetodo;
	});
});

const loadFacturas = async () => {
	try {
		loading.value = true;
		const { data, error } = await supabase
			.from("facturas")
			.select("*")
			.order("fecha_emision", { ascending: false });
		if (error) throw error;
		facturas.value = (data as any) || [];
	} catch (error: any) {
		console.error("Error al cargar facturas:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar las facturas",
		);
	} finally {
		loading.value = false;
	}
};

const loadReservas = async () => {
	try {
		const { data, error } = await supabase
			.from("reservas")
			.select(
				"id_reserva, auth_id_usuario, fecha_inicio, fecha_fin, costo_total, estado",
			)
			.order("fecha_inicio", { ascending: false });
		if (error) throw error;
		reservas.value = (data as any) || [];
	} catch (error: any) {
		console.error("Error al cargar reservas:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar las reservas",
		);
	}
};

const openEditModal = (factura?: Factura) => {
	if (factura) {
		editingFactura.value = factura;
		facturaForm.value = {
			id_reserva: factura.id_reserva,
			subtotal: Number(factura.subtotal),
			impuestos: Number(factura.impuestos),
			metodo_pago: factura.metodo_pago ?? "Efectivo",
			estado_pago: factura.estado_pago,
		};
	} else {
		editingFactura.value = null;
		facturaForm.value = {
			id_reserva: 0,
			subtotal: 0,
			impuestos: 0,
			metodo_pago: "Efectivo",
			estado_pago: "Pendiente",
		};
	}
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
	editingFactura.value = null;
};

const saveFactura = async () => {
	try {
		if (!facturaForm.value.id_reserva || facturaForm.value.subtotal == null) {
			useToast().showMessage(
				"alert alert-danger",
				"Reserva y subtotal son requeridos",
			);
			return;
		}

		const payload = {
			id_reserva: facturaForm.value.id_reserva,
			subtotal: Number(facturaForm.value.subtotal),
			impuestos: Number(facturaForm.value.impuestos),
			total: Number(
				(
					Number(facturaForm.value.subtotal) +
					Number(facturaForm.value.impuestos)
				).toFixed(2),
			),
			metodo_pago: facturaForm.value.metodo_pago,
			estado_pago: facturaForm.value.estado_pago,
		};

		if (editingFactura.value) {
			const { error } = await supabase
				.from("facturas")
				.update(payload)
				.eq("id_factura", editingFactura.value.id_factura);

			if (error) throw error;
			useToast().showMessage(
				"alert alert-success",
				"Factura actualizada exitosamente",
			);
		} else {
			const { error } = await supabase.from("facturas").insert(payload);
			if (error) throw error;
			useToast().showMessage(
				"alert alert-success",
				"Factura creada exitosamente",
			);
		}

		closeModal();
		await loadFacturas();
	} catch (error: any) {
		console.error("Error al guardar factura:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al guardar la factura",
		);
	}
};
const facturaSeleccionada = ref<Factura | null>(null);
const pdfRef = ref<HTMLElement | null>(null);

const exportarFactura = async (factura: Factura): Promise<void> => {
	facturaSeleccionada.value = factura;
	await nextTick();
	usePDF().exportarPdf(`factura_${factura.id_factura}.pdf`, pdfRef.value);
};

onMounted(() => {
	loadFacturas();
	loadReservas();
});
</script>

<template>
	<div class="container">
		<div class="mb-3">
			<label class="form-label">Buscar por ID factura, reserva o método</label>
			<input type="search" v-model="searchTerm" class="form-control" />
		</div>
		<div class="mb-3">
			<label class="form-label"> Filtrar métodos de pago </label>
			<select v-model="filterMetodo" class="form-select">
				<option value="todos">Todos los métodos</option>
				<option>Efectivo</option>
				<option>Tarjeta crédito</option>
				<option>Tarjeta débito</option>
				<option>Transferencia</option>
				<option>Otro</option>
			</select>
		</div>
		<div class="mb-3">
			<label class="form-label"> Filtrar por estado </label>
			<select v-model="filterEstado" class="form-select">
				<option>Todos los estados</option>
				<option>Pendiente</option>
				<option>Pagado</option>
				<option>Reembolsado</option>
				<option>Cancelado</option>
			</select>
		</div>
	</div>

	<LoaderMessage v-if="loading" visible message="Cargando facturas..." />
	<LoaderMessage v-else-if="filteredFacturas.length === 0" message="No hay facturas" />

	<table v-else class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">ID</th>
				<th scope="col">Reserva</th>
				<th scope="col">Fecha</th>
				<th scope="col">Subtotal</th>
				<th scope="col">Impuestos</th>
				<th scope="col">Total</th>
				<th scope="col">Método</th>
				<th scope="col">Estado</th>
				<th scope="col">Acciones</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="factura in filteredFacturas" :key="factura.id_factura">
				<td scope="row">{{ factura.id_factura }}</td>
				<td>{{ factura.id_reserva }}</td>
				<td>
					{{
						factura.fecha_emision
							? new Date(factura.fecha_emision).toLocaleString()
							: "N/A"
					}}
				</td>
				<td>${{ factura.subtotal }}</td>
				<td>${{ factura.impuestos }}</td>
				<td>${{ factura.total }}</td>
				<td>{{ factura.metodo_pago || "N/A" }}</td>
				<td>{{ factura.estado_pago }}</td>
				<td class="d-flex flex-column mb-3">
					<button class="btn btn-primary mb-1" @click="openEditModal(factura)">
						✏️
					</button>
					<button
						class="btn btn-secondary mb-1"
						@click="exportarFactura(factura)"
					>
						PDF
					</button>
				</td>
			</tr>
		</tbody>
	</table>
	<div ref="pdfRef" v-if="facturaSeleccionada">
		<h2>Detalle de la Factura</h2>
		<ul class="list-group">
			<li class="list-troup-item">
				<strong>ID:</strong> {{ facturaSeleccionada.id_factura }}
			</li>
			<li class="list-troup-item">
				<strong>Método de pago:</strong>
				{{ facturaSeleccionada.metodo_pago || "N/A" }}
			</li>
			<li class="list-troup-item">
				<strong>Estado de pago:</strong> {{ facturaSeleccionada.estado_pago }}
			</li>
			<li class="list-troup-item">
				<strong>Reserva:</strong> {{ facturaSeleccionada.id_reserva }}
			</li>
			<li class="list-troup-item">
				<strong>Fecha de emisión:</strong>
				{{ facturaSeleccionada.fecha_emision }}
			</li>
			<li class="list-troup-item">
				<strong>Subtotal:</strong> ${{ facturaSeleccionada.subtotal }}
			</li>
			<li class="list-troup-item">
				<strong>Impuestos:</strong> ${{ facturaSeleccionada.impuestos }}
			</li>
			<li class="list-troup-item">
				<strong>Total:</strong> ${{ facturaSeleccionada.total }}
			</li>
		</ul>
	</div>
	<Modal
		v-model="showModal"
		:title="editingFactura ? 'Editar Factura' : 'Crear Factura'"
		@close="closeModal"
	>
		<form @submit.prevent="saveFactura" class="container-sm">
			<div class="mb-3">
				<label class="form-label">Reserva *</label>
				<select
					v-model.number="facturaForm.id_reserva"
					class="form-select"
					required
				>
					<option :value="0" disabled>Selecciona una reserva</option>
					<option
						v-for="r in reservas"
						:key="r.id_reserva"
						:value="r.id_reserva"
					>
						{{ r.id_reserva }} - {{ r.fecha_inicio }} → {{ r.fecha_fin }}
					</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Subtotal *</label>
				<input
					type="number"
					v-model.number="facturaForm.subtotal"
					class="form-control"
					min="0"
					step="0.01"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Impuestos</label>
				<input
					type="number"
					v-model.number="facturaForm.impuestos"
					class="form-control"
					min="0"
					step="0.01"
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Total</label>
				<input
					type="number"
					:value="
						(
							Number(facturaForm.subtotal) + Number(facturaForm.impuestos)
						).toFixed(2)
					"
					class="form-control"
					disabled
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Método de pago</label>
				<select v-model="facturaForm.metodo_pago" class="form-select">
					<option>Efectivo</option>
					<option>Tarjeta crédito</option>
					<option>Tarjeta débito</option>
					<option>Transferencia</option>
					<option>Otro</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Estado pago</label>
				<select v-model="facturaForm.estado_pago" class="form-select">
					<option>Pendiente</option>
					<option>Pagado</option>
					<option>Reembolsado</option>
					<option>Cancelado</option>
				</select>
			</div>

			<div class="d-flex justify-content-center">
				<button class="btn btn-success m-2" type="submit">Guardar</button>
				<button class="btn btn-danger m-2" type="button" @click="closeModal">
					Cancelar
				</button>
			</div>
		</form>
	</Modal>
</template>
