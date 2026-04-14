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
	<div>
		<div class="navbar">
			<img :src="logo" />
			<span>Hotel Horizonte Azul</span>
		</div>

		<div class="hero">
			<div class="hero-content">
				<h1>
					Bienvenido, regístrate y acércate
					<span class="resaltado">más a tus vacaciones ideales </span>
				</h1>

				<button class="btn" @click="goToLogin">Iniciar Sesión</button>

				<button
					class="btn"
					style="margin-top: 10px; background: var(--naranja)"
					@click="goToRegister"
				>
					Registrarse
				</button>
			</div>
		</div>
	</div>
</template>

