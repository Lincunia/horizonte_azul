<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";

const router = useRouter();

interface LoginForm {
	email: string;
	password: string;
}

const loginForm = ref<LoginForm>({
	email: "",
	password: "",
});

const message = ref<string>("");

const loading = ref(false);

const handleLogin = async (): Promise<void> => {
	loading.value = false;
	message.value = "";
	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email: loginForm.value.email,
			password: loginForm.value.password,
		});
		if (error) {
			if (error.message.includes("Invalid login credentials")) {
				throw new Error("Correo electrónico o contraseña incorrectos");
			}
			if (error.message.includes("Email not confirmed")) {
				throw new Error(
					"Por favor, verifica tu correo electrónico antes de iniciar sesión",
				);
			}
			throw new Error(error.message);
		}

		if (!data.user) {
			throw new Error("Error al iniciar sesión");
		}

		const { error: updateError } = await supabase
			.from("usuarios")
			.update({
				ultimo_acceso: new Date().toISOString(),
			})
			.eq("auth_id", data.user.id);

		if (updateError) {
			//throw updateError;
			console.error("Error al actualizar último acceso:", updateError);
			// No lanzamos error aquí porque el login fue exitoso
		}
		message.value = "Inicio de sesión exitoso. Redirigiendo...";
		const { data: userData, error: userError } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", data.user.id)
			.single();

		if (userError) {
			console.error("Error al obtener rol:", userError);
			// Redirigir al home por defecto si no se puede obtener el rol
			setTimeout(() => router.push("/"), 1500);
		} else {
			// Redirigir según el rol (opcional)
			setTimeout(() => {
				if (userData.rol_usuario === "Administrador") {
					router.push("/admin/dashboard");
				} else if (userData.rol_usuario === "Recepcionista") {
					router.push("/recepcion/dashboard");
				} else {
					router.push("/");
				}
			}, 1500);
		}
	} catch (error: any) {
		console.error(error);
		message.value = error.message || "Ocurrió un error durante el registro";
	} finally {
		loading.value = false;
	}
	/*
	message.value = "Inicio de sesión exitoso";
	setTimeout(() => {
		router.push("/");
	}, 1500);
	*/
};

const goToRegister = (): void => {
	router.push("/register");
};

const goToHome = (): void => {
	router.push("/");
};
</script>

<template>
	<div>
		<h1>Inicio de Sesión</h1>

		<form @submit.prevent="handleLogin">
			<div>
				<label>Email:</label>
				<input
					type="email"
					v-model="loginForm.email"
					required
					placeholder="usuario@ejemplo.com"
				/>
			</div>

			<div>
				<label>Contraseña:</label>
				<input
					type="password"
					v-model="loginForm.password"
					required
					placeholder="123456Seven"
				/>
			</div>

			<div>
				<button type="submit" :disabled="loading">
					{{ loading ? "Iniciando sesión..." : "Iniciar Sesión" }}
				</button>
				<button type="button" @click="goToRegister" :disabled="loading">
					¿No tienes cuenta? Regístrate
				</button>
				<button type="button" @click="goToHome" :disabled="loading">
					Volver al inicio
				</button>
			</div>
		</form>

		<div v-if="message">
			<p>{{ message }}</p>
		</div>
	</div>
</template>
