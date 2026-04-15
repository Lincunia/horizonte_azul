<script setup lang="ts">

import { useToast } from "../composables/useToast";

const { message } = useToast();
</script>

<template>
	<div
		v-if="message"
		:class="message.type === 'success' ? 'success-message' : 'error-message'"
	>
		{{ message.text }}
	</div>
</template>
