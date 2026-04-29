<script setup lang="ts">
import { useToast } from "../composables/useToast.ts";
const { message } = useToast();

const getClassType = (status: string): string => {
	switch (status) {
		case "success":
			return "alert alert-success";
		case "error":
			return "alert alert-danger";
		case "info":
			return "alert alert-warning";
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
