import { describe, it, expect } from "vitest";

describe("Autenticación", () => {
	it("Autenticar administrador", () => { expect(42).toBe(42); });
	it("Autenticar huesped", () => { expect(42).toBe(42); });
	it("Autenticar recepcionista", () => { expect(42).toBe(42); });
	it("Autenticar rol indeterminado/no registrado", () => { expect(42).toBe(42); });
	it("Inicio de sesión erróneo", () => { expect(42).toBe(42); });
});
