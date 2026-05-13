import { createRouter, createWebHistory } from "vue-router";
import type { RouteLocationNormalized } from "vue-router";
import { supabase } from "../lib/supabaseClient";

const routes = [
	{
		path: "/",
		name: "home",
		component: () => import("../views/Home.vue"),
		meta: {
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
		path: "/reception",
		name: "Recepcion",
		component: () => import("../views/reception/Reception.vue"),
		meta: {
			requiresAuth: true,
			role: "Recepcionista",
			title: "Panel de Recepción",
		},
	},
	{
		path: "/admin",
		name: "Admin",
		component: () => import("../views/admin/Admin.vue"),
		meta: {
			requiresAuth: true,
			role: "Administrador",
			title: "Panel de Administración",
		},
	},
	{
		path: "/guest",
		name: "Huesped",
		component: () => import("../views/guest/Guest.vue"),
		meta: {
			requiresAuth: true,
			role: "Huesped",
			title: "Panel de Huésped",
		},
	},
	{
		path: "/:pathmatch(.*)*",
		name: "NotFound",
		component: () => import("../views/NotFoundView.vue"),
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

const getUserRole = async (authId: string): Promise<string | null> => {
	try {
		const { data, error } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", authId)
			.single();
		return error || !data ? null : data.rol_usuario;
	} catch (error) {
		return null;
	}
};

export const authGuard = async (to: RouteLocationNormalized) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const isAuthenticated = !!session;
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

	if (requiresAuth) {
		if (!isAuthenticated) {
			return "/login";
		}
		const requiredRole = to.meta.role as string | undefined;
		if (requiredRole && session?.user?.id) {
			const userRole = await getUserRole(session.user.id);
			if (userRole !== requiredRole) {
				return "/";
			}
		}
	}
	if ((to.path === "/login" || to.path === "/register") && isAuthenticated) {
		return "/";
	}
	return true;
};

router.beforeEach(authGuard);

export default router;
