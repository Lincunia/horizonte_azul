<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import { useMisc } from "../../composables/useMisc.ts";
import type {
	Role,
	IdentificationType,
} from "../../composables/dbInformation.ts";
import Modal from "../../components/Modal.vue";
import LoaderMessage from "../../components/LoaderMessage.vue";

// Interfaces
interface User {
	id_usuario: number;
	tipo_identificacion: IdentificationType;
	numero_identificacion: string;
	nombre: string;
	email: string;
	telefono: string;
	rol_usuario: Role;
	fecha_registro: string;
	ultimo_acceso: string;
	activo: boolean;
	auth_id: string;
}

interface Estadisticas {
	totalUsuarios: number;
	usuariosActivos: number;
	huespedes: number;
	recepcionistas: number;
	administradores: number;
	registrosHoy: number;
}

// Estado
const users = ref<User[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingUser = ref<User | null>(null);
const searchTerm = ref("");
const filterRol = ref<string>("todos");
const estadisticas = ref<Estadisticas>({
	totalUsuarios: 0,
	usuariosActivos: 0,
	huespedes: 0,
	recepcionistas: 0,
	administradores: 0,
	registrosHoy: 0,
});

// Formulario para crear/editar usuario
const userForm = ref({
	tipo_identificacion: "CC",
	numero_identificacion: "",
	nombre: "",
	email: "",
	telefono: "",
	rol_usuario: "Huesped",
	password: "",
	confirmPassword: "",
});

// Computed properties
const filteredUsers = computed(() => {
	let filtered = users.value;

	// Filtrar por rol
	if (filterRol.value !== "todos") {
		filtered = filtered.filter((user) => user.rol_usuario === filterRol.value);
	}

	// Filtrar por búsqueda
	if (searchTerm.value) {
		const term = searchTerm.value;
		filtered = filtered.filter(
			(user) =>
				user.nombre.includes(term) ||
				user.email.includes(term) ||
				user.numero_identificacion.includes(term),
		);
	}

	return filtered;
});

// Funciones
const loadUsers = async () => {
	try {
		loading.value = true;
		const { data, error } = await supabase
			.from("usuarios")
			.select("*")
			.order("fecha_registro", { ascending: false });

		if (error) throw error;

		users.value = data || [];
		await loadEstadisticas();
	} catch (error: any) {
		console.error("Error al cargar usuarios:", error);
		useToast().showMessage(
			"alert alert-danger",
			"Error al cargar los usuarios",
		);
	} finally {
		loading.value = false;
	}
};

const loadEstadisticas = async () => {
	try {
		const hoy = new Date().toISOString().split("T")[0];

		estadisticas.value.totalUsuarios = users.value.length;
		estadisticas.value.usuariosActivos = users.value.filter(
			(u) => u.activo,
		).length;
		estadisticas.value.huespedes = users.value.filter(
			(u) => u.rol_usuario === "Huesped",
		).length;
		estadisticas.value.recepcionistas = users.value.filter(
			(u) => u.rol_usuario === "Recepcionista",
		).length;
		estadisticas.value.administradores = users.value.filter(
			(u) => u.rol_usuario === "Administrador",
		).length;
		estadisticas.value.registrosHoy = users.value.filter((u) =>
			u.fecha_registro?.startsWith(hoy),
		).length;
	} catch (error) {
		console.error("Error al calcular estadísticas:", error);
	}
};

const createUser = async () => {
	try {
		// Validaciones
		if (!userForm.value.email || !userForm.value.password) {
			throw new Error("Email y contraseña son requeridos");
		}

		if (userForm.value.password !== userForm.value.confirmPassword) {
			throw new Error("Las contraseñas no coinciden");
		}

		if (userForm.value.password.length < 6) {
			throw new Error("La contraseña debe tener al menos 6 caracteres");
		}

		// Crear usuario en auth
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email: userForm.value.email,
			password: userForm.value.password,
		});

		if (authError) throw authError;
		if (!authData.user) throw new Error("Error al crear el usuario");

		// Insertar en tabla usuarios
		const { error: insertError } = await supabase.from("usuarios").insert({
			tipo_identificacion: userForm.value.tipo_identificacion,
			numero_identificacion: userForm.value.numero_identificacion,
			nombre: userForm.value.nombre,
			email: userForm.value.email,
			telefono: userForm.value.telefono,
			rol_usuario: userForm.value.rol_usuario,
			auth_id: authData.user.id,
			activo: true,
		});

		if (insertError) throw insertError;

		useToast().showMessage(
			"alert alert-success",
			"Usuario creado exitosamente",
		);
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al crear usuario:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al crear el usuario",
		);
	}
};

const updateUser = async () => {
	if (!editingUser.value) return;

	try {
		const { error } = await supabase
			.from("usuarios")
			.update({
				tipo_identificacion: userForm.value.tipo_identificacion,
				numero_identificacion: userForm.value.numero_identificacion,
				nombre: userForm.value.nombre,
				telefono: userForm.value.telefono,
				rol_usuario: userForm.value.rol_usuario,
			})
			.eq("id_usuario", editingUser.value.id_usuario);

		if (error) throw error;

		useToast().showMessage(
			"alert alert-success",
			"Usuario actualizado exitosamente",
		);
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al actualizar usuario:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al actualizar el usuario",
		);
	}
};

const deleteUser = async (user: User) => {
	if (!confirm(`¿Estás seguro de que deseas eliminar a ${user.nombre}?`))
		return;

	try {
		// Primero eliminar de la tabla usuarios
		const { error: deleteError } = await supabase
			.from("usuarios")
			.delete()
			.eq("id_usuario", user.id_usuario);

		if (deleteError) throw deleteError;

		// Opcional: Eliminar también de auth.users (requiere funciones de servidor)
		// Por ahora solo eliminamos de nuestra tabla

		useToast().showMessage(
			"alert alert-success",
			"Usuario eliminado exitosamente",
		);
		await loadUsers();
	} catch (error: any) {
		console.error("Error al eliminar usuario:", error);
		useToast().showMessage(
			"alert alert-danger",
			error.message || "Error al eliminar el usuario",
		);
	}
};

const toggleUserStatus = async (user: User) => {
	try {
		const { error } = await supabase
			.from("usuarios")
			.update({ activo: !user.activo })
			.eq("id_usuario", user.id_usuario);

		if (error) throw error;

		useToast().showMessage(
			"alert alert-success",
			`Usuario ${user.activo ? "desactivado" : "activado"} exitosamente`,
		);

		await loadUsers();
	} catch (error: any) {
		console.error("Error al cambiar estado:", error);

		useToast().showMessage(
			"alert alert-danger",
			"Error al cambiar el estado del usuario",
		);
	}
};

const openCreateModal = () => {
	editingUser.value = null;
	userForm.value = {
		tipo_identificacion: "CC",
		numero_identificacion: "",
		nombre: "",
		email: "",
		telefono: "",
		rol_usuario: "Huesped",
		password: "",
		confirmPassword: "",
	};
	showModal.value = true;
};

const openEditModal = (user: User) => {
	editingUser.value = user;
	userForm.value = {
		tipo_identificacion: user.tipo_identificacion,
		numero_identificacion: user.numero_identificacion,
		nombre: user.nombre,
		email: user.email,
		telefono: user.telefono || "",
		rol_usuario: user.rol_usuario,
		password: "",
		confirmPassword: "",
	};
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
	editingUser.value = null;
	userForm.value = {
		tipo_identificacion: "CC",
		numero_identificacion: "",
		nombre: "",
		email: "",
		telefono: "",
		rol_usuario: "Huesped",
		password: "",
		confirmPassword: "",
	};
};

const formatDate = (date: string) => {
	if (!date) return "Nunca";
	return new Date(date).toLocaleString("es-CO");
};

// Lifecycle
onMounted(() => {
	loadUsers();
});
</script>

<template>
	<!-- Estadísticas -->
	<div>
		<div>
			<h3>Total Usuarios</h3>
			<p>{{ estadisticas.totalUsuarios }}</p>
		</div>
		<div>
			<h3>Usuarios Activos</h3>
			<p>{{ estadisticas.usuariosActivos }}</p>
		</div>
		<div>
			<h3>Huéspedes</h3>
			<p>{{ estadisticas.huespedes }}</p>
		</div>
		<div>
			<h3>Recepcionistas</h3>
			<p>{{ estadisticas.recepcionistas }}</p>
		</div>
		<div>
			<h3>Administradores</h3>
			<p>{{ estadisticas.administradores }}</p>
		</div>
		<div>
			<h3>Registros Hoy</h3>
			<p>{{ estadisticas.registrosHoy }}</p>
		</div>
	</div>

	<!-- Controles -->
	<div class="container">
		<div class="mb-3">
			<button class="btn btn-primary" @click="openCreateModal">
				➕ Crear Usuario
			</button>
		</div>
		<div class="mb-3">
			<label class="form-label"> 🔍 Buscar usuario... </label>
			<input type="text" v-model="searchTerm" class="form-control" />
		</div>
		<div class="mb-3">
			<select v-model="filterRol" class="form-select">
				<option value="todos">Todos los roles</option>
				<option>Huesped</option>
				<option>Recepcionista</option>
				<option>Administrador</option>
			</select>
		</div>
	</div>

	<LoaderMessage v-if="loading" visible message="Cargando usuarios..." />
	<LoaderMessage v-else-if="users.length === 0" message="No hay usuarios" />

	<!-- Tabla de usuarios -->
	<table v-else class="table table-striped-columns">
		<thead>
			<tr>
				<th scope="col">ID</th>
				<th scope="col">Identificación</th>
				<th scope="col">Nombre</th>
				<th scope="col">Email</th>
				<th scope="col">Teléfono</th>
				<th scope="col">Rol</th>
				<th scope="col">Estado</th>
				<th scope="col">Registro</th>
				<th scope="col">Último Acceso</th>
				<th scope="col">Acciones</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="user in filteredUsers" :key="user.id_usuario">
				<td scope="row">{{ user.id_usuario }}</td>
				<td>{{ user.tipo_identificacion }} {{ user.numero_identificacion }}</td>
				<td>{{ user.nombre }}</td>
				<td>{{ user.email }}</td>
				<td>{{ user.telefono || "-" }}</td>
				<td>
					<span
						:class="useMisc().getUserRoleBadgeClass(user.rol_usuario)"
						class="badge"
					>
						{{ user.rol_usuario }}
					</span>
				</td>
				<td>
					<span :class="user.activo ? 'bg-success' : 'bg-danger'" class="badge">
						{{ user.activo ? "Activo" : "Inactivo" }}
					</span>
				</td>
				<td>{{ formatDate(user.fecha_registro) }}</td>
				<td>{{ formatDate(user.ultimo_acceso) }}</td>
				<td class="d-flex flex-column mb-3">
					<button
						class="btn btn-primary mb-1"
						@click="openEditModal(user)"
						title="Editar"
					>
						✏️
					</button>
					<button
						class="btn btn-secondary mb-1"
						@click="toggleUserStatus(user)"
						:title="user.activo ? 'Desactivar' : 'Activar'"
					>
						{{ user.activo ? "🔴" : "🟢" }}
					</button>
					<button
						class="btn btn-danger mb-1"
						@click="deleteUser(user)"
						title="Eliminar"
					>
						🗑️
					</button>
				</td>
			</tr>
			<tr v-if="filteredUsers.length === 0">
				<td colspan="10">No hay usuarios para mostrar</td>
			</tr>
		</tbody>
	</table>

	<!-- Modal para crear/editar usuario -->
	<Modal
		v-model="showModal"
		:title="editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'"
		@close="closeModal"
	>
		<form @submit.prevent="editingUser ? updateUser() : createUser()" class="container-sm">
			<div class="mb-3">
				<label class="form-label">Tipo Identificación *</label>
				<select
					v-model="userForm.tipo_identificacion"
					class="form-select"
					required
				>
					<option>CC</option>
					<option>CE</option>
					<option>Pasaporte</option>
					<option>Otro</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Número Identificación *</label>
				<input
					type="text"
					v-model="userForm.numero_identificacion"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Nombre Completo *</label>
				<input
					type="text"
					v-model="userForm.nombre"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Email *</label>
				<input
					type="email"
					v-model="userForm.email"
					class="form-control"
					required
				/>
			</div>

			<div class="mb-3">
				<label class="form-label">Teléfono</label>
				<input type="tel" v-model="userForm.telefono" class="form-control" />
			</div>

			<div class="mb-3">
				<label class="form-label">Rol *</label>
				<select v-model="userForm.rol_usuario" class="form-select" required>
					<option>Huesped</option>
					<option>Recepcionista</option>
					<option>Administrador</option>
				</select>
			</div>

			<div v-if="!editingUser">
				<div class="mb-3">
					<label class="form-label">Contraseña *</label>
					<input
						type="password"
						v-model="userForm.password"
						class="form-control"
						required
					/>
				</div>

				<div class="mb-3">
					<label class="form-label">Confirmar Contraseña *</label>
					<input
						type="password"
						v-model="userForm.confirmPassword"
						class="form-control"
						required
					/>
				</div>
			</div>

			<div class="d-flex justify-content-center">
				<button class="btn btn-success m-2" type="submit">
					{{ editingUser ? "Actualizar" : "Crear" }}
				</button>
				<button type="button" class="btn btn-danger m-2" @click="closeModal">
					Cancelar
				</button>
			</div>
		</form>
	</Modal>
</template>

<style scoped>
/* Estadísticas */
div:has(> div > h3) {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 2rem;
}

div:has(> div > h3) > div {
	background: white;
	padding: 1.5rem;
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	text-align: center;
	border: 1px solid #e5e7eb;
}

div:has(> div > h3) h3 {
	margin: 0 0 0.5rem 0;
	color: #374151;
	font-size: 0.9rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

div:has(> div > h3) p {
	margin: 0;
	font-size: 2rem;
	font-weight: bold;
	color: #1f2937;
}
</style>
