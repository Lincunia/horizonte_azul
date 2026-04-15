<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";
import { useToast } from "../composables/useToast.ts";
import ToastMessage from "../components/ToastMessage.vue";

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

			useToast().showMessage("error", "Error al verificar tu cuenta. Intenta iniciar sesión.");
		} else {
			useToast().showMessage("success", "¡Correo verificado! Ya puedes iniciar sesión.");
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
		useToast().showMessage("success", "Registro exitoso, verifique su correo");
	} catch (error: any) {
		console.error(error);
		if (error.message.includes("already registered")) {

			useToast().showMessage("error", "Este correo electrónico ya está registrado.");
		} else if (error.code === "23505") {
			useToast().showMessage("error", "Ya existe un usuario con esos datos.");
		} else {
			useToast().showMessage("error", error.message || "Ocurrió un error durante el registro");
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

			<form @submit.prevent="handleRegister">
				<div class="input-group">
					<label>Tipo de identificación</label>
					<select v-model="registerForm.tipoIdentificacion" required>
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
						v-model="registerForm.numeroIdentificacion"
						required
					/>
				</div>

				<div class="input-group">
					<label>Nombre</label>
					<input type="text" v-model="registerForm.nombre" required />
				</div>

				<div class="input-group">
					<label>Email</label>
					<input type="email" v-model="registerForm.email" required />
				</div>

				<div class="input-group">
					<label>Teléfono</label>
					<input type="tel" v-model="registerForm.telefono" required />
				</div>

				<div class="input-group">
					<label>Rol</label>
					<select v-model="registerForm.rol" required>
						<option>Huesped</option>
						<option>Recepcionista</option>
						<option>Administrador</option>
					</select>
				</div>

				<div class="input-group">
					<label>Contraseña</label>
					<input type="password" v-model="registerForm.password" required />
				</div>

				<div class="input-group">
					<label>Confirmar Contraseña</label>
					<input
						type="password"
						v-model="registerForm.confirmarContrasena"
						required
					/>
				</div>

				<button type="submit" class="btn">Registrarse</button>

				<p class="link" @click="goToLogin" style="cursor: pointer">
					¿Ya tienes cuenta? Inicia sesión
				</p>

				<button
					type="button"
					class="btn"
					style="margin-top: 10px; background: gray"
					@click="goToHome"
				>
					Volver
				</button>
			</form>
			<ToastMessage />
		</div>
	</div>
</template>
