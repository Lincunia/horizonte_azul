<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";

onMounted(async () => {
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const accessToken = hashParams.get("access_token");

	if (!accessToken) {
		return;
	}
	const { data, error } = await supabase.auth.setSession({
		access_token: accessToken,
		refresh_token: hashParams.get("refresh_token") || "",
	});

	if (error) {
		useToast().showMessage(
			"alert alert-danger",
			"Error al verificar tu cuenta",
		);
		useRouter().push("/login");
		return;
	}

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
			useToast().showMessage(
				"alert alert-danger",
				"Error al crear perfil:",
				insertError,
			);
		} else {
			useToast().showMessage(
				"alert alert-success",
				"¡Cuenta verificada exitosamente!",
			);
			localStorage.removeItem("pendingUserData");
			localStorage.removeItem("pendingRegistrationTimestamp");
		}
	}

	// Cerrar sesión para forzar login
	await supabase.auth.signOut();
	useRouter().push("/login");
});
</script>

<template>
	<div class="container-md d-flex justify-content-center">
		<div class="align-items-center">
			<h2>Verificando tu cuenta...</h2>
			<p>Por favor espera mientras confirmamos tu registro.</p>
		</div>
		<ToastMessage />
	</div>
</template>
