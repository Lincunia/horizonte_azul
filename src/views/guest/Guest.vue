<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();

interface NavLink {
	name: string;
	path: string;
}

const navLinks = ref<NavLink[]>([
	{ name: "Habitaciones", path: "/dashboard" },
	{ name: "Lista Reservas", path: "/reservations" },
	{ name: "Calendario", path: "/calendar" },
]);

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

		<div class="nav-links">
			<a
				v-for="link in navLinks"
				:key="link.path"
				:href="`/guest${link.path}`"
				class="nav-link"
				active-class="active"
			>
				{{ link.name }}
			</a>
		</div>
		<div class="nav-actions">
			<button class="btn btn-critical" @click="handleLogout">
				Cerrar Sesión
			</button>
		</div>
	</div>
	<ToastMessage />
	<router-view />
</template>

<style scoped>
.nav-links {
	display: flex;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.nav-link {
	color: rgba(255, 255, 255, 0.9);
	padding: 0.75rem;
	margin: 0.5rem;
	border-radius: 4px;
	border: none;
	font-weight: bold;
	transition: 0.3s;
	font-size: 1rem;
}

.nav-link:hover {
	color: white;
	background: rgba(255, 255, 255, 0.15);
}

.nav-link.active {
	color: white;
	background: rgba(255, 255, 255, 0.25);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-link.active::after {
	content: "";
	position: absolute;
	bottom: -2px;
	left: 50%;
	width: 30px;
	height: 3px;
	background: white;
	border-radius: 2px;
}
</style>
