import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import AdminDashboard from "../views/AdminDashboard.vue";

const routes = [
	{
		path: "/",
		name: "home",
		component: HomeView,
	},
	{
		path: "/login",
		name: "login",
		component: LoginView,
	},
	{
		path: "/register",
		name: "register",
		component: RegisterView,
	},
	{
		path: "/admin/dashboard",
		name: "AdminDashboard",
		component: AdminDashboard,
		meta: {
			requiresAuth: true,
			requiresAdmin: true,
		},
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

router.beforeEach(async (to, from, next) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (to.meta.requiresAuth && !session) {
		next("/login");
	} else if (to.meta.requiresAdmin && session) {
		// Verificar si el usuario es administrador
		const { data: userData } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", session.user.id)
			.single();

		if (userData?.rol_usuario === "Administrador") {
			next();
		} else {
			next("/");
		}
	} else {
		next();
	}
});
export default router;
