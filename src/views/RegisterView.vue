<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

interface RegisterForm {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
}

const router = useRouter();
const registerForm = reactive<RegisterForm>({
	name: "",
	email: "",
	password: "",
	confirmPassword: "",
});
const message = ref<string>("");

const handleRegister = (): void => {
	// Validaciones básicas
	if (
		!registerForm.name ||
		!registerForm.email ||
		!registerForm.password ||
		!registerForm.confirmPassword
	) {
		message.value = "Por favor complete todos los campos";
		return;
	}

	if (registerForm.password !== registerForm.confirmPassword) {
		message.value = "Las contraseñas no coinciden";
		return;
	}

	if (registerForm.password.length < 6) {
		message.value = "La contraseña debe tener al menos 6 caracteres";
		return;
	}

	// Simulación de registro exitoso
	message.value = "Registro exitoso";
	setTimeout(() => {
		router.push("/login");
	}, 1500);
};

const goToLogin = (): void => {
	router.push("/login");
};

const goBack = (): void => {
	router.back();
};
</script>

<template>
	<div>
		<h1>Registro de Usuario</h1>

		<form @submit.prevent="handleRegister">
			<div>
				<label>Nombre:</label>
				<input type="text" v-model="registerForm.name" required />
			</div>

			<div>
				<label>Email:</label>
				<input type="email" v-model="registerForm.email" required />
			</div>

			<div>
				<label>Contraseña:</label>
				<input type="password" v-model="registerForm.password" required />
			</div>

			<div>
				<label>Confirmar Contraseña:</label>
				<input
					type="password"
					v-model="registerForm.confirmPassword"
					required
				/>
			</div>

			<div>
				<button type="submit">Registrarse</button>
				<button type="button" @click="goToLogin">
					¿Ya tienes cuenta? Inicia Sesión
				</button>
				<button type="button" @click="goBack">Volver</button>
			</div>
		</form>

		<div v-if="message">
			<p>{{ message }}</p>
		</div>
	</div>
</template>
