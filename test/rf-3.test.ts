import { beforeEach, describe, it, expect, vi } from "vitest";
import { fetchRooms, Room } from "../src/composables/roomMethods.ts";

vi.mock("../src/lib/supabaseClient.tex", () => ({
	supabase: {
		from: vi.fn(),
	},
}));

describe("Busqueda de habitación", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("Ver las habitaciones", async () => {
		let rooms: Room[] = await fetchRooms();
		expect(rooms.length).toBeGreaterThan(0);
	});
});
