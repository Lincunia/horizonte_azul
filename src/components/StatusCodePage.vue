<script lang="ts">
import { defineComponent, type PropType } from "vue";

// Definir tipos para los códigos de estado permitidos
type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 500 | 502 | 503;

// Interfaz para los mensajes por defecto
interface StatusMessages {
	[key: number]: string;
}

export default defineComponent({
	name: "StatusCode",

	props: {
		// Código de estado HTTP
		code: {
			type: Number as PropType<HttpStatusCode>,
			required: true,
			validator: (value: number): boolean => {
				const validCodes: HttpStatusCode[] = [
					200, 201, 400, 401, 403, 404, 500, 502, 503,
				];
				return validCodes.includes(value as HttpStatusCode);
			},
		},
		// Mensaje personalizado (opcional)
		customMessage: {
			type: String as PropType<string>,
			default: "",
		},
		// Descripción adicional
		description: {
			type: String as PropType<string>,
			default: "",
		},
		// Mostrar botones de acción
		showActions: {
			type: Boolean as PropType<boolean>,
			default: true,
		},
		showRetry: {
			type: Boolean as PropType<boolean>,
			default: true,
		},
		showBack: {
			type: Boolean as PropType<boolean>,
			default: true,
		},
		showHome: {
			type: Boolean as PropType<boolean>,
			default: true,
		},
	},

	emits: {
		retry: (code: number) => typeof code === "number",
		back: () => true,
		home: () => true,
	},

	computed: {
		// Clase CSS basada en el código de estado
		/*
		statusClass(): string {
			if (this.code >= 200 && this.code < 300) return "status-success";
			if (this.code >= 400 && this.code < 500) return "status-client-error";
			if (this.code >= 500) return "status-server-error";
			return "";
		},
		*/

		// Mensaje por defecto según el código
		message(): string {
			if (this.customMessage) return this.customMessage;

			const messages: StatusMessages = {
				200: "OK - Todo funciona correctamente",
				201: "Creado - Recurso creado exitosamente",
				400: "Solicitud incorrecta",
				401: "No autorizado",
				403: "Acceso prohibido",
				404: "Página no encontrada",
				500: "Error interno del servidor",
				502: "Puerta de enlace incorrecta",
				503: "Servicio no disponible",
			};

			return messages[this.code] || "Código de estado desconocido";
		},

		// Icono según el código de estado
		iconClass(): string {
			if (this.code >= 200 && this.code < 300) return "fas fa-check-circle";
			if (this.code >= 400 && this.code < 500)
				return "fas fa-exclamation-triangle";
			if (this.code >= 500) return "fas fa-times-circle";
			return "fas fa-info-circle";
		},
	},

	methods: {
		handleRetry(): void {
			this.$emit("retry", this.code);
		},

		handleBack(): void {
			this.$emit("back");
			// Verificar si router está disponible antes de usarlo
			if (this.$router) {
				this.$router.back();
			}
		},

		handleHome(): void {
			this.$emit("home");
			// Verificar si router está disponible antes de usarlo
			if (this.$router) {
				this.$router.push("/");
			}
		},
	},
});
</script>

<template>
	<div class="container" :class="statusClass">
		<div class="status-code-content">
			<div>
				<i :class="iconClass"></i>
			</div>
			<div>
				<h2>{{ code }}</h2>
				<p>{{ message }}</p>
				<p v-if="description">{{ description }}</p>
			</div>
			<div v-if="showActions">
				<button @click="handleRetry" v-if="showRetry">Reintentar</button>
				<button @click="handleBack" v-if="showBack">Volver atrás</button>
				<button @click="handleHome" v-if="showHome">Ir al inicio</button>
			</div>
		</div>
	</div>
</template>
