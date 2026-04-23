<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import html2pdf from "html2pdf.js";
import { usePdf } from "../../composables/pdf.ts";
interface Factura {
	id_factura: number;
	fecha_emision: string;
	subtotal: number;
	impuestos: number;
	total: number;
	metodo_pago: string | null;
	estado_pago: string;
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
				(f.metodo_pago || "").toLowerCase().includes(searchTerm.value.toLowerCase())
			: true;

		const matchesEstado = filterEstado.value === "todos" || f.estado_pago === filterEstado.value;
		const matchesMetodo = filterMetodo.value === "todos" || f.metodo_pago === filterMetodo.value;

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
		useToast().showMessage("error", "Error al cargar las facturas");
	} finally {
		loading.value = false;
	}
};

const loadReservas = async () => {
	try {
		const { data, error } = await supabase
			.from("reservas")
			.select("id_reserva, id_usuario, fecha_inicio, fecha_fin, costo_total, estado")
			.order("fecha_inicio", { ascending: false });
		if (error) throw error;
		reservas.value = (data as any) || [];
	} catch (error: any) {
		console.error("Error al cargar reservas:", error);
		useToast().showMessage("error", "Error al cargar las reservas");
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
		facturaForm.value = { id_reserva: 0, subtotal: 0, impuestos: 0, metodo_pago: "Efectivo", estado_pago: "Pendiente" };
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
			useToast().showMessage("error", "Reserva y subtotal son requeridos");
			return;
		}

		const payload = {
			id_reserva: facturaForm.value.id_reserva,
			subtotal: Number(facturaForm.value.subtotal),
			impuestos: Number(facturaForm.value.impuestos),
			total: Number((Number(facturaForm.value.subtotal) + Number(facturaForm.value.impuestos)).toFixed(2)),
			metodo_pago: facturaForm.value.metodo_pago,
			estado_pago: facturaForm.value.estado_pago,
		};

		if (editingFactura.value) {
			const { error } = await supabase
				.from("facturas")
				.update(payload)
				.eq("id_factura", editingFactura.value.id_factura);

			if (error) throw error;
			useToast().showMessage("success", "Factura actualizada exitosamente");
		} else {
			const { error } = await supabase.from("facturas").insert(payload);
			if (error) throw error;
			useToast().showMessage("success", "Factura creada exitosamente");
		}

		closeModal();
		await loadFacturas();
	} catch (error: any) {
		console.error("Error al guardar factura:", error);
		useToast().showMessage("error", error.message || "Error al guardar la factura");
	}
};
const facturaSeleccionada = ref<Factura | null>(null);
const pdfRef = ref<HTMLElement | null>(null);

const exportarFactura = async (factura: Factura): Promise<void> => {

	facturaSeleccionada.value = factura;
	await nextTick();
	usePdf().exportarPdf(`factura_${factura.id_factura}.pdf`, pdfRef.value);
};

onMounted(() => {
	loadFacturas();
	// loadReservas();
});

</script>

<template>
	<div>
		<div class="admin-controls">
			<div class="filters">
				<input type="search" v-model="searchTerm" placeholder="Buscar por ID factura, reserva o método" />
				<select v-model="filterMetodo">
					<option value="todos">Todos los métodos</option>
					<option value="Efectivo">Efectivo</option>
					<option value="Tarjeta crédito">Tarjeta crédito</option>
					<option value="Tarjeta débito">Tarjeta débito</option>
					<option value="Transferencia">Transferencia</option>
					<option value="Otro">Otro</option>
				</select>
				<select v-model="filterEstado">
					<option value="todos">Todos los estados</option>
					<option value="Pendiente">Pendiente</option>
					<option value="Pagado">Pagado</option>
					<option value="Reembolsado">Reembolsado</option>
					<option value="Cancelado">Cancelado</option>
				</select>
			</div>
		</div>

		<div v-if="loading" class="loading-message">Cargando facturas...</div>

		<table v-else class="admin-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Reserva</th>
					<th>Fecha</th>
					<th>Subtotal</th>
					<th>Impuestos</th>
					<th>Total</th>
					<th>Método</th>
					<th>Estado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="factura in filteredFacturas" :key="factura.id_factura">
					<td>{{ factura.id_factura }}</td>
					<td>{{ factura.id_reserva }}</td>
					<td>{{ factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleString() : 'N/A' }}</td>
					<td>${{ factura.subtotal }}</td>
					<td>${{ factura.impuestos }}</td>
					<td>${{ factura.total }}</td>
					<td>{{ factura.metodo_pago || 'N/A' }}</td>
					<td>{{ factura.estado_pago }}</td>
					<td class="actions-cell">
						<button class="btn" @click="openEditModal(factura)">✏️</button>
						<button class="btn" @click="exportarFactura(factura)">PDF</button>
					</td>
                    
				</tr>
				<tr v-if="!filteredFacturas.length && !loading">
					<td colspan="9">No se encontraron facturas.</td>
				</tr>
			</tbody>
		</table>
        <div ref="pdfRef" class="pdf-content" v-if="facturaSeleccionada">
            <h2>Detalle de la Factura</h2>
            <p><strong>ID:</strong> {{ facturaSeleccionada.id_factura }}</p>
            <p><strong>Método de pago:</strong> {{ facturaSeleccionada.metodo_pago || 'N/A' }}</p>
            <p><strong>Estado de pago:</strong> {{ facturaSeleccionada.estado_pago }}</p>
            <p><strong>Reserva:</strong> {{ facturaSeleccionada.id_reserva }}</p>
            <p><strong>Fecha de emisión:</strong> {{ facturaSeleccionada.fecha_emision }}</p>
            <p><strong>Subtotal:</strong> ${{ facturaSeleccionada.subtotal }}</p>
            <p><strong>Impuestos:</strong> ${{ facturaSeleccionada.impuestos }}</p>
            <p><strong>Total:</strong> ${{ facturaSeleccionada.total }}</p>
        </div>
		<div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
			<div class="modal-card">
				<h2>{{ editingFactura ? 'Editar Factura' : 'Crear Factura' }}</h2>

				<form @submit.prevent="saveFactura">
					<div class="field-row">
						<label>Reserva *</label>
						<select v-model.number="facturaForm.id_reserva" required>
							<option :value="0" disabled>Selecciona una reserva</option>
							<option v-for="r in reservas" :key="r.id_reserva" :value="r.id_reserva">
								{{ r.id_reserva }} - {{ r.fecha_inicio }} → {{ r.fecha_fin }}
							</option>
						</select>
					</div>

					<div class="field-row">
						<label>Subtotal *</label>
						<input type="number" v-model.number="facturaForm.subtotal" min="0" step="0.01" required />
					</div>

					<div class="field-row">
						<label>Impuestos</label>
						<input type="number" v-model.number="facturaForm.impuestos" min="0" step="0.01" />
					</div>

					<div class="field-row">
						<label>Total</label>
						<input type="number" :value="(Number(facturaForm.subtotal) + Number(facturaForm.impuestos)).toFixed(2)" disabled />
					</div>

					<div class="field-row">
						<label>Método de pago</label>
						<select v-model="facturaForm.metodo_pago">
							<option>Efectivo</option>
							<option>Tarjeta crédito</option>
							<option>Tarjeta débito</option>
							<option>Transferencia</option>
							<option>Otro</option>
						</select>
					</div>

					<div class="field-row">
						<label>Estado pago</label>
						<select v-model="facturaForm.estado_pago">
							<option>Pendiente</option>
							<option>Pagado</option>
							<option>Reembolsado</option>
							<option>Cancelado</option>
						</select>
					</div>

					<div class="modal-actions">
						<button class="btn" type="submit">Guardar</button>
						<button class="btn btn-critical" type="button" @click="closeModal">Cancelar</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
.admin-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

.filters {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	align-items: center;
}

.filters input,
.filters select {
	padding: 0.75rem 1rem;
	border: 1px solid #d1d5db;
	border-radius: 0.5rem;
	min-width: 180px;
}

.admin-table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border-radius: 0.75rem;
	overflow: hidden;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.admin-table th,
.admin-table td {
	padding: 0.9rem 1rem;
	text-align: left;
	border-bottom: 1px solid #e5e7eb;
}

.admin-table th {
	background: #f8fafc;
	color: #111827;
}

.admin-table tbody tr:nth-child(even) {
	background: #f9fafb;
}

.actions-cell {
	display: flex;
	gap: 0.5rem;
}

.btn {
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 0.5rem;
	padding: 0.65rem 1rem;
	cursor: pointer;
	transition: background 0.2s ease;
}

.btn:hover {
	background: #2563eb;
}

.btn-critical {
	background: #ef4444;
}

.btn-critical:hover {
	background: #dc2626;
}

.loading-message {
	padding: 1rem 0;
	color: #6b7280;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
	z-index: 20;
}

.modal-card {
	background: white;
	width: min(720px, 100%);
	border-radius: 1rem;
	padding: 1.5rem;
	box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
}

.field-row {
	display: grid;
	gap: 0.5rem;
	margin-bottom: 1rem;
}

.field-row label {
	font-weight: 600;
	color: #111827;
}

.field-row input,
.field-row select {
	width: 100%;
	padding: 0.8rem 1rem;
	border: 1px solid #d1d5db;
	border-radius: 0.75rem;
}

.modal-actions {
	display: flex;
	gap: 0.75rem;
	justify-content: flex-end;
	margin-top: 1rem;
}
</style>
<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}

.pdf-content {
  background: white;
  padding: 20px;
  margin-top: 20px;
}
</style>
