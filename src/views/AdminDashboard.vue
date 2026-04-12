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
	<div class="dashboard">
		<!-- Header -->
		<div class="header">
			<h1>Panel de Administración</h1>
			<div class="header-buttons">
				<button @click="goToHome" class="btn-home">🏠 Inicio</button>
				<button @click="handleLogout" class="btn-logout">
					🚪 Cerrar Sesión
				</button>
			</div>
		</div>

		<!-- Mensajes -->
		<div v-if="message" :class="['message', message.type]">
			{{ message.text }}
		</div>

		<!-- Estadísticas -->
		<div class="stats-grid">
			<div class="stat-card">
				<h3>Total Usuarios</h3>
				<p class="stat-number">{{ estadisticas.totalUsuarios }}</p>
			</div>
			<div class="stat-card">
				<h3>Usuarios Activos</h3>
				<p class="stat-number">{{ estadisticas.usuariosActivos }}</p>
			</div>
			<div class="stat-card">
				<h3>Huéspedes</h3>
				<p class="stat-number">{{ estadisticas.huespedes }}</p>
			</div>
			<div class="stat-card">
				<h3>Recepcionistas</h3>
				<p class="stat-number">{{ estadisticas.recepcionistas }}</p>
			</div>
			<div class="stat-card">
				<h3>Administradores</h3>
				<p class="stat-number">{{ estadisticas.administradores }}</p>
			</div>
			<div class="stat-card">
				<h3>Registros Hoy</h3>
				<p class="stat-number">{{ estadisticas.registrosHoy }}</p>
			</div>
		</div>

		<!-- Controles -->
		<div class="controls">
			<button @click="openCreateModal" class="btn-create">
				➕ Crear Usuario
			</button>

			<div class="filters">
				<input
					type="text"
					v-model="searchTerm"
					placeholder="🔍 Buscar usuario..."
					class="search-input"
				/>

				<select v-model="filterRol" class="filter-select">
					<option value="todos">Todos los roles</option>
					<option value="Huesped">Huéspedes</option>
					<option value="Recepcionista">Recepcionistas</option>
					<option value="Administrador">Administradores</option>
				</select>
			</div>
		</div>

		<!-- Tabla de usuarios -->
		<div class="table-container">
			<div v-if="loading" class="loading">Cargando usuarios...</div>

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
						<td class="actions">
							<button
								@click="openEditModal(user)"
								class="btn-edit"
								title="Editar"
							>
								✏️
							</button>
							<button
								@click="toggleUserStatus(user)"
								class="btn-toggle"
								:title="user.activo ? 'Desactivar' : 'Activar'"
							>
								{{ user.activo ? "🔴" : "🟢" }}
							</button>
							<button
								@click="deleteUser(user)"
								class="btn-delete"
								title="Eliminar"
							>
								🗑️
							</button>
						</td>
					</tr>
					<tr v-if="filteredUsers.length === 0">
						<td colspan="10" class="no-data">No hay usuarios para mostrar</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Modal para crear/editar usuario -->
		<div v-if="showModal" class="modal" @click.self="closeModal">
			<div class="modal-content">
				<div class="modal-header">
					<h2>{{ editingUser ? "Editar Usuario" : "Crear Nuevo Usuario" }}</h2>
					<button @click="closeModal" class="close-btn">&times;</button>
				</div>

				<form
					@submit.prevent="editingUser ? updateUser() : createUser()"
					class="modal-form"
				>
					<div class="form-row">
						<div class="form-group">
							<label>Tipo Identificación *</label>
							<select v-model="userForm.tipo_identificacion" required>
								<option>CC</option>
								<option>CE</option>
								<option>Pasaporte</option>
								<option>Otro</option>
							</select>
						</div>

						<div class="form-group">
							<label>Número Identificación *</label>
							<input
								type="text"
								v-model="userForm.numero_identificacion"
								required
							/>
						</div>
					</div>

					<div class="form-group">
						<label>Nombre Completo *</label>
						<input type="text" v-model="userForm.nombre" required />
					</div>

					<div class="form-group" v-if="!editingUser">
						<label>Email *</label>
						<input type="email" v-model="userForm.email" required />
					</div>

					<div class="form-row">
						<div class="form-group">
							<label>Teléfono</label>
							<input type="tel" v-model="userForm.telefono" />
						</div>

						<div class="form-group">
							<label>Rol *</label>
							<select v-model="userForm.rol_usuario" required>
								<option>Huesped</option>
								<option>Recepcionista</option>
								<option>Administrador</option>
							</select>
						</div>
					</div>

					<div v-if="!editingUser" class="form-row">
						<div class="form-group">
							<label>Contraseña *</label>
							<input type="password" v-model="userForm.password" required />
						</div>

						<div class="form-group">
							<label>Confirmar Contraseña *</label>
							<input
								type="password"
								v-model="userForm.confirmPassword"
								required
							/>
						</div>
					</div>

					<div class="modal-buttons">
						<button type="submit" class="btn-save">
							{{ editingUser ? "Actualizar" : "Crear" }}
						</button>
						<button type="button" @click="closeModal" class="btn-cancel">
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard {
	padding: 2rem;
	max-width: 1400px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 2rem;
	padding-bottom: 1rem;
	border-bottom: 2px solid #e0e0e0;
}

.header h1 {
	margin: 0;
	color: #333;
}

.header-buttons {
	display: flex;
	gap: 1rem;
}

.btn-home,
.btn-logout {
	padding: 0.5rem 1rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
}

.btn-home {
	background-color: #2196f3;
	color: white;
}

.btn-logout {
	background-color: #f44336;
	color: white;
}

.message {
	padding: 1rem;
	border-radius: 4px;
	margin-bottom: 1rem;
	text-align: center;
}

.message.success {
	background-color: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

.message.error {
	background-color: #f8d7da;
	color: #721c24;
	border: 1px solid #f5c6cb;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 2rem;
}

.stat-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 1.5rem;
	border-radius: 8px;
	text-align: center;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
	margin: 0 0 0.5rem 0;
	font-size: 0.9rem;
	opacity: 0.9;
}

.stat-number {
	font-size: 2rem;
	font-weight: bold;
	margin: 0;
}

.controls {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
	gap: 1rem;
}

.btn-create {
	background-color: #4caf50;
	color: white;
	padding: 0.5rem 1rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

.filters {
	display: flex;
	gap: 1rem;
	flex: 1;
	max-width: 400px;
}

.search-input {
	flex: 1;
	padding: 0.5rem;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.filter-select {
	padding: 0.5rem;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.table-container {
	overflow-x: auto;
	background: white;
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.users-table {
	width: 100%;
	border-collapse: collapse;
}

.users-table th,
.users-table td {
	padding: 1rem;
	text-align: left;
	border-bottom: 1px solid #e0e0e0;
}

.users-table th {
	background-color: #f5f5f5;
	font-weight: 600;
	color: #333;
}

.users-table tr:hover {
	background-color: #f9f9f9;
}

.role-badge {
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
	font-size: 0.85rem;
	font-weight: 500;
}

.role-badge.huesped {
	background-color: #e3f2fd;
	color: #1976d2;
}

.role-badge.recepcionista {
	background-color: #f3e5f5;
	color: #7b1fa2;
}

.role-badge.administrador {
	background-color: #ffebee;
	color: #c62828;
}

.status-badge {
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
	font-size: 0.85rem;
}

.status-badge.active {
	background-color: #d4edda;
	color: #155724;
}

.status-badge.inactive {
	background-color: #f8d7da;
	color: #721c24;
}

.actions {
	display: flex;
	gap: 0.5rem;
}

.actions button {
	padding: 0.25rem 0.5rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
}

.btn-edit {
	background-color: #ffc107;
	color: #333;
}

.btn-toggle {
	background-color: #17a2b8;
	color: white;
}

.btn-delete {
	background-color: #dc3545;
	color: white;
}

.loading,
.no-data {
	text-align: center;
	padding: 2rem;
	color: #666;
}

/* Modal styles */
.modal {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
}

.modal-content {
	background: white;
	border-radius: 8px;
	width: 90%;
	max-width: 600px;
	max-height: 90vh;
	overflow-y: auto;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem;
	border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
	margin: 0;
}

.close-btn {
	background: none;
	border: none;
	font-size: 1.5rem;
	cursor: pointer;
	color: #666;
}

.modal-form {
	padding: 1rem;
}

.form-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
}

.form-group {
	margin-bottom: 1rem;
}

.form-group label {
	display: block;
	margin-bottom: 0.25rem;
	font-weight: 500;
}

.form-group input,
.form-group select {
	width: 100%;
	padding: 0.5rem;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.modal-buttons {
	display: flex;
	gap: 1rem;
	margin-top: 1rem;
}

.btn-save {
	background-color: #4caf50;
	color: white;
	padding: 0.5rem 1rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

.btn-cancel {
	background-color: #6c757d;
	color: white;
	padding: 0.5rem 1rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

@media (max-width: 768px) {
	.dashboard {
		padding: 1rem;
	}

	.controls {
		flex-direction: column;
	}

	.filters {
		max-width: 100%;
		width: 100%;
	}

	.form-row {
		grid-template-columns: 1fr;
	}

	.stats-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
