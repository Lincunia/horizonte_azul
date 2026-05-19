import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { supabase } from "../src/lib/supabaseClient.ts";
import { useToast } from "../src/composables/useToast.ts";
import Register from "../src/views/Register.vue";

vi.mock("../src/lib/supabaseClient.ts", () => ({
	supabase: {
		auth: {
			signUp: vi.fn(),
		},
	},
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("../src/composables/useToast", () => ({
	useToast: vi.fn(() => ({
		showMessage: vi.fn(),
	})),
}));

describe("Pruebas previas a los requerimientos", () => {
	let mockShowMessage: any;
	let wrapper: any;
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowMessage = vi.fn();
		(useToast as any).mockReturnValue({
			showMessage: mockShowMessage,
			hideMessage: vi.fn(),
		});
	});

	it("Telefono no valido con códigos internacionales", async () => {
		wrapper = mount(Register);

		await wrapper.find('input[type="tel"]').setValue("+57 313 3710454");

		await wrapper.find("form").trigger("submit.prevent");
		await flushPromises();

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-danger",
			"Teléfono no válido",
		);
	});

	it("Contraseñas no coinciden", async () => {
		wrapper = mount(Register);

		await wrapper.find('input[type="tel"]').setValue("1234567890");
		await wrapper.find('input[type="password"]').setValue("password123");
		await wrapper.findAll('input[type="password"]')[0].setValue("different123");

		await wrapper.find("form").trigger("submit.prevent");
		await flushPromises();

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-danger",
			"Las contraseñas no coinciden",
		);
	});

	it("Contraseña es muy corta", async () => {
		wrapper = mount(Register);

		await wrapper.find('input[type="tel"]').setValue("1234567890");
		await wrapper.find('input[type="password"]').setValue("123");
		await wrapper.findAll('input[type="password"]')[1].setValue("123");

		await wrapper.find("form").trigger("submit.prevent");
		await flushPromises();

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-danger",
			"La contraseña debe tener al menos 6 caracteres",
		);
	});
	afterEach(() => {
		wrapper.unmount();
	});
});

describe("RF-01 Registro de usuario", () => {
	let mockShowMessage: any;
	let wrapper: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockShowMessage = vi.fn();
		(useToast as any).mockReturnValue({
			showMessage: mockShowMessage,
			hideMessage: vi.fn(),
		});
	});

	it("Nuevo usuario", async () => {
		(supabase.auth.signUp as any).mockResolvedValue({
			data: { user: { id: "123", email: "test@example.com" } },
			error: null,
		});
		wrapper = mount(Register);
		await wrapper.find('input[type="email"]').setValue("user@example.com");
		await wrapper.find('input[type="password"]').setValue("password123");
		await wrapper.findAll('input[type="password"]')[1].setValue("password123");
		await wrapper.find('input[type="text"]').setValue("Test User");
		await wrapper.find('input[type="number"]').setValue("123456789");
		await wrapper.find('input[type="tel"]').setValue("1234567890");

		await wrapper.find("form").trigger("submit.prevent");
		await flushPromises();

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-success",
			expect.stringContaining("Registro completado"),
		);
	});

	it("Usuario existente", async () => {
		const errorMessage = new Error("email_exists");
		errorMessage.message = "email_exists";
		(supabase.auth.signUp as any).mockResolvedValue({
			data: { user: null },
			error: errorMessage,
		});
		wrapper = mount(Register);

		await wrapper.find('input[type="email"]').setValue("existing@example.com");
		await wrapper.find('input[type="password"]').setValue("password123");
		await wrapper.findAll('input[type="password"]')[1].setValue("password123");
		await wrapper.find('input[type="text"]').setValue("Test User");
		await wrapper.find('input[type="number"]').setValue("123456789");
		await wrapper.find('input[type="tel"]').setValue("1234567890");

		await wrapper.find("form").trigger("submit.prevent");
		await flushPromises();

		expect(mockShowMessage).toHaveBeenCalledWith(
			"alert alert-danger",
			expect.stringContaining("El usuario ya se encuentra registrado"),
		);
	});

	afterEach(() => {
		wrapper.unmount();
	});
});
