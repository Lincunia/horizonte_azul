import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "../../lib/supabaseClient";

// Mock de supabase
vi.mock("../../lib/supabaseClient", () => ({
	supabase: {
		auth: {
			getSession: vi.fn(),
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(),
				})),
			})),
		})),
	},
}));

// Importar el router después del mock
import router, { authGuard } from "../index";

describe("Router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	describe("Configuración básica", () => {
		it("debería crear el router correctamente", () => {
			expect(router).toBeDefined();
			expect(router.options.history).toBeDefined();
		});
		it("debería tener las rutas configuradas", () => {
			const routes = router.options.routes;
			expect(routes).toHaveLength(7);
		});
		it('debería tener la ruta home en "/"', () => {
			const homeRoute = router.options.routes.find((r) => r.path === "/");
			expect(homeRoute).toBeDefined();
			expect(homeRoute?.name).toBe("home");
		});
		it('debería tener la ruta de login en "/login"', () => {
			const loginRoute = router.options.routes.find((r) => r.path === "/login");
			expect(loginRoute).toBeDefined();
			expect(loginRoute?.name).toBe("login");
		});
	});
	describe("Guardias de navegación", () => {
		it("debería redirigir a login si requiere auth y no hay sesión", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const to = {
				matched: [{ meta: { requiresAuth: true } }],
				path: "/reception",
				meta: { requiresAuth: true },
			};

			//const result = await router.beforeEach((to, from));
			const result = await authGuard(to as any);
			expect(result).toBe("/login");
		});

		it("debería permitir acceso si requiere auth y hay sesión", async () => {
			// Mock de sesión autenticada
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: {
						user: {
							id: "user123",
						},
					},
				},
				error: null,
			});

			// Mock de consulta de rol
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { rol_usuario: "Recepcionista" },
				error: null,
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle,
			} as any);

			const to = {
				matched: [{ meta: { requiresAuth: true, role: "Recepcionista" } }],
				path: "/reception",
				meta: { requiresAuth: true, role: "Recepcionista" },
			};

			const result = await authGuard(to as any);
			expect(result).toBe(true);
		});

		it("debería redirigir a home si el rol no es el requerido", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: {
						user: { id: "user123" },
					},
				},
				error: null,
			});

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { rol_usuario: "Huesped" },
				error: null,
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle,
			} as any);

			const to = {
				matched: [{ meta: { requiresAuth: true, role: "Administrador" } }],
				path: "/admin",
				meta: { requiresAuth: true, role: "Administrador" },
			};

			const result = await authGuard(to as any);
			expect(result).toBe("/");
		});

		it("debería redirigir a home si usuario autenticado intenta ir a login", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: {
						user: { id: "user123" },
					},
				},
				error: null,
			});

			const to = {
				matched: [],
				path: "/login",
			};

			const result = await authGuard(to as any);
			expect(result).toBe("/");
		});

		it("debería redirigir a home si usuario autenticado intenta ir a register", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: {
						user: { id: "user123" },
					},
				},
				error: null,
			});

			const to = {
				matched: [],
				path: "/register",
			};

			const result = await authGuard(to as any);
			expect(result).toBe("/");
		});

		it("debería permitir acceso a rutas públicas sin autenticación", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: { session: null },
				error: null,
			});

			const to = {
				matched: [],
				path: "/",
			};

			const result = await authGuard(to as any);
			expect(result).toBe(true);
		});
	});
	describe("Función getUserRole", () => {
		it("debería retornar el rol del usuario cuando existe", async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { rol_usuario: "Administrador" },
				error: null,
			});

			vi.mocked(supabase.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle,
			} as any);

			// Forzar ejecución interna
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: { user: { id: "user123" } },
				},
				error: null,
			});

			const to = {
				matched: [{ meta: { requiresAuth: true, role: "Administrador" } }],
				path: "/admin",
				meta: { requiresAuth: true, role: "Administrador" },
			};

			await authGuard(to as any);

			expect(supabase.from).toHaveBeenCalledWith("usuarios");
			expect(mockSelect).toHaveBeenCalledWith("rol_usuario");
			expect(mockEq).toHaveBeenCalledWith(
				"auth_id",
				"user123",
			);
		});

		it("debería manejar errores en la consulta del rol", async () => {
			vi.mocked(supabase.auth.getSession).mockResolvedValue({
				data: {
					session: {
						user: { id: "user123" },
					},
				},
				error: null,
			});

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockRejectedValue(new Error("Error de conexión"));

			vi.mocked(supabase.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle,
			} as any);

			const to = {
				matched: [{ meta: { requiresAuth: true, role: "Recepcionista" } }],
				path: "/reception",
				meta: { requiresAuth: true, role: "Recepcionista" },
			};

			const result = await authGuard(to as any);
			expect(result).toBe("/");
		});
	});
});
