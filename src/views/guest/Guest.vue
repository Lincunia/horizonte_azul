<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";
import GuestDashboard from "./GuestDashboard.vue";
import GuestReservations from "./GuestReservations.vue";
import GuestCalendar from "./GuestCalendar.vue";

const router = useRouter();

const activeTab = ref<"dashboard" | "reservations" | "calendar">("dashboard");

const name = ref("NavBar");

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

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<div class="navbar">
		<h1>Panel de Huésped</h1>
		<div>
			<button class="btn" @click="goToHome">Inicio</button>
			<button class="btn btn-critical" @click="handleLogout">
				Cerrar Sesión
			</button>
		</div>
	</div>

	<!-- Pestañas -->
	<div class="tabs">
		<button
			class="tab-button"
			:class="{ active: activeTab === 'dashboard' }"
			@click="activeTab = 'dashboard'"
		>
			Habitaciones
		</button>
		<button
			class="tab-button"
			:class="{ active: activeTab === 'reservations' }"
			@click="activeTab = 'reservations'"
		>
			Reservas
		</button>
		<button
			class="tab-button"
			:class="{ active: activeTab === 'calendar' }"
			@click="activeTab = 'calendar'"
		>
			Calendario
		</button>
	</div>

	<!-- Mensajes -->
	<ToastMessage />

	<div class="tab-content">
		<GuestDashboard v-if="activeTab === 'dashboard'" />
		<GuestReservations v-if="activeTab === 'reservations'" />
		<GuestCalendar v-if="activeTab === 'calendar'" />
	</div>

	<router-view />
</template>
