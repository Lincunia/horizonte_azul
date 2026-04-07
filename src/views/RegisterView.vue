<script setup lang="ts">
import { reactive, ref, Teleport } from "vue";
import { useRouter } from "vue-router";
import { supabase } from '../lib/supabaseClient.ts';

interface RegisterForm {
	tipoIdentificacion: "CC"|"CE"|"Pasaporte"|"Otro"
	numeroIdentificacion: String
	nombre: string;
	email: string;
	telefono: string;
	rol: "Huesped"|"Recepcionista"|"Administrador"
	password: string;
	confirmarContrasena: string;
}

const router = useRouter();
const registerForm = reactive<RegisterForm>({
	tipoIdentificacion: "CC",
	numeroIdentificacion: "",
	nombre: "",
	email: "",
	telefono: "",
	rol: "Huesped",
	password: "",
	confirmarContrasena: "",
});
const message = ref<string>("");

async function insertarUsuario(datos: RegisterForm) {
    const { error } = await supabase.from('usuarios').insert(
		{
			tipo_identificacion: datos.tipoIdentificacion,
			numero_identificacion: datos.numeroIdentificacion,
			nombre: datos.nombre,
			email: datos.email,
			telefono: datos.telefono,
			password_hash: datos.password,
			rol_usuario: datos.rol
		}
	);
	console.log(error);
};

const handleRegister = (): void => {
	// Validaciones básicas
	if (
		!registerForm.numeroIdentificacion ||
		!registerForm.nombre ||
		!registerForm.email ||
		!registerForm.telefono ||
		!registerForm.password ||
		!registerForm.confirmarContrasena
	) {
		message.value = "Por favor complete todos los campos";
		return;
	}

	if (registerForm.password !== registerForm.confirmarContrasena) {
		message.value = "Las contraseñas no coinciden";
		return;
	}

	if (registerForm.password.length < 6) {
		message.value = "La contraseña debe tener al menos 6 caracteres";
		return;
	}

	// Simulación de registro exitoso
	message.value = "Registro exitoso";
	insertarUsuario(registerForm);
	/*
	setTimeout(() => {
		router.push("/login");
	}, 1500);
	*/
};

const goToLogin = (): void => {
	router.push("/login");
};

const goBack = (): void => {
	router.back();
};
</script>

<template>
	<div>
		<h1>Registro de Usuario</h1>

		<form @submit.prevent="handleRegister">
			<div>
				<label>Tipo de identificación:</label>
				<select v-model="registerForm.tipoIdentificacion" required>
					<option>CC</option>
					<option>CE</option>
					<option>Pasaporte</option>
					<option>Otro</option>
				</select>
			</div>

			<div>
				<label>Número de identificación:</label>
				<input type="text" v-model="registerForm.numeroIdentificacion" required />
			</div>

			<div>
				<label>Nombre:</label>
				<input type="text" v-model="registerForm.nombre" required />
			</div>

			<div>
				<label>Email:</label>
				<input type="email" v-model="registerForm.email" required />
			</div>
			

			<div>
				<label>Teléfono:</label>
				<input type="tel" v-model="registerForm.telefono" required />
			</div>

			
			<div>
				<label>Roles de usuario:</label>
				<select v-model="registerForm.rol" required>
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
					v-model="registerForm.confirmarContrasena"
					required
				/>
			</div>

			<div>
				<button type="submit">Registrarse</button>
				<button type="button" @click="goToLogin">
					¿Ya tienes cuenta? Inicia Sesión
				</button>
				<button type="button" @click="goBack">Volver</button>
			</div>
		</form>

		<div v-if="message">
			<p>{{ message }}</p>
		</div>
	</div>
</template>
