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

	<div class="hero">
		<h1>
			Bienvenido, regístrate y acércate
			<span class="resaltado">más a tus vacaciones ideales </span>
		</h1>
		<div>
			<button data-test="btn-login" class="btn-alternative" @click="goToLogin">Iniciar Sesión</button>
			<button data-test="btn-register" class="btn-alternative" @click="goToRegister">Registrarse</button>
		</div>
	</div>
</template>

<style scoped>
.hero h1 {
	text-align: center;
}

.hero {
	min-height: 100vh;
	background: url("../assets/hero.jpg");
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
}
</style>