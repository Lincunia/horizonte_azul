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
	idNum: string;
	name: string;
	email: string;
	phone: string;
	role: "Huesped" | "Recepcionista" | "Administrador";
	password: string;
	confirmPassword: string;
}

const registerForm = ref<RegisterForm>({
	idType: "CC",
	idNum: "",
	name: "",
	email: "",
	phone: "",
	role: "Huesped",
	password: "",
	confirmPassword: "",
});

const loading = ref(false);
const isBlocked = ref(false);
const timeLeft = ref(0);
let countdownInterval: number | null = null;
let pendingUserData: RegisterForm | null = null;

onUnmounted(() => {
	if (countdownInterval) {
		clearInterval(countdownInterval);
	}
});

onMounted(async () => {
	// Obtener la URL actual para verificación de correo
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const accessToken = hashParams.get("access_token");

	if (accessToken) {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: hashParams.get("refresh_token") || "",
		});

		if (error) {
			console.error("Error al confirmar correo:", error);
			useToast().showMessage(
				"error",
				"Error al verificar tu cuenta. Intenta iniciar sesión.",
			);
			unblockAndCleanup();
		} else {
			await handleEmailVerification(data.user?.email);

			useToast().showMessage(
				"success",
				"¡Correo verificado! Ya puedes iniciar sesión.",
			);
			window.location.hash = "";
			unblockAndCleanup();
			setTimeout(() => router.push("/login"), 2000);
		}
	} else {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session) {
			router.push("/");
		}
	}
	checkPendingRegistration();
});

const handleEmailVerification = async (email?: string) => {
	// Recuperar datos pendientes del localStorage
	const pendingDataJson = localStorage.getItem("pendingUserData");
	if (!pendingDataJson || !email) return;

	const pendingData: RegisterForm = JSON.parse(pendingDataJson);

	if (pendingData.email !== email) return;

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error("Usuario no encontrado");
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
			console.error("Error al insertar usuario:", insertionError);
			await supabase.auth.admin.deleteUser(user.id);
			throw insertionError;
		}
		clearPendingRegistration();
	} catch (error) {
		console.error("Error en verificación:", error);
		useToast().showMessage(
			"error",
			"Error al completar el registro. Por favor, contacta al soporte.",
		);
	}
};

const checkPendingRegistration = () => {
	const pendingData = localStorage.getItem("pendingUserData");
	const pendingTimestamp = localStorage.getItem("pendingRegistrationTimestamp");

	if (pendingData && pendingTimestamp) {
		const timeElapsed = Date.now() - parseInt(pendingTimestamp);
		const remainingTime = 60 - Math.floor(timeElapsed / 1000);

		if (remainingTime > 0) {
			pendingUserData = JSON.parse(pendingData);
			isBlocked.value = true;
			timeLeft.value = remainingTime;
			startCountdown();
			useToast().showMessage(
				"info",
				`Registro pendiente de verificación. Tienes ${remainingTime} segundos para verificar tu correo.`,
			);
		} else {
			clearPendingRegistration();
			useToast().showMessage(
				"error",
				"El tiempo para verificar el registro ha expirado. Por favor, regístrate nuevamente.",
			);
		}
	}
};

const startCountdown = () => {
	if (countdownInterval) {
		clearInterval(countdownInterval);
	}

	countdownInterval = setInterval(() => {
		if (timeLeft.value > 0) {
			timeLeft.value--;
		} else {
			clearInterval(countdownInterval!);
			countdownInterval = null;
			handleTimeout();
		}
	}, 1000);
};

const handleTimeout = async () => {
	isBlocked.value = false;
	timeLeft.value = 0;

	// Eliminar el usuario de autenticación si no verificó su correo
	if (pendingUserData) {
		try {
			// Buscar y eliminar el usuario no verificado
			const {
				data: { users },
			} = await supabase.auth.admin.listUsers();
			const pendingUser = users?.find(
				(u) => u.email === pendingUserData?.email,
			);

			if (pendingUser && !pendingUser.email_confirmed_at) {
				await supabase.auth.admin.deleteUser(pendingUser.id);
			}
		} catch (error) {
			console.error("Error al limpiar usuario no verificado:", error);
		}
	}

	clearPendingRegistration();
	useToast().showMessage(
		"error",
		"Tiempo de verificación expirado. Por favor, regístrate nuevamente.",
	);
};

const clearPendingRegistration = () => {
	localStorage.removeItem("pendingUserData");
	localStorage.removeItem("pendingRegistrationTimestamp");
	pendingUserData = null;
	if (countdownInterval) {
		clearInterval(countdownInterval);
		countdownInterval = null;
	}
};

const unblockAndCleanup = () => {
	isBlocked.value = false;
	timeLeft.value = 0;
	clearPendingRegistration();
};

const registerUser = async (dataUser: RegisterForm) => {
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: dataUser.email,
		password: dataUser.password,
		options: {
			emailRedirectTo: `${window.location.origin}/register`,
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
	let idPattern = /^\d+$/;
	let phonePattern = /^(\+\d{1,3}[.\s])?\d{1,10}$/;

	try {
		if (!idPattern.test(registerForm.value.idNum)) {
			throw new Error("ID no válido");
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

		pendingUserData = { ...registerForm.value };
		localStorage.setItem("pendingUserData", JSON.stringify(pendingUserData));
		localStorage.setItem("pendingRegistrationTimestamp", Date.now().toString());

		isBlocked.value = true;
		timeLeft.value = 60;
		startCountdown();

		useToast().showMessage(
			"success",
			`Registro exitoso. Se ha enviado un correo de verificación a ${registerForm.value.email}. Tienes ${timeLeft.value} segundos para verificarlo.`,
		);

		// Limpiar el formulario
		registerForm.value = {
			idType: "CC",
			idNum: "",
			name: "",
			email: "",
			phone: "",
			role: "Huesped",
			password: "",
			confirmPassword: "",
		};
	} catch (error: any) {
		console.error(error);
		if (error.message.includes("already registered")) {
			useToast().showMessage(
				"error",
				"Este correo electrónico ya está registrado.",
			);
		} else if (error.code === "23505") {
			useToast().showMessage("error", "Ya existe un usuario con esos datos.");
		} else {
			useToast().showMessage(
				"error",
				error.message || "Ocurrió un error durante el registro",
			);
		}
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
	<div class="container">
		<div class="card">
			<img v-if="logo" :src="logo" class="logo" alt="Logo" />

			<h2>Registro</h2>

			<div v-if="isBlocked" class="info-message">
				<h3>Verificación pendiente</h3>
				<p>Se ha enviado un correo de verificación a tu cuenta</p>
				<p>Tiempo restante: {{ timeLeft }} segundos</p>
				<p>Revisa tu bandeja de entrada y haz clic en el enlace de verificación</p>
			</div>

			<form @submit.prevent="handleRegister">
				<div class="input-group">
					<label>Tipo de identificación</label>
					<select v-model="registerForm.idType" :disabled="isBlocked" required>
						<option>CC</option>
						<option>CE</option>
						<option>Pasaporte</option>
						<option>Otro</option>
					</select>
				</div>

				<div class="input-group">
					<label>Número de identificación</label>
					<input
						type="text"
						v-model="registerForm.idNum"
						:disabled="isBlocked"
						required
					/>
				</div>

				<div class="input-group">
					<label>Nombre</label>
					<input
						type="text"
						v-model="registerForm.name"
						:disabled="isBlocked"
						required
					/>
				</div>

				<div class="input-group">
					<label>Email</label>
					<input
						type="email"
						v-model="registerForm.email"
						:disabled="isBlocked"
						required
					/>
				</div>

				<div class="input-group">
					<label>Teléfono</label>
					<input
						type="tel"
						v-model="registerForm.phone"
						:disabled="isBlocked"
						required
					/>
				</div>

				<div class="input-group">
					<label>Rol</label>
					<select v-model="registerForm.role" :disabled="isBlocked" required>
						<option>Huesped</option>
						<option>Recepcionista</option>
						<option>Administrador</option>
					</select>
				</div>

				<div class="input-group">
					<label>Contraseña</label>
					<input
						type="password"
						v-model="registerForm.password"
						:disabled="isBlocked"
						required
					/>
				</div>

				<div class="input-group">
					<label>Confirmar Contraseña</label>
					<input
						type="password"
						v-model="registerForm.confirmPassword"
						:disabled="isBlocked"
						required
					/>
				</div>

				<button type="submit" class="btn" :disabled="loading || isBlocked">
					{{ loading ? "Registrando..." : "Registrarse" }}
				</button>

				<button
					type="button"
					class="btn btn-secondary"
					@click="goToHome"
					:disabled="isBlocked"
				>
					Volver
				</button>

				<p class="link" @click="goToLogin" style="cursor: pointer">
					¿Ya tienes cuenta? Inicia sesión
				</p>
			</form>
			<ToastMessage />
		</div>
	</div>
</template>
