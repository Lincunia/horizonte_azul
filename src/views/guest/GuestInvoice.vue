<script setup lang="ts">
import { ref } from "vue";
import { usePDF } from "../../composables/usePDF.ts";
import {
	calculuateDaysStaying,
	calculateUnitValue,
} from "../../composables/reservationMethods.ts";

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
	<main ref="pdfRef" class="container-sm">
		<div class="mb-3 text-center">
			<h1>HOTEL HORIZONTE AZUL</h1>
			<!-- Dirección con NIT, calle y Teléfono -->
		</div>

		<section v-if="factura && reserva">
			<h3>Resumen de la factura</h3>
			<ul class="list-group">
				<li class="list-group-item">
					<strong>Factura N°:</strong> {{ factura.id_factura }}
				</li>
				<li class="list-group-item">
					<strong>Fecha:</strong>
					{{ formatDate(factura.fecha_emision) }}
				</li>
				<li class="list-group-item">
					<strong>Reserva N°:</strong> {{ reserva.id_reserva }}
				</li>
				<li class="list-group-item">
					<strong>Estado:</strong> {{ factura.estado_pago }}
				</li>
				<li class="list-group-item">
					<strong>Habitación:</strong> #{{ reserva.habitaciones.numero }} -
					{{ reserva.habitaciones.tipo }}
				</li>
				<li class="list-group-item">
					<strong>Huéspedes:</strong>
					{{ reserva.num_huespedes }} personas
				</li>
				<li class="list-group-item">
					<strong>Check-in:</strong>
					{{ formatDate(reserva.fecha_inicio) }}
				</li>
				<li class="list-group-item">
					<strong>Check-out:</strong>
					{{ formatDate(reserva.fecha_fin) }}
				</li>
				<li class="list-group-item">
					<strong>Método de pago:</strong> {{ factura.metodo_pago }}
				</li>
			</ul>
		</section>

		<table class="table">
			<thead class="thead-dark">
				<tr>
					<th scope="col">Descripción</th>
					<th scope="col">Cantidad</th>
					<th scope="col">Valor Unitario</th>
					<th scope="col">Total</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Estadía en habitación #{{ reserva?.habitaciones.numero }}</td>
					<td>
						{{
							calculuateDaysStaying(
								reserva.fecha_inicio,
								reserva.fecha_fin,
							)
						}}
						noches
					</td>
					<td>
						{{
							formatCurrency(
								calculateUnitValue(
									factura.subtotal,
									reserva.fecha_inicio,
									reserva.fecha_fin,
								),
							)
						}}
					</td>
					<td>
						{{ formatCurrency(factura?.subtotal || 0) }}
					</td>
				</tr>
			</tbody>
		</table>

		<ul class="list-group">
			<li class="list-group-item bg-info">
				Subtotal: {{ formatCurrency(factura?.subtotal || 0) }}
			</li>
			<li class="list-group-item bg-info">
				IVA (19%): {{ formatCurrency(factura?.impuestos || 0) }}
			</li>
			<li class="list-group-item bg-info">
				Total a pagar: {{ formatCurrency(factura?.total || 0) }}
			</li>
		</ul>
	</main>
	<footer class="text-center m-3">
		<h3>¡Gracias por preferirnos!</h3>
		<p>Esta factura es un comprobante de pago válido</p>
		<button
			type="button"
			class="btn btn-secondary"
			@click="usePDF().exportarPdf(`factura_reserva.pdf`, pdfRef)"
		>
			🖨️ Imprimir Factura
		</button>
	</footer>
</template>
