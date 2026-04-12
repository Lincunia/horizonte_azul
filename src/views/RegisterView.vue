<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";

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

const message = ref<string>("");

const loading = ref(false);

onMounted(async () => {
	// Obtener la URL actual
	const hashParams = new URLSearchParams(window.location.hash.substring(1));
	const accessToken = hashParams.get("access_token");

	if (accessToken) {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: hashParams.get("refresh_token") || "",
		});
		if (error) {
			console.error("Error al confirmar correo:", error);
			message.value = "Error al verificar tu cuenta. Intenta iniciar sesión.";
		} else {
			message.value = "¡Correo verificado! Ya puedes iniciar sesión.";
			// Limpiar la URL (eliminar el hash)
			window.location.hash = "";
			// Redirigir al login después de 2 segundos
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
});

const insertUser = async (dataUser: RegisterForm) => {
	console.log(dataUser);
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: dataUser.email,
		password: dataUser.password,
	});
	if (authError) {
		throw authError;
	}
	if (!authData.user) {
		throw new Error("Registro de usuario no exitoso");
	}
	const { error: insertionError } = await supabase.from("usuarios").insert({
		tipo_identificacion: dataUser.idType,
		numero_identificacion: dataUser.idNum,
		nombre: dataUser.name,
		email: dataUser.email,
		telefono: dataUser.phone,
		rol_usuario: dataUser.role,
		auth_id: authData.user?.id,
	});
	if (insertionError) {
		throw insertionError;
	}
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
		await insertUser(registerForm.value);
		message.value = "Registro exitoso, verifique su correo";
	} catch (error: any) {
		console.error(error);
		if (error.message.includes("already registered")) {
			message.value = "Este correo electrónico ya está registrado.";
		} else if (error.code === "23505") {
			message.value = "Ya existe un usuario con esos datos.";
		} else {
			message.value = error.message || "Ocurrió un error durante el registro";
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
	<div>
		<h1>Registro de Usuario</h1>

		<form @submit.prevent="handleRegister">
			<div>
				<label>Tipo de identificación:</label>
				<select v-model="registerForm.idType" required>
					<option>CC</option>
					<option>CE</option>
					<option>Pasaporte</option>
					<option>Otro</option>
				</select>
			</div>

			<div>
				<label>Número de identificación:</label>
				<input type="text" v-model="registerForm.idNum" required />
			</div>

			<div>
				<label>Nombre:</label>
				<input type="text" v-model="registerForm.name" required />
			</div>

			<div>
				<label>Email:</label>
				<input type="email" v-model="registerForm.email" required />
			</div>

			<div>
				<label>Teléfono:</label>
				<input type="tel" v-model="registerForm.phone" required />
			</div>

			<div>
				<label>Roles de usuario:</label>
				<select v-model="registerForm.role" required>
					<option>Huesped</option>
					<option>Recepcionista</option>
					<option>Administrador</option>
				</select>
			</div>

			<div>
				<label>Contraseña:</label>
				<input type="password" v-model="registerForm.password" required />
			</div>

			<div>
				<label>Confirmar Contraseña:</label>
				<input
					type="password"
					v-model="registerForm.confirmPassword"
					required
				/>
			</div>

			<div>
				<button type="submit" :disabled="loading">Registrarse</button>
				<button type="button" @click="goToLogin">
					¿Ya tienes cuenta? Inicia Sesión
				</button>
				<button type="button" @click="goToHome">Volver al inicio</button>
			</div>
		</form>

		<p v-if="message">{{ message }}</p>
	</div>
</template>
