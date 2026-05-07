<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
	modelValue: boolean;
	title?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
}>();

const isOpen = ref(props.modelValue);

watch(
	() => props.modelValue,
	(newVal) => {
		isOpen.value = newVal;
	},
);

watch(isOpen, (newVal) => {
	if (!newVal) {
		emit("update:modelValue", false);
		emit("close");
	}
});

const closeModal = () => {
	isOpen.value = false;
};

const handleOverlayClick = (e: MouseEvent) => {
	if (e.target === e.currentTarget) {
		closeModal();
	}
};
</script>

<template>
	<Teleport to="body">
		<div
			v-if="isOpen"
			class="modal fade show d-block"
			style="background-color: rgba(0, 0, 0, 0.5)"
			@click="handleOverlayClick"
		>
			<div class="modal-dialog modal-dialog-centered" role="dialog">
				<div class="modal-content">
					<div class="modal-header justify-content-between">
						<h2>{{ title }}</h2>
						<button @click="closeModal">✕</button>
					</div>
					<slot class="modal-body"></slot>
				</div>
			</div>
		</div>
	</Teleport>
</template>
