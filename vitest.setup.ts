import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Mock global objects
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Configuración global de vue-test-utils
config.global.stubs = {
	teleport: true,
	transition: false,
};

// Mock para importación de CSS
vi.mock("*.css", () => ({}));
vi.mock("*.vue", () => ({}));
