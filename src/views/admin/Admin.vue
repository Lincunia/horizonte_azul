<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../composables/useToast.ts";
import logo from "../../assets/logo.png";
import AdminUser from "./AdminUser.vue";
import AdminReservation from "./AdminReservation.vue";
import AdminRoom from "./AdminRoom.vue";
import AdminInvoice from "./AdminInvoice.vue";
import ToastMessage from "../../components/ToastMessage.vue";

const tabs = [
	{ id: "users", name: "Usuarios" },
	{ id: "reservations", name: "Reservas" },
	{ id: "rooms", name: "Habitaciones" },
	{ id: "invoices", name: "Facturas" },
];
const activeTab = ref(tabs[0]?.id || "users");

const router = useRouter();
const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("alert alert-danger", "Error al cerrar sesión");
		return;
	}
	setTimeout(() => router.push("/login"), 1500);
};

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<nav class="navbar navbar-expand-lg navbar-light bg-light p-4">
		<div class="navbar-brand">
			<img v-if="logo" :src="logo" width="30" height="30" alt="Logo" />
			Panel de Administración
		</div>
		<div class="collapse navbar-collapse">
			<ul class="navbar-nav">
				<li
					v-for="tab in tabs"
					class="nav-item"
					:class="{ active: activeTab === tab.id }"
				>
					<a class="nav-link" @click.prevent="activeTab = tab.id" role="button">
						{{ tab.name }}
					</a>
				</li>
			</ul>
		</div>

		<button class="btn btn-danger" @click="handleLogout">Cerrar Sesión</button>
	</nav>

	<ToastMessage />

	<main class="container py-4">
		<AdminUser v-if="activeTab === 'users'" />
		<AdminReservation v-if="activeTab === 'reservations'" />
		<AdminRoom v-if="activeTab === 'rooms'" />
		<AdminInvoice v-if="activeTab === 'invoices'" />
	</main>
</template>
