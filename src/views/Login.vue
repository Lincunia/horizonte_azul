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

const handleLogin = async (): Promise<void> => {
	loading.value = true;
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

		// Actualizar último acceso (opcional, no crítico)
		const { error: updateError } = await supabase
			.from("usuarios")
			.update({
				ultimo_acceso: new Date().toISOString(),
			})
			.eq("auth_id", data.user.id);

		if (updateError) {
			console.error("Error al actualizar último acceso:", updateError);
			// No interrumpimos el flujo
		}

		// Obtener el rol del usuario
		const { data: userData, error: userError } = await supabase
			.from("usuarios")
			.select("rol_usuario")
			.eq("auth_id", data.user.id)
			.single();

		if (userError) {
			console.error("Error al obtener rol:", userError);
			useToast().showMessage(
				"success",
				"Inicio de sesión exitoso. Redirigiendo...",
			);
			setTimeout(() => router.push("/"), 1500);
			return;
		}

		// Mostrar mensaje de éxito y redirigir según el rol
		useToast().showMessage(
			"success",
			"Inicio de sesión exitoso. Redirigiendo...",
		);

		setTimeout(() => {
			switch (userData.rol_usuario) {
				case "Administrador":
					router.push("/admin/dashboard");
					break;
				case "Recepcionista":
					router.push("/reception/dashboard"); // Corregido: reception en lugar de recepcion
					break;
				case "Huesped":
					router.push("/guest/dashboard"); // Corregido: usando la ruta correcta
					break;
				default:
					router.push("/");
					break;
			}
		}, 1500);
	} catch (error: any) {
		console.error("Error en login:", error);

		useToast().showMessage(
			"error",
			error.message || "Ocurrió un error durante el inicio de sesión",
		);
	} finally {
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
	<div class="container">
		<div class="card">
			<img v-if="logo" :src="logo" class="logo" alt="Logo" />
			<h2>Iniciar Sesión</h2>
			<form @submit.prevent="handleLogin">
				<div class="input-group">
					<label>Email</label>
					<input
						type="email"
						v-model="loginForm.email"
						required
						:disabled="loading"
					/>
				</div>
				<div class="input-group">
					<label>Contraseña</label>
					<input
						type="password"
						v-model="loginForm.password"
						required
						:disabled="loading"
					/>
				</div>
				<button type="submit" class="btn" :disabled="loading">
					{{ loading ? "Iniciando sesión..." : "Iniciar Sesión" }}
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					@click="goToHome"
					:disabled="loading"
				>
					Volver al inicio
				</button>
				<p class="link" @click="goToRegister">¿No tienes cuenta? Regístrate</p>
			</form>

			<ToastMessage />
		</div>
	</div>
</template>
