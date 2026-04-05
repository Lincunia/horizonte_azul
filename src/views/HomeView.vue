<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const goToLogin = (): void => {
	router.push("/login");
};

const goToRegister = (): void => {
	router.push("/register");
};
</script>

<template>
	<div>
		<h1>Hotel Horizonte Azul</h1>
		<p>
			Haremos el esfuerzo para poder mostrar estilo en la aplicación, pero de
			momento, esto es lo que se puede ver dentro
		</p>

		<div>
			<button @click="goToLogin">Iniciar Sesión</button>
			<button @click="goToRegister">Registrarse</button>
		</div>
	</div>
</template>
