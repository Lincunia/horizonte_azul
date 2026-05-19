<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import type { IdentificationType, Role } from "../composables/dbInformation.ts";
import ToastMessage from "../components/ToastMessage.vue";
import logo from "../assets/logo.png";

interface RegisterForm {
	idType: IdentificationType;
	idNum: number;
	name: string;
	email: string;
	phone: string;
	role: Role;
	password: string;
	confirmPassword: string;
}

const registerForm = ref<RegisterForm>({
	idType: "CC",
	idNum: 0,
	name: "",
	email: "",
	phone: "",
	role: "Huesped",
	password: "",
	confirmPassword: "",
});
const router = useRouter();
const loading = ref(false);
const registered = ref(false);
const phonePattern = /^(\+\d{1,3}[.\s])?\d{1,10}$/;
const idPattern = /^\d+$/;

const registerUser = async () => {
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: registerForm.value.email,
		password: registerForm.value.password,
		options: {
			data: {
				name: registerForm.value.name,
				tipo_identificacion: registerForm.value.idType,
				numero_identificacion: registerForm.value.idNum,
				telefono: registerForm.value.phone,
				rol_usuario: registerForm.value.role,
			},
		},
	});
	if (authError) throw authError;
	if (!authData.user) throw new Error("No se pudo crear el usuario");
};

const handleRegister = async (): Promise<void> => {
	loading.value = true;

	try {
		if (!idPattern.test(String(registerForm.value.idNum))) {
			throw new Error("Identificación no válida");
		}

		if (!phonePattern.test(registerForm.value.phone)) {
			throw new Error("Teléfono no válido");
		}

		if (registerForm.value.password !== registerForm.value.confirmPassword) {
			throw new Error("Las contraseñas no coinciden");
		}
		if (registerForm.value.password.length < 6) {
			throw new Error("La contraseña debe tener al menos 6 caracteres");
		}
		await registerUser();
		loading.value = true;
		registered.value = true;
		useToast().showMessage(
			"alert alert-success",
			"Registro completado. Revisa tu correo electrónico y confirma " +
				"tu cuenta para iniciar sesión.",
		);
		registerForm.value.password = "";
		registerForm.value.confirmPassword = "";
	} catch (error: any) {
		if (error instanceof Error && error.message.includes("email_exists")) {
			useToast().showMessage(
				"alert alert-danger",
				"El usuario ya se encuentra registrado",
			);
			return;
		}
		useToast().showMessage("alert alert-danger", error.message);
	} finally {
		loading.value = false;
	}
};

const goToLogin = (): void => {
	router.push("/login");
};

const goToHome = (): void => {
	router.push("/");
};

onMounted(() => {
	useToast().hideMessage();
});
</script>

<template>
	<header class="text-center">
		<img v-if="logo" :src="logo" class="logo" alt="Logo" />
		<h2>Registro</h2>
	</header>
	<form @submit.prevent="handleRegister" class="container-sm col-4">
		<div class="mb-3">
			<label class="form-label">Tipo de identificación</label>
			<select
				class="form-select"
				v-model="registerForm.idType"
				:disabled="loading"
				required
			>
				<option>CC</option>
				<option>CE</option>
				<option>Pasaporte</option>
				<option>Otro</option>
			</select>
		</div>

		<div class="mb-3">
			<label class="form-label">Número de identificación</label>
			<input
				type="number"
				v-model="registerForm.idNum"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Nombre</label>
			<input
				type="text"
				v-model="registerForm.name"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Email</label>
			<input
				type="email"
				v-model="registerForm.email"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Teléfono</label>
			<input
				type="tel"
				v-model="registerForm.phone"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Rol</label>
			<select
				class="form-select"
				v-model="registerForm.role"
				:disabled="loading"
				required
			>
				<option>Huesped</option>
				<option>Recepcionista</option>
				<option>Administrador</option>
			</select>
		</div>

		<div class="mb-3">
			<label class="form-label">Contraseña</label>
			<input
				type="password"
				v-model="registerForm.password"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="mb-3">
			<label class="form-label">Confirmar Contraseña</label>
			<input
				type="password"
				v-model="registerForm.confirmPassword"
				:disabled="loading"
				class="form-control"
				required
			/>
		</div>

		<div class="d-flex justify-content-center gap-5">
			<button type="submit" class="btn btn-primary" :disabled="loading">
				{{ loading ? "Registrando..." : "Registrarse" }}
			</button>

			<button
				type="button"
				class="btn btn-secondary"
				@click="goToHome"
				:disabled="loading"
			>
				Volver
			</button>
		</div>

		<a @click="goToLogin" class="p-1 rounded">
			¿Ya tienes cuenta? Inicia sesión
		</a>

		<ToastMessage />
	</form>
</template>
