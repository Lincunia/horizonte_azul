<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";

interface LoginForm {
	email: string;
	password: string;
}

const loginForm = reactive<LoginForm>({
	email: "",
	password: "",
});

const message = ref<string>("");

const handleLogin = (): void => {
	// Si bien podría haber usado solamente ref(), dejaré que use el reactive()
	// para ver qué otros usos puedo sacar
	if (!loginForm.email || !loginForm.password) {
		message.value = "Por favor complete todos los campos";
		return;
	}
	message.value = "Inicio de sesión exitoso";
	setTimeout(() => {
		router.push("/");
	}, 1500);
};

const router = useRouter();

const goToRegister = (): void => {
	router.push("/register");
};

const goBack = (): void => {
	router.back();
};
</script>

<template>
	<div>
		<h1>Inicio de Sesión</h1>

		<form @submit.prevent="handleLogin"> <!--El submit no recargará la página en caso de que el usuario la riegue-->
			<div>
				<label>Email:</label>
				<input type="email" v-model="loginForm.email" required />
			</div>

			<div>
				<label>Contraseña:</label>
				<input type="password" v-model="loginForm.password" required />
			</div>

			<div>
				<button type="submit">Iniciar Sesión</button>
				<button type="button" @click="goToRegister">
					¿No tienes cuenta? Regístrate
				</button>
				<button type="button" @click="goBack">Volver</button>
			</div>
		</form>

		<div v-if="message">
			<p>{{ message }}</p>
		</div>
	</div>
</template>
