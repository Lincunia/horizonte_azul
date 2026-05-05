<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../composables/useToast.ts";
import AdminUsuario from "./AdminUsuario.vue";
import AdminReserva from "./AdminReserva.vue";
import AdminHabitacion from "./AdminHabitacion.vue";
import AdminFactura from "./AdminFactura.vue";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();
const activeTab = ref<"usuarios" | "reservas" | "habitaciones" | "facturas">(
	"usuarios",
);

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("alert alert-danger", "Error al cerrar sesión");
	} else {
		router.push("/login");
	}
};


onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<div>
		<!-- Header -->
		<div class="navbar">
			<h1>Panel de Administración</h1>
			<div>
				<button class="btn btn-critical" @click="handleLogout">
					Cerrar Sesión
				</button>
			</div>
		</div>

		<!-- Mensajes -->
		<ToastMessage />

		<!-- Pestañas -->
		<nav class="tabs">
			<li
				class="tab"
				:class="{ active: activeTab === 'usuarios' }"
				@click="activeTab = 'usuarios'"
			>
				Usuarios
			</li>
			<li
				class="tab"
				:class="{ active: activeTab === 'reservas' }"
				@click="activeTab = 'reservas'"
			>
				Reservas
			</li>
			<li
				class="tab"
				:class="{ active: activeTab === 'habitaciones' }"
				@click="activeTab = 'habitaciones'"
			>
				Habitaciones
			</li>
			<li
				class="tab"
				:class="{ active: activeTab === 'facturas' }"
				@click="activeTab = 'facturas'"
			>
				Facturas
			</li>
		</nav>

		<!-- Contenido de pestañas -->
		<div class="tab-content">
			<AdminUsuario v-if="activeTab === 'usuarios'" />
			<AdminReserva v-if="activeTab === 'reservas'" />
			<AdminHabitacion v-if="activeTab === 'habitaciones'" />
			<AdminFactura v-if="activeTab === 'facturas'" />
		</div>
	</div>
</template>
