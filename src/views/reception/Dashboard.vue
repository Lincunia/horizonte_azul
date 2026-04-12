<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const goToHome = (): void => {
	router.push("/");
};
</script>

<template>
	<div>
		<button @click="goToHome">Cerrar sesión</button>
	</div>
</template>

