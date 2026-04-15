<script setup lang="ts">
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";

const router = useRouter();

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("error", "Error al cerrar sesión");
	} else {
		useToast().showMessage("success", "Sesión cerrada correctamente");
		setTimeout(() => {
			router.push("/login");
		}, 1500);
	}
};
</script>

<template>
	<div class="navbar">
		<h1>Panel de Huésped</h1>
		<div>
			<button class="btn" @click="handleLogout">Cerrar Sesión</button>
		</div>
	</div>
	<ToastMessage />
	<div class="container">Contenido del dashboard</div>
</template>
