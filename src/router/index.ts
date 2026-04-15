import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import Home from "../views/Home.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import ReceptionDashboard from "../views/ReceptionDashboard.vue";
import GuestDashboard from "../views/GuestDashboard.vue";

const routes = [
	{
		path: "/",
		name: "home",
		component: Home,
		meta: {
			requiresAuth: false,
			title: 'Horizonte Azul - Página principal'
		}
	},
	{
		path: "/login",
		name: "login",
		component: Login,
		meta: {
			title: 'Iniciar Sesión'
		}
	},
	{
		path: "/register",
		name: "register",
		component: Register,
		meta: {
			title: 'Registrarse'
		}
	},
	{
		path: "/reception/dashboard",
		name: "RecepcionDashboard",
		component: ReceptionDashboard,
		meta: {
			requiresAuth: true,
			requiresReception: true,
			title: "Panel de Recepción"
		},
	},
	{
		path: "/admin/dashboard",
		name: "AdminDashboard",
		component: AdminDashboard,
		meta: {
			requiresAuth: true,
			requiresAdmin: true,
			title: "Panel de Administración"
		},
	},
	{
		path: "/guest/dashboard",
		name: "Huesped",
		component: GuestDashboard,
		meta: {
			requiresAuth: true,
			requiresGuest: true,
			title: "Panel de Huésped"
		},
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// ✅ FORMA CORRECTA - Retornando valores en lugar de usar next()
router.beforeEach(async (to, from) => {
	const { data: { session } } = await supabase.auth.getSession();

	// Si la ruta requiere autenticación y no hay sesión
	if (to.meta.requiresAuth && !session) {
		return "/login";
	}

	// Si hay sesión, verificar roles específicos
	if (session) {
		// Obtener el rol del usuario
		const { data: userData, error } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", session.user.id)
			.single();

		if (error) {
			console.error("Error al verificar rol:", error);
			return "/";
		}

		// Verificar si requiere rol de administrador
		if (to.meta.requiresAdmin && userData?.rol_usuario !== "Administrador") {
			return "/";
		}

		// Verificar si requiere rol de recepción
		if (to.meta.requiresReception && userData?.rol_usuario !== "Recepcionista") {
			return "/";
		}

		// Verificar si requiere rol de huésped
		if (to.meta.requiresGuest && userData?.rol_usuario !== "Huesped") {
			return "/";
		}
	}

	// Si todo está bien, permitir la navegación
	return true;
});

// Actualizar el título de la página
router.afterEach((to) => {
	if (to.meta.title) {
		document.title = to.meta.title;
	}
});

export default router;

