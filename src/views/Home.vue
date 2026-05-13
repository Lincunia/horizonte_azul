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
	<main class="hero">
		<header class="d-md-flex p-3 justify-content-between align-items-center">
			<img v-if="logo" :src="logo" class="logo" alt="Logo" />
			<h2 class="text-white">Hotel Horizonte Azul</h2>
		</header>

		<h1 class="text-center p-5 text-white">
			Bienvenido, acércate a <br />
			<span class="text-primary"> tus vacaciones ideales </span>
		</h1>

		<div class="d-flex justify-content-center gap-5">
			<button class="btn btn-primary " @click="goToLogin">Iniciar Sesión</button>
			<button class="btn btn-primary" @click="goToRegister">Registrarse</button>
		</div>
	</main>
</template>

<style>
main.hero {
	min-height: 100vh;
	background: url("../assets/hero.jpg");
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
}
</style>
