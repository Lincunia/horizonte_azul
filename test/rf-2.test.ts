import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
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
	beforeEach(() => {
		vi.clearAllMocks();

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

		await wrapper.find('input[type="email"]').setValue("admin@hotel.com");
		await wrapper.find('input[type="password"]').setValue("Admin123!");
		await wrapper.find("form").trigger("submit.prevent");

		await new Promise((resolve) => setTimeout(resolve, 1600));
		expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
			email: "admin@hotel.com",
			password: "Admin123!",
		});
		expect(mockPush).toHaveBeenCalledWith('/admin');
	});
	// it("Autenticar huesped", () => { expect(42).toBe(42); });
	// it("Autenticar recepcionista", () => { expect(42).toBe(42); });
	// it("Autenticar rol indeterminado/no registrado", () => { expect(42).toBe(42); });
	// it("Inicio de sesión erróneo", () => { expect(42).toBe(42); });
	afterEach(() => {
		wrapper.unmount();
	});
});
