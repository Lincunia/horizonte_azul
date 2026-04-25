<script setup lang="ts">
import { useRouter } from "vue-router";
import logo from "../assets/logo.png";

const router = useRouter();

const goToLogin = () => {
	router.push("/login");
};

const goToRegister = () => {
	router.push("/register");
};
</script>

<template>
	<header>
		<img v-if="logo" :src="logo" class="logo" alt="Logo" />
		<span>Hotel Horizonte Azul</span>
	</header>

	<main class="hero">
		<h1>
			Bienvenido, regístrate y acércate
			<span class="resaltado">más a tus vacaciones ideales </span>
		</h1>
		<div style="flex-direction: row">
			<button class="btn-alternative" @click="goToLogin">Iniciar Sesión</button>
			<button class="btn-alternative" @click="goToRegister">Registrarse</button>
		</div>
	</main>
</template>

<style scoped>
.hero h1 {
	text-align: center;
}

main.hero {
	min-height: 100vh;
	background:
		linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
		url("./assets/hero.jpg");
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	color: var(--blanco);
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
}
</style>
