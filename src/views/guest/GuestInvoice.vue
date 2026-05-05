<script setup lang="ts">
import { ref } from "vue";
import { usePDF } from "../../composables/usePDF.ts";

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
	<main ref="pdfRef">
		<header class="dashboard">
			<h1>HOTEL HORIZONTE AZUL</h1>
			<!-- Dirección con NIT, calle y Teléfono -->
		</header>

		<section v-if="factura && reserva">
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
		</section>

		<table>
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
								(factura?.subtotal || 0)/
									Math.ceil(
										(new Date(reserva?.fecha_fin || "").getTime() -
											new Date(reserva?.fecha_inicio || "").getTime()) / (1000 * 60 * 60 * 24)))
						}}
					</td>
					<td>
						{{ formatCurrency(factura?.subtotal || 0) }}
					</td>
				</tr>
			</tbody>
		</table>

		<ul class="sumary-list">
			<li>Subtotal: {{ formatCurrency(factura?.subtotal || 0) }}</li>
			<li>IVA (19%): {{ formatCurrency(factura?.impuestos || 0) }}</li>
			<li>
				<strong>
					Total a pagar: {{ formatCurrency(factura?.total || 0) }}
				</strong>
			</li>
		</ul>
	</main>
	<footer>
		<p>¡Gracias por preferirnos!</p>
		<p>Esta factura es un comprobante de pago válido</p>
		<button
			type="button"
			class="btn"
			@click="usePDF().exportarPdf(`factura_reserva.pdf`, pdfRef)"
		>
			🖨️ Imprimir Factura
		</button>
	</footer>
</template>
