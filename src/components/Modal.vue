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
		<div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
			<div class="modal-container">
				<div class="modal-header">
					<h2>{{ title }}</h2>
					<button class="modal-close" @click="closeModal">✕</button>
				</div>
				<div class="modal-body">
					<slot></slot>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 9999;
}

.modal-container {
	background: white;
	border-radius: 12px;
	width: 90%;
	max-width: 600px;
	max-height: 90vh;
	overflow: auto;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1.5rem;
	border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
	margin: 0;
	color: #2c3e50;
}

.modal-close {
	background: none;
	border: none;
	font-size: 1.5rem;
	cursor: pointer;
	color: #7f8c8d;
}

.modal-close:hover {
	color: #e74c3c;
}

.modal-body {
	padding: 1.5rem;
}
</style>
