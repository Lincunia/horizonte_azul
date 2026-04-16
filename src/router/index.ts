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
		path: "/register",
		name: "register",
		component: () => import("../views/Register.vue"),
		meta: {
			title: "Registrarse",
		},
	},
	{
		path: "/reception/dashboard",
		name: "Recepcion",
		component: () => import("../views/reception/Reception.vue"),
		meta: {
			requiresAuth: true,
			requiresReception: true,
			title: "Panel de Recepción",
		},
	},
	{
		path: "/admin/dashboard",
		name: "Admin",
		component: () => import("../views/admin/Admin.vue"),
		meta: {
			requiresAuth: true,
			requiresAdmin: true,
		},
		title: "Panel de Administración",
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
		children: [
			{
				path: "dashboard",
				component: () => import("../views/guest/Dashboard.vue"),
			},
			{
				path: "reservations",
				component: () => import("../views/guest/Reservations.vue"),
			},
			{
				path: "calendar",
				component: () => import("../views/guest/Calendar.vue"),
			},
			{
				path: "reservar",
				component: () => import("../views/guest/GuestReservar.vue"),
			},
			{
				path: '',
				redirect: '/guest/dashboard'
			}
		],
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// ✅ FORMA CORRECTA - Retornando valores en lugar de usar next()
router.beforeEach(async (to, from) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();

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
		if (
			to.meta.requiresReception &&
			userData?.rol_usuario !== "Recepcionista"
		) {
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
