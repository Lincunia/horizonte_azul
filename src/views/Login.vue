<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";
import logo from "../assets/logo.png";

const router = useRouter();

interface LoginForm {
	email: string;
	password: string;
}

const loginForm = ref<LoginForm>({
	email: "",
	password: "",
});

const loading = ref(false);

const signInUser = async (): Promise<string> => {
	const { data, error } = await supabase.auth.signInWithPassword({
		email: loginForm.value.email,
		password: loginForm.value.password,
	});
	if (error) {
		throw new Error(error.message);
	}
	if (!data.user) {
		throw new Error("Error al iniciar sesión");
	}
	return data.user.id
}

const updateLastAccess = async (auth_id: string): Promise<void> => {
	const { error } = await supabase
		.from("usuarios")
		.update({
			ultimo_acceso: new Date().toISOString(),
		})
		.eq("auth_id", auth_id);
	if (error) {
		throw new Error(error.message);
	}
};

const fetchUserData = async (auth_id: string): Promise<string> => {
	const { data, error} = await supabase
		.from("usuarios")
		.select("rol_usuario")
		.eq("auth_id", auth_id)
		.single();
	if (error) {
		throw new Error(error.message);
	}
	if (!data) {
		throw new Error("Error al autenticar usuario");
	}
	return data.rol_usuario;
};

const handleLogin = async (): Promise<void> => {
	loading.value = true;

	try {
		let auth_id:string = await signInUser();
		await updateLastAccess(auth_id);
		let rol_usuario:string = await fetchUserData(auth_id);

		setTimeout(() => {
			useToast().showMessage(
				"alert alert-success",
				"Inicio de sesión exitoso. Redirigiendo...",
			);
			switch (rol_usuario) {
				case "Administrador":
					router.push("/admin");
					break;
				case "Recepcionista":
					router.push("/reception");
					break;
				case "Huesped":
					router.push("/guest");
					break;
				default:
					router.push("/");
					break;
			}
			loading.value = false;
		}, 1500);
	} catch (error: any) {
		console.error("Error en el login\n" + error?.message);
		if (error?.message.includes("not_found")) {
			useToast().showMessage(
				"alert alert-danger",
				"Error al autenticar usuario",
			);
			return;
		}
		useToast().showMessage("alert alert-danger", error.message);
		loading.value = false;
	}
};

const goToRegister = (): void => {
	if (!loading.value) {
		router.push("/register");
	}
};

const goToHome = (): void => {
	if (!loading.value) {
		router.push("/");
	}
};
</script>

<template>
	<header class="text-center">
		<img v-if="logo" :src="logo" class="logo" alt="Logo" />
		<h2>Iniciar Sesión</h2>
	</header>
	<form @submit.prevent="handleLogin" class="container-sm col-4">
		<div class="mb-3">
			<label class="form-label">Email</label>
			<input
				type="email"
				v-model="loginForm.email"
				class="form-control"
				required
				:disabled="loading"
			/>
		</div>
		<div class="mb-3">
			<label class="form-label">Contraseña</label>
			<input
				type="password"
				v-model="loginForm.password"
				class="form-control"
				required
				:disabled="loading"
			/>
		</div>
		<div class="d-flex justify-content-center gap-5">
			<button type="submit" class="btn btn-primary" :disabled="loading">
				{{ loading ? "Iniciando sesión..." : "Iniciar Sesión" }}
			</button>
			<button
				type="button"
				class="btn btn-secondary"
				@click="goToHome"
				:disabled="loading"
			>
				Volver
			</button>
		</div>

		<a @click="goToRegister" class="p-1 rounded"
			>¿No tienes cuenta? Regístrate</a
		>

		<ToastMessage />
	</form>
</template>
