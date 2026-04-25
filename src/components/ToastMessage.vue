<script setup lang="ts">
import { useToast } from "../composables/useToast.ts";
const { message } = useToast();

const getClassType = (status: string): string => {
	switch (status) {
		case "success":
			return "success-message";
		case "error":
			return "error-message";
		case "info":
			return "info-message";
		default:
			return "error-message";
	}
};
</script>

<template>
	<div v-if="message" :class="getClassType(message.type)">
		{{ message.text }}
	</div>
</template>

<style scoped>
div.success-message {
	margin-top: 1rem;
	padding: 0.75rem;
	color: var(--verde-principal);
	border-radius: 4px;
	text-align: center;
}

div.error-message {
	margin-top: 1rem;
	padding: 0.75rem;
	color: var(--rojo);
	border-radius: 4px;
	text-align: center;
}

div.info-message {
	background-color: #ffeeba;
	padding: 0.75rem;
	border-radius: 4px;
	margin: 1rem;
	text-align: center;
}
</style>
