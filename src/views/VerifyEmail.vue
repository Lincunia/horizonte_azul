<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";

const router = useRouter();

onMounted(async () => {
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const accessToken = hashParams.get("access_token");

	if (accessToken) {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: hashParams.get("refresh_token") || "",
		});

		if (error) {
			useToast().showMessage("error", "Error al verificar tu cuenta");
			router.push("/login");
			return;
		}

		// Recuperar datos pendientes
		const pendingDataJson = localStorage.getItem("pendingUserData");
		if (pendingDataJson && data.user) {
			const pendingData = JSON.parse(pendingDataJson);

			// Crear el perfil de usuario
			const { error: insertError } = await supabase.from("usuarios").insert({
				tipo_identificacion: pendingData.idType,
				numero_identificacion: pendingData.idNum,
				nombre: pendingData.name,
				email: pendingData.email,
				telefono: pendingData.phone,
				rol_usuario: pendingData.role,
				auth_id: data.user.id,
			});

			if (insertError) {
				console.error("Error al crear perfil:", insertError);
				useToast().showMessage("error", "Error al completar el registro");
			} else {
				useToast().showMessage("success", "¡Cuenta verificada exitosamente!");
				localStorage.removeItem("pendingUserData");
				localStorage.removeItem("pendingRegistrationTimestamp");
			}
		}

		// Cerrar sesión para forzar login
		await supabase.auth.signOut();
		router.push("/login");
	}
});
</script>

<template>
	<div class="container">
		<div class="card">
			<h2>Verificando tu cuenta...</h2>
			<p>Por favor espera mientras confirmamos tu registro.</p>
		</div>
		<ToastMessage />
	</div>
</template>
