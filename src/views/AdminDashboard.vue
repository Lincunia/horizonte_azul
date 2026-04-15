<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabaseClient.ts";

const router = useRouter();

// Interfaces
interface User {
	id_usuario: number;
	tipo_identificacion: string;
	numero_identificacion: string;
	nombre: string;
	email: string;
	telefono: string;
	rol_usuario: "Huesped" | "Recepcionista" | "Administrador";
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
const message = ref<{ type: "success" | "error"; text: string } | null>(null);
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
	rol_usuario: "Huesped" as const,
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
		const term = searchTerm.value.toLowerCase();
		filtered = filtered.filter(
			(user) =>
				user.nombre.toLowerCase().includes(term) ||
				user.email.toLowerCase().includes(term) ||
				user.numero_identificacion.includes(term),
		);
	}

	return filtered;
});

// Funciones
const showMessage = (type: "success" | "error", text: string) => {
	message.value = { type, text };
	setTimeout(() => {
		message.value = null;
	}, 5000);
};

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
		showMessage("error", "Error al cargar los usuarios");
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

		showMessage("success", "Usuario creado exitosamente");
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al crear usuario:", error);
		showMessage("error", error.message || "Error al crear el usuario");
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

		showMessage("success", "Usuario actualizado exitosamente");
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al actualizar usuario:", error);
		showMessage("error", error.message || "Error al actualizar el usuario");
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

		showMessage("success", "Usuario eliminado exitosamente");
		await loadUsers();
	} catch (error: any) {
		console.error("Error al eliminar usuario:", error);
		showMessage("error", error.message || "Error al eliminar el usuario");
	}
};

const toggleUserStatus = async (user: User) => {
	try {
		const { error } = await supabase
			.from("usuarios")
			.update({ activo: !user.activo })
			.eq("id_usuario", user.id_usuario);

		if (error) throw error;

		showMessage(
			"success",
			`Usuario ${user.activo ? "desactivado" : "activado"} exitosamente`,
		);
		await loadUsers();
	} catch (error: any) {
		console.error("Error al cambiar estado:", error);
		showMessage("error", "Error al cambiar el estado del usuario");
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

const handleLogout = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error al cerrar sesión:", error);
		showMessage("error", "Error al cerrar sesión");
	} else {
		router.push("/login");
	}
};

const goToHome = () => {
	router.push("/");
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
	<div>
		<!-- Header -->
		<div class="navbar">
			<h1>Panel de Administración</h1>
			<div>
				<button @click="goToHome">🏠 Inicio</button>
				<button @click="handleLogout">🚪 Cerrar Sesión</button>
			</div>
		</div>

		<!-- Mensajes -->
		<div v-if="message" :class="['message', message.type]">
			{{ message.text }}
		</div>

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
		<div>
			<button @click="openCreateModal">➕ Crear Usuario</button>

			<div>
				<input
					type="text"
					v-model="searchTerm"
					placeholder="🔍 Buscar usuario..."
				/>
				<select v-model="filterRol">
					<option value="todos">Todos los roles</option>
					<option value="Huesped">Huéspedes</option>
					<option value="Recepcionista">Recepcionistas</option>
					<option value="Administrador">Administradores</option>
				</select>
			</div>
		</div>

		<!-- Tabla de usuarios -->
		<div>
			<div v-if="loading">Cargando usuarios...</div>

			<table v-else class="users-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Identificación</th>
						<th>Nombre</th>
						<th>Email</th>
						<th>Teléfono</th>
						<th>Rol</th>
						<th>Estado</th>
						<th>Registro</th>
						<th>Último Acceso</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in filteredUsers" :key="user.id_usuario">
						<td>{{ user.id_usuario }}</td>
						<td>
							{{ user.tipo_identificacion }} {{ user.numero_identificacion }}
						</td>
						<td>{{ user.nombre }}</td>
						<td>{{ user.email }}</td>
						<td>{{ user.telefono || "-" }}</td>
						<td>
							<span :class="['role-badge', user.rol_usuario.toLowerCase()]">
								{{ user.rol_usuario }}
							</span>
						</td>
						<td>
							<span
								:class="['status-badge', user.activo ? 'active' : 'inactive']"
							>
								{{ user.activo ? "Activo" : "Inactivo" }}
							</span>
						</td>
						<td>{{ formatDate(user.fecha_registro) }}</td>
						<td>{{ formatDate(user.ultimo_acceso) }}</td>
						<td>
							<button @click="openEditModal(user)" title="Editar">✏️</button>
							<button
								@click="toggleUserStatus(user)"
								:title="user.activo ? 'Desactivar' : 'Activar'"
							>
								{{ user.activo ? "🔴" : "🟢" }}
							</button>
							<button @click="deleteUser(user)" title="Eliminar">🗑️</button>
						</td>
					</tr>
					<tr v-if="filteredUsers.length === 0">
						<td colspan="10">No hay usuarios para mostrar</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Modal para crear/editar usuario -->
		<div v-if="showModal" @click.self="closeModal">
			<div>
				<div>
					<h2>{{ editingUser ? "Editar Usuario" : "Crear Nuevo Usuario" }}</h2>
					<button @click="closeModal">&times;</button>
				</div>

				<form @submit.prevent="editingUser ? updateUser() : createUser()">
					<div>
						<div>
							<label>Tipo Identificación *</label>
							<select v-model="userForm.tipo_identificacion" required>
								<option>CC</option>
								<option>CE</option>
								<option>Pasaporte</option>
								<option>Otro</option>
							</select>
						</div>

						<div>
							<label>Número Identificación *</label>
							<input
								type="text"
								v-model="userForm.numero_identificacion"
								required
							/>
						</div>
					</div>

					<div>
						<label>Nombre Completo *</label>
						<input type="text" v-model="userForm.nombre" required />
					</div>

					<div>
						<label>Email *</label>
						<input type="email" v-model="userForm.email" required />
					</div>

					<div>
						<div>
							<label>Teléfono</label>
							<input type="tel" v-model="userForm.telefono" />
						</div>

						<div>
							<label>Rol *</label>
							<select v-model="userForm.rol_usuario" required>
								<option>Huesped</option>
								<option>Recepcionista</option>
								<option>Administrador</option>
							</select>
						</div>
					</div>

					<div v-if="!editingUser">
						<div>
							<label>Contraseña *</label>
							<input type="password" v-model="userForm.password" required />
						</div>

						<div>
							<label>Confirmar Contraseña *</label>
							<input
								type="password"
								v-model="userForm.confirmPassword"
								required
							/>
						</div>
					</div>

					<div>
						<button type="submit">
							{{ editingUser ? "Actualizar" : "Crear" }}
						</button>
						<button type="button" @click="closeModal">Cancelar</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>
