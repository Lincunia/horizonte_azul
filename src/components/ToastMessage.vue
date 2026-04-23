<script setup lang="ts">
import { useToast } from "../composables/useToast";
const { message } = useToast();

const getClassType = (status) => {
	switch (status) {
		case "success":
			return "success-message";
		case "error":
			return "error-message";
		case "info":
			return "info-massage";
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
