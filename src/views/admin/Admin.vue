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
		// useToast().showMessage("error", "Error al cerrar sesión");
	} else {
		router.push("/login");
	}
};

const goToHome = () => {
	router.push("/");
};
</script>

<template>
	<div>
		<!-- Header -->
		<div class="navbar">
			<h1>Panel de Administración</h1>
			<div>
				<button class="btn" @click="goToHome">Inicio</button>
				<button class="btn btn-critical" @click="handleLogout">
					Cerrar Sesión
				</button>
			</div>
		</div>

		<!-- Mensajes -->
		<ToastMessage />

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

		<!-- Contenido de pestañas -->
		<div class="tab-content">
			<AdminUsuario v-if="activeTab === 'usuarios'" />
			<AdminReserva v-if="activeTab === 'reservas'" />
		</div>
	</div>
</template>

<style scoped>
/* Estilos para el panel de administración */

.navbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem 2rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	border-radius: 8px;
	margin-bottom: 2rem;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.navbar h1 {
	margin: 0;
	font-size: 1.8rem;
}

.navbar .btn {
	background: rgba(255, 255, 255, 0.2);
	color: white;
	border: 1px solid rgba(255, 255, 255, 0.3);
	padding: 0.5rem 1rem;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.navbar .btn:hover {
	background: rgba(255, 255, 255, 0.3);
	transform: translateY(-1px);
}

.navbar .btn-critical {
	background: rgba(255, 0, 0, 0.2);
	border-color: rgba(255, 0, 0, 0.3);
}

.navbar .btn-critical:hover {
	background: rgba(255, 0, 0, 0.3);
}

/* Pestañas */
.tabs {
	display: flex;
	border-bottom: 1px solid #e5e7eb;
	margin-bottom: 2rem;
}

.tab-button {
	padding: 0.75rem 1.5rem;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 1rem;
	font-weight: 500;
	color: #6b7280;
	transition: all 0.2s ease;
	border-bottom: 2px solid transparent;
}

.tab-button:hover {
	color: #374151;
}

.tab-button.active {
	color: #3b82f6;
	border-bottom-color: #3b82f6;
}

.tab-content {
	padding: 1rem 0;
}
</style>

