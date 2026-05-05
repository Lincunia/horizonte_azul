<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";
import logo from "../assets/logo.png";

const router = useRouter();

interface RegisterForm {
	idType: "CC" | "CE" | "Pasaporte" | "Otro";
	idNum: number;
	name: string;
	email: string;
	phone: string;
	role: "Huesped" | "Recepcionista" | "Administrador";
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

const loading = ref(false);
const timeLeft = ref(0);
let emailToRegister: string;
let countdownInterval: number | null = null;
let pendingUserData: RegisterForm | null = null;

onUnmounted(() => {
	if (countdownInterval) {
		countdownInterval = null;
	}
});

onMounted(async () => {
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const accessToken = hashParams.get("access_token");

	if (accessToken) {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: hashParams.get("refresh_token") || "",
		});

		if (!error) {
			await handleEmailVerification(data.user?.email);
			useToast().showMessage(
				"alert alert-success",
				"¡Correo verificado! Ya puedes iniciar sesión.",
			);
			window.location.hash = "";
			unblockAndCleanup();
			setTimeout(() => router.push("/login"), 2000);
		}
		console.error("Error al confirmar correo:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al verificar tu cuenta. Intenta iniciar sesión.",
		);
		unblockAndCleanup();
		checkPendingRegistration();
	}
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (session) {
		router.push("/");
	}
	checkPendingRegistration();
});

const handleEmailVerification = async (email?: string) => {
	const pendingDataJson = localStorage.getItem("pendingUserData");
	if (!pendingDataJson || !email) return;

	const pendingData: RegisterForm = JSON.parse(pendingDataJson);
	if (pendingData.email !== email) return;

	await new Promise((resolve) => setTimeout(resolve, 1000));

	try {
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (!user || userError) {
			throw new Error("Usuario no encontrado" || userError);
		}

		const { error: insertionError } = await supabase.from("usuarios").insert({
			tipo_identificacion: pendingData.idType,
			numero_identificacion: pendingData.idNum,
			nombre: pendingData.name,
			email: pendingData.email,
			telefono: pendingData.phone,
			rol_usuario: pendingData.role,
			auth_id: user.id,
		});

		if (insertionError) {
			await supabase.auth.admin.deleteUser(user.id);
			throw new Error("Error al insertar usuario:", insertionError);
		}
		clearPendingRegistration();
	} catch (error) {
		useToast().showMessage("alert alert-danger", error.message);
	}
};

const checkPendingRegistration = () => {
	const pendingData = localStorage.getItem("pendingUserData");
	const pendingTimestamp = localStorage.getItem("pendingRegistrationTimestamp");

	if (!(pendingData && pendingTimestamp)) {
		return;
	}
	const timeElapsed = Date.now() - parseInt(pendingTimestamp);
	const remainingTime = 60 - Math.floor(timeElapsed / 1000);

	if (remainingTime <= 0) {
		clearPendingRegistration();
		useToast().showMessage(
			"alert slert-danger",
			"El tiempo para verificar el registro ha expirado. " +
			"Por favor, regístrate nuevamente.",
		);
		return;
	}
	pendingUserData = JSON.parse(pendingData);
	timeLeft.value = remainingTime;
	startCountdown();
	loading.value = true;
	useToast().showMessage(
		"alert slert-warning",
		`Registro pendiente de verificación. Tienes ${
		remainingTime} segundos para verificar tu correo.`,
	);
};

const handleTimeout = async () => {
	loading.value = false;
	timeLeft.value = 0;
	clearPendingRegistration();
	useToast().showMessage(
		"alert alert-danger",
		"Tiempo de verificación expirado. Por favor, regístrate nuevamente.",
	);
};

const clearPendingRegistration = () => {
	localStorage.removeItem("pendingUserData");
	localStorage.removeItem("pendingRegistrationTimestamp");
	pendingUserData = null;
	if (countdownInterval) {
		countdownInterval = null;
	}
};

const unblockAndCleanup = () => {
	loading.value = false;
	timeLeft.value = 0;
	clearPendingRegistration();
};

const startCountdown = () => {
	if (countdownInterval) {
		countdownInterval = null;
		return;
	}

	countdownInterval = setInterval(() => {
		if (timeLeft.value <= 0) {
			countdownInterval = null;
			handleTimeout();
			return;
		}
		useToast().showMessage(
			"alert alert-success",
			`Registro exitoso. Se ha enviado un correo de verificación a ${
			emailToRegister}. Tienes ${
			timeLeft.value} segundos para verificarlo.`,
			-1,
		);
		timeLeft.value--;
	}, 1000);
};

const registerUser = async (dataUser: RegisterForm) => {
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: dataUser.email,
		password: dataUser.password,
		options: {
			emailRedirectTo: `${window.location.origin}/verify-email`,
		},
	});

	if (authError) {
		throw authError;
	}

	if (!authData.user) {
		throw new Error("Registro de usuario no exitoso");
	}
	return authData.user;
};

const handleRegister = async (): Promise<void> => {
	loading.value = true;
	let phonePattern = /^(\+\d{1,3}[.\s])?\d{1,10}$/;
	let idPattern = /^\d+$/;

	try {
		if (!idPattern.test(registerForm.value.idNum)) {
			throw new Error("Teléfono no válido");
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
		await registerUser(registerForm.value);

		pendingUserData = { ...registerForm.value, "password" = "",  "confirmPassword" =""};
		delete pendingUserData[];
		delete pendingUserData[];
		localStorage.setItem("pendingUserData", JSON.stringify(pendingUserData));
		localStorage.setItem("pendingRegistrationTimestamp", Date.now().toString());

		loading.value = true;
		timeLeft.value = 60;
		emailToRegister = registerForm.value.email
		startCountdown();

		useToast().showMessage(
			"alert alert-success",
			`Registro exitoso. Se ha enviado un correo de verificación a ${
			registerForm.value.email}. Tienes ${
			timeLeft.value} segundos para verificarlo.`,
			-1,
		);

		registerForm.value = {
			idType: "CC",
			idNum: 0,
			name: "",
			email: "",
			phone: "",
			role: "Huesped",
			password: "",
			confirmPassword: "",
		};
	} catch (error: any) {
		console.error(error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Ocurrió un error durante el registro",
		);
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
			<button
				type="submit"
				class="btn btn-primary"
				:disabled="loading"
			>
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

		<div v-if="loading">
			<ToastMessage />
		</div>
	</form>
</template>
