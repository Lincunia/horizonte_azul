import { describe, it, expect } from "vitest";

describe("Random test", () => {
	it("Display error", () => {
		expect(() => {
			throw new Error("Busca una sierra para amputarte");
		}).toThrow("Busca una sierra para amputarte");
	});
});
