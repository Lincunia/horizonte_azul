<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import logo from "../../assets/logo.png";
import ToastMessage from "../../components/ToastMessage.vue";
import GuestDashboard from "./GuestDashboard.vue";
import GuestReservations from "./GuestReservations.vue";
import GuestCalendar from "./GuestCalendar.vue";

const router = useRouter();

const tabs = [
	{ id: "dashboard", name: "Habitaciones" },
	{ id: "reservations", name: "Reservas" },
	{ id: "calendar", name: "Calendario" },
];

const activeTab = ref(tabs[0]?.id || "dashboard");

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("alert alert-danger", "Error al cerrar sesión");
		return;
	}
		setTimeout(() => {
			router.push("/login");
		}, 1500);
};

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<nav class="navbar navbar-expand-lg navbar-light bg-light p-4">
		<div class="navbar-brand">
			<img v-if="logo" :src="logo" width="30" height="30" alt="Logo" />
			Panel de Huésped
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
		<GuestDashboard v-if="activeTab === 'dashboard'" />
		<GuestReservations v-if="activeTab === 'reservations'" />
		<GuestCalendar v-if="activeTab === 'calendar'" />
	</main>
</template>
