<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";

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
	rol_usuario: "Huesped" as "Huesped" | "Recepcionista" | "Administrador",
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
		useToast().showMessage("error", "Error al cargar los usuarios");
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

		useToast().showMessage("success", "Usuario creado exitosamente");
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al crear usuario:", error);
		useToast().showMessage(
			"error",
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

		useToast().showMessage("success", "Usuario actualizado exitosamente");
		closeModal();
		await loadUsers();
	} catch (error: any) {
		console.error("Error al actualizar usuario:", error);
		useToast().showMessage(
			"error",
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

		useToast().showMessage("success", "Usuario eliminado exitosamente");
		await loadUsers();
	} catch (error: any) {
		console.error("Error al eliminar usuario:", error);
		useToast().showMessage(
			"error",
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
			"success",
			`Usuario ${user.activo ? "desactivado" : "activado"} exitosamente`,
		);

		await loadUsers();
	} catch (error: any) {
		console.error("Error al cambiar estado:", error);

		useToast().showMessage("error", "Error al cambiar el estado del usuario");
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
	<div>
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
			<button class="btn" @click="openCreateModal">➕ Crear Usuario</button>
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
			<h2>Usuarios</h2>
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
							<button class="btn" @click="openEditModal(user)" title="Editar">
								✏️
							</button>
							<button
								class="btn btn-secondary"
								@click="toggleUserStatus(user)"
								:title="user.activo ? 'Desactivar' : 'Activar'"
							>
								{{ user.activo ? "🔴" : "🟢" }}
							</button>
							<button
								class="btn btn-critical"
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
		</div>

		<!-- Modal para crear/editar usuario -->
		<div v-if="showModal" @click.self="closeModal">
			<div>
				<div>
					<h2>{{ editingUser ? "Editar Usuario" : "Crear Nuevo Usuario" }}</h2>
					<!--<button class="btn" @click="closeModal">&times;</button>-->
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
						<button class="btn" type="submit">
							{{ editingUser ? "Actualizar" : "Crear" }}
						</button>
						<button type="button" class="btn btn-critical" @click="closeModal">
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
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

/* Controles */
div:has(> .btn:first-child) {
	display: flex;
	gap: 1rem;
	align-items: center;
	margin-bottom: 2rem;
	flex-wrap: wrap;
}

div:has(> .btn:first-child) .btn {
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 6px;
	cursor: pointer;
	font-weight: 500;
	transition: all 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

div:has(> .btn:first-child) .btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

div:has(> .btn:first-child) .btn-critical {
	background: #dc2626;
	color: white;
}

div:has(> .btn:first-child) .btn-critical:hover {
	background: #b91c1c;
}

div:has(> .btn:first-child) > div {
	display: flex;
	gap: 0.5rem;
	align-items: center;
}

div:has(> .btn:first-child) input {
	padding: 0.5rem;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	font-size: 0.9rem;
}

div:has(> .btn:first-child) select {
	padding: 0.5rem;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	background: white;
	font-size: 0.9rem;
}

/* Tabla de usuarios */
.users-table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	margin-top: 1rem;
}

.users-table thead {
	background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.users-table th {
	padding: 1rem;
	text-align: left;
	font-weight: 600;
	color: #374151;
	border-bottom: 2px solid #d1d5db;
	font-size: 0.9rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.users-table td {
	padding: 1rem;
	border-bottom: 1px solid #e5e7eb;
	font-size: 0.9rem;
}

.users-table tbody tr {
	transition: background-color 0.2s ease;
}

.users-table tbody tr:hover {
	background-color: #f9fafb;
}

.users-table tbody tr:last-child td {
	border-bottom: none;
}

/* Badges */
.role-badge {
	padding: 0.25rem 0.75rem;
	border-radius: 9999px;
	font-size: 0.75rem;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.role-badge.huesped {
	background: #dbeafe;
	color: #1e40af;
}

.role-badge.recepcionista {
	background: #dcfce7;
	color: #166534;
}

.role-badge.administrador {
	background: #fef3c7;
	color: #92400e;
}

.status-badge {
	padding: 0.25rem 0.75rem;
	border-radius: 9999px;
	font-size: 0.75rem;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.status-badge.active {
	background: #dcfce7;
	color: #166534;
}

.status-badge.inactive {
	background: #fee2e2;
	color: #991b1b;
}

/* Botones en tabla */
.users-table .btn {
	padding: 0.5rem;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
	transition: all 0.2s ease;
	margin-right: 0.25rem;
}

.users-table .btn:hover {
	transform: scale(1.1);
}

.users-table .btn-secondary {
	background: #f3f4f6;
	color: #374151;
}

.users-table .btn-secondary:hover {
	background: #e5e7eb;
}

.users-table .btn-critical {
	background: #fee2e2;
	color: #991b1b;
}

.users-table .btn-critical:hover {
	background: #fecaca;
}

/* Modales */
div[v-if] {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
}

div[v-if] > div {
	background: white;
	padding: 2rem;
	border-radius: 8px;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	max-width: 500px;
	width: 90%;
	max-height: 90vh;
	overflow-y: auto;
}

div[v-if] > div > div:first-child {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

div[v-if] > div h2 {
	margin: 0;
	color: #1f2937;
	font-size: 1.5rem;
}

div[v-if] form > div {
	margin-bottom: 1rem;
}

div[v-if] label {
	display: block;
	margin-bottom: 0.5rem;
	font-weight: 500;
	color: #374151;
	font-size: 0.9rem;
}

div[v-if] input,
div[v-if] select,
div[v-if] textarea {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	font-size: 0.9rem;
	transition: border-color 0.2s ease;
	box-sizing: border-box;
}

div[v-if] input:focus,
div[v-if] select:focus,
div[v-if] textarea:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

div[v-if] textarea {
	resize: vertical;
	min-height: 80px;
}

div[v-if] form > div:has(> div) {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
}

div[v-if] form > div:has(button) {
	display: flex;
	gap: 1rem;
	justify-content: flex-end;
	margin-top: 2rem;
	padding-top: 1rem;
	border-top: 1px solid #e5e7eb;
}
</style>