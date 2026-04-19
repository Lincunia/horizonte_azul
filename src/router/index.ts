import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";

const routes = [
	{
		path: "/",
		name: "home",
		component: () => import("../views/Home.vue"),
		meta: {
			requiresAuth: false,
			title: "Horizonte Azul - Página principal",
		},
	},
	{
		path: "/login",
		name: "login",
		component: () => import("../views/Login.vue"),
		meta: {
			title: "Iniciar Sesión",
		},
	},
    {
        path: "/verify-email",
        name: "verify-email",
        component: () => import("../views/VerifyEmail.vue"),
        meta: {
            title: "Verificando correo",
        },
    },
	{
		path: "/register",
		name: "register",
		component: () => import("../views/Register.vue"),
		meta: {
			requiresAuth: false,
			title: "Registrarse",
		},
	},
	{
		path: "/reception",
		name: "Recepcion",
		component: () => import("../views/reception/Reception.vue"),
		meta: {
			requiresAuth: true,
			requiresReception: true,
			title: "Panel de Recepción",
		},
	},
	{
		path: "/admin",
		name: "Admin",
		component: () => import("../views/admin/Admin.vue"),
		meta: {
			requiresAuth: true,
			requiresAdmin: true,
			title: "Panel de Administración",
		},
	},
	{
		path: "/guest",
		name: "Huesped",
		component: () => import("../views/guest/Guest.vue"),
		meta: {
			requiresAuth: true,
			requiresGuest: true,
			title: "Panel de Huésped",
		},
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// Rutas que no requieren verificación
const publicRoutes = ["/login", "/register", "/verify-email"];

// Retornando valores de navegación - se quita el "from" porque no se usa
router.beforeEach(async (to) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	// Rutas públicas que no requieren verificación
	if (publicRoutes.includes(to.path)) {
		return true;
	}

	// Si hay sesión, verificar roles específicos
	if (session) {
		// Obtener el rol del usuario
		const { data: userData, error } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", session.user.id)
			.single();

		if (error || !userData) {
			console.error("Error al verificar rol:", error);
			return "/";
		}

		if (to.meta.requiresAdmin && userData?.rol_usuario !== "Administrador") {
			return "/";
		}

		if (to.meta.requiresReception && userData?.rol_usuario !== "Recepcionista") {
			return "/";
		}

		if (to.meta.requiresGuest && userData?.rol_usuario !== "Huesped") {
			return "/";
		}
	}

	return true;
});

// Actualizar el título de la página
router.afterEach((to) => {
	if (to.meta.title) {
		document.title = to.meta.title as string;
	}
});

export default router;
