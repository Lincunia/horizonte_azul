<script setup lang="ts">
import { ref, watch } from "vue";
import { usePdf } from "../../composables/pdf.ts";

interface Factura {
	id_factura: number;
	fecha_emision: string;
	subtotal: number;
	impuestos: number;
	total: number;
	metodo_pago: string;
	estado_pago: string;
	id_reserva: number;
}

interface Reserva {
	id_reserva: number;
	fecha_inicio: string;
	fecha_fin: string;
	num_huespedes: number;
	habitaciones: {
		numero: number;
		tipo: string;
	};
}

const props = defineProps<{
	factura: Factura | null;
	reserva: Reserva | null;
}>();

const emit = defineEmits<{
	(e: "update:visible", value: boolean): void;
	(e: "close"): void;
}>();
const pdfRef = ref<HTMLElement | null>(null);

const printInvoice = () => {
	usePdf().exportarPdf(`factura_reserva.pdf`, pdfRef.value);
};



const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};
</script>

<template>
	<div ref="pdfRef">
		<div class="invoice-header">
			<h1 class="invoice-title">HOTEL HORIZONTE AZUL</h1>
			<!-- Dirección con NIT, calle y Teléfono -->
		</div>

		<div v-if="factura && reserva" class="invoice-details">
			<ul>
				<li><strong>Factura N°:</strong> {{ factura.id_factura }}</li>
				<li>
					<strong>Fecha:</strong>
					{{ formatDate(factura.fecha_emision) }}
				</li>
				<li><strong>Reserva N°:</strong> {{ reserva.id_reserva }}</li>
				<li><strong>Estado:</strong> {{ factura.estado_pago }}</li>
				<li>
					<strong>Habitación:</strong> #{{ reserva.habitaciones.numero }} -
					{{ reserva.habitaciones.tipo }}
				</li>
				<li>
					<strong>Huéspedes:</strong>
					{{ reserva.num_huespedes }} personas
				</li>
				<li>
					<strong>Check-in:</strong>
					{{ formatDate(reserva.fecha_inicio) }}
				</li>
				<li>
					<strong>Check-out:</strong>
					{{ formatDate(reserva.fecha_fin) }}
				</li>
				<li><strong>Método de pago:</strong> {{ factura.metodo_pago }}</li>
			</ul>
		</div>

		<table class="items-table">
			<thead>
				<tr>
					<th>Descripción</th>
					<th>Cantidad</th>
					<th>Valor Unitario</th>
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Estadía en habitación #{{ reserva?.habitaciones.numero }}</td>
					<td>
						{{
							Math.ceil(
								(new Date(reserva?.fecha_fin || "").getTime() -
									new Date(reserva?.fecha_inicio || "").getTime()) /
								(1000 * 60 * 60 * 24),
							)
						}}
						noches
					</td>
					<td>
						{{
							formatCurrency(
								factura?.subtotal /
								Math.ceil(
									(new Date(reserva?.fecha_fin || "").getTime() -
										new Date(reserva?.fecha_inicio || "").getTime()) /
									(1000 * 60 * 60 * 24),
								) || 0,
							)
						}}
					</td>
					<td>{{ formatCurrency(factura?.subtotal || 0) }}</td>
				</tr>
			</tbody>
		</table>

		<div class="total-section">
			<p class="total-line">
				Subtotal: {{ formatCurrency(factura?.subtotal || 0) }}
			</p>
			<p class="total-line">
				IVA (19%): {{ formatCurrency(factura?.impuestos || 0) }}
			</p>
			<p class="total-line grand-total">
				Total a pagar: {{ formatCurrency(factura?.total || 0) }}
			</p>
		</div>
	</div>
	<div class="footer">
		<p>¡Gracias por preferirnos!</p>
		<p>Esta factura es un comprobante de pago válido</p>
		<button type="button" class="btn" @click="printInvoice">
			🖨️ Imprimir Factura
		</button>
	</div>
</template>

<style scoped>
body {
	font-family: Arial, sans-serif;
	padding: 2rem;
	margin: 0;
}

.invoice-header {
	text-align: center;
	margin-bottom: 2rem;
	padding-bottom: 1rem;
	border-bottom: 2px solid #333;
}

.invoice-title {
	font-size: 2rem;
	margin: 0;
	color: #0a2a5e;
}

.invoice-details {
	margin-bottom: 2rem;
}

.invoice-details table,
ul {
	width: 100%;
	border-collapse: collapse;
}

.items-table {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: 2rem;
}

.items-table th,
.items-table td {
	border: 1px solid #ddd;
	padding: 0.75rem;
	text-align: left;
}

.items-table th {
	background-color: #f2f2f2;
}

.total-section {
	text-align: right;
	margin-top: 2rem;
	padding-top: 1rem;
	border-top: 2px solid #333;
}

.total-line {
	font-size: 1.25rem;
	margin: 0.5rem 0;
}

.grand-total {
	font-size: 1.5rem;
	font-weight: bold;
	color: #00973f;
}

.footer {
	margin-top: 3rem;
	text-align: center;
	font-size: 0.875rem;
	color: #666;
}

@media print {
	body {
		padding: 0;
	}

	.no-print {
		display: none;
	}
}
</style>
