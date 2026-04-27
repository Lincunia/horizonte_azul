<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";
import GuestDashboard from "./GuestDashboard.vue";
import GuestReservations from "./GuestReservations.vue";
import GuestCalendar from "./GuestCalendar.vue";

const router = useRouter();

const activeTab = ref<"dashboard" | "reservations" | "calendar">("dashboard");

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		useToast().showMessage("error", "Error al cerrar sesión");
	} else {
		setTimeout(() => {
			router.push("/login");
		}, 1500);
	}
};

const goToHome = () => {
	router.push("/");
};

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<header class="navbar">
		<h1>Panel de Huésped</h1>
		<div>
			<button class="btn" @click="goToHome">Inicio</button>
			<button class="btn btn-critical" @click="handleLogout">
				Cerrar Sesión
			</button>
		</div>
	</header>

	<nav class="tabs">
		<ul>
			<li
				class="tab"
				:class="{ active: activeTab === 'dashboard' }"
			>
				<a @click="activeTab = 'dashboard'">Habitaciones</a>
			</li>
			<li
				class="tab"
				:class="{ active: activeTab === 'reservations' }"
			>
				<a @click="activeTab = 'reservations'">Reservas</a>
			</li>
			<li
				class="tab"
				:class="{ active: activeTab === 'calendar' }"
			>
				<a @click="activeTab = 'calendar'">Calendario</a>
			</li>
		</ul>
	</nav>

	<!-- Mensajes -->
	<ToastMessage />

	<div class="tab-content">
		<GuestDashboard v-if="activeTab === 'dashboard'" />
		<GuestReservations v-if="activeTab === 'reservations'" />
		<GuestCalendar v-if="activeTab === 'calendar'" />
	</div>
</template>
