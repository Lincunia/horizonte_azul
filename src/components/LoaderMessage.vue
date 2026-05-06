<script setup lang="ts">
interface Props {
	visible?: boolean,
	message?: string
}
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  message: ""
})
</script>

<template>
	<div class="text-center mb-4">
		<div v-if="visible" class="spinner-border text-primary" role="status"></div>
		<p v-if="message"> {{ message }} </p>
	</div>
</template>
