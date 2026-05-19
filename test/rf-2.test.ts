import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
import { supabase } from "../src/lib/supabaseClient";
import { useToast } from "../src/composables/useToast";

vi.mock("../src/lib/supabaseClient", () => ({
	supabase: {
		auth: {
			signInWithPassword: vi.fn(),
		},
		from: vi.fn(),
	},
}));

vi.mock("../src/composables/useToast", () => ({
	useToast: vi.fn(() => ({
		showMessage: vi.fn(),
	})),
}));

const mockPush = vi.fn();
vi.mock("vue-router", async () => {
	const actual = await vi.importActual("vue-router");
	return {
		...actual,
		useRouter: () => ({
			push: mockPush,
		}),
	};
});

describe("RF-02 Autenticación", () => {
	let wrapper: any;
	let mockShowMessage: any;

	const fillForm = async (emailString: string, passwordString: string) => {
		await wrapper.find('input[type="email"]').setValue(emailString);
		await wrapper.find('input[type="password"]').setValue(passwordString);
		await wrapper.find("form").trigger("submit.prevent");
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockShowMessage = vi.fn();
		(useToast as any).mockReturnValue({
			showMessage: mockShowMessage,
			hideMessage: vi.fn(),
		});

		(supabase.auth.signInWithPassword as any).mockReset();
		(supabase.from as any).mockReset();

		wrapper = mount(Login, {
			global: {
				stubs: {
					ToastMessage: true,
					router: true,
					"router-link": true,
				},
			},
		});
	});

	it("Autenticar administrador", async () => {
		const mockAuthId = "admin-auth-id-123";
		(supabase.auth.signInWithPassword as any).mockResolvedValue({
			data: {
				user: {
					id: mockAuthId,
					email: "admin@hotel.com",
				},
			},
			error: null,
		});

		const mockUpdateFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue({ error: null }),
		});

		const mockSelectFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { rol_usuario: "Administrador" },
					error: null,
				}),
			}),
		});

		(supabase.from as any).mockImplementation((table: string) => {
			if (table === "usuarios") {
				return {
					update: mockUpdateFn,
					select: mockSelectFn,
				};
			}
			return {};
		});

		fillForm("admin@hotel.com", "Admin123!");

		await new Promise((resolve) => setTimeout(resolve, 1600));
		expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
			email: "admin@hotel.com",
			password: "Admin123!",
		});

		expect(mockPush).toHaveBeenCalledWith("/admin");
	});

	it("Autenticar huesped", async () => {
		const mockAuthId = "guest-auth-id-456";
		(supabase.auth.signInWithPassword as any).mockResolvedValue({
			data: {
				user: {
					id: mockAuthId,
					email: "guest@hotel.com",
				},
			},
			error: null,
		});

		const mockUpdateFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue({ error: null }),
		});

		const mockSelectFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { rol_usuario: "Huesped" },
					error: null,
				}),
			}),
		});

		(supabase.from as any).mockImplementation((table: string) => {
			if (table === "usuarios") {
				return {
					update: mockUpdateFn,
					select: mockSelectFn,
				};
			}
			return {};
		});

		fillForm("guest@hotel.com", "Guest123!");

		await new Promise((resolve) => setTimeout(resolve, 1600));

		expect(mockPush).toHaveBeenCalledWith("/guest");
	});

	it("Autenticar recepcionista", async () => {
		const mockAuthId = "reception-auth-id-789";
		(supabase.auth.signInWithPassword as any).mockResolvedValue({
			data: {
				user: {
					id: mockAuthId,
					email: "reception@hotel.com",
				},
			},
			error: null,
		});

		const mockUpdateFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue({ error: null }),
		});

		const mockSelectFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { rol_usuario: "Recepcionista" },
					error: null,
				}),
			}),
		});

		(supabase.from as any).mockImplementation((table: string) => {
			if (table === "usuarios") {
				return {
					update: mockUpdateFn,
					select: mockSelectFn,
				};
			}
			return {};
		});

		fillForm("reception@hotel.com", "Reception123!");

		await new Promise((resolve) => setTimeout(resolve, 1600));

		expect(mockPush).toHaveBeenCalledWith("/reception");
	});

	it("Autenticar rol indeterminado/no registrado", async () => {
		const mockAuthId = "unknown-role-id";
		(supabase.auth.signInWithPassword as any).mockResolvedValue({
			data: {
				user: {
					id: mockAuthId,
					email: "unknown@hotel.com",
				},
			},
			error: null,
		});

		const mockUpdateFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue({ error: null }),
		});

		const mockSelectFn = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "not_found" },
				}),
			}),
		});

		(supabase.from as any).mockImplementation((table: string) => {
			if (table === "usuarios") {
				return {
					update: mockUpdateFn,
					select: mockSelectFn,
				};
			}
			return {};
		});

		fillForm("unknown@hotel.com", "Password123!");

		await new Promise((resolve) => setTimeout(resolve, 500));

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-danger",
			expect.stringContaining("Error al autenticar usuario"),
		);
	});

	afterEach(() => {
		wrapper.unmount();
	});
});
