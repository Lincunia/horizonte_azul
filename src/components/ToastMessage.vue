<script setup lang="ts">
import { useToast } from "../composables/useToast.ts";
const { message } = useToast();
</script>

<template>
	<div v-if="message" :class="message.type">
		{{ message.text }}
	</div>
</template>
