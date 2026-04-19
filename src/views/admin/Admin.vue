<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient";
import AdminUsuario from "./AdminUsuario.vue";
import AdminReserva from "./AdminReserva.vue";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();
const activeTab = ref<"usuarios" | "reservas">("usuarios");

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("error", "Error al cerrar sesión");
	} else {
		router.push("/login");
	}
};

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<!-- Header -->
	<div class="navbar">
		<h1>Panel de Administración</h1>
		<div>
			<button class="btn btn-critical" @click="handleLogout">
				Cerrar Sesión
			</button>
		</div>
	</div>

	<!-- Pestañas -->
	<div class="tabs">
		<button
			class="tab-button"
			:class="{ active: activeTab === 'usuarios' }"
			@click="activeTab = 'usuarios'"
		>
			Usuarios
		</button>
		<button
			class="tab-button"
			:class="{ active: activeTab === 'reservas' }"
			@click="activeTab = 'reservas'"
		>
			Reservas
		</button>
	</div>

	<!-- Mensajes -->
	<ToastMessage />

	<!-- Contenido de pestañas -->
	<div class="tab-content">
		<AdminUsuario v-if="activeTab === 'usuarios'" />
		<AdminReserva v-if="activeTab === 'reservas'" />
	</div>
</template>
