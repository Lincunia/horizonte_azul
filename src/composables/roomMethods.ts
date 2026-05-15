import type { RoomType, RoomStatus } from "./dbInformation.ts";
import { supabase } from "../lib/supabaseClient.ts";

export interface Room {
	id_habitacion: number;
	numero: number;
	tipo: RoomType;
	capacidad: number;
	piso: number;
	vista: string | null;
	precio_noche: number;
	estado: RoomStatus;
}

export const fetchRooms = async (): Promise<Room[]> => {
	const { data, error } = await supabase
		.from("habitaciones")
		.select("*")
		.order("numero", { ascending: true });

	if (error) throw error;

	let rooms: Room[] = data || [];
	return rooms;
};

export const updateRooms = async (room: Room) => {
	const { error } = await supabase
		.from("habitaciones")
		.update({
			numero: room.numero,
			tipo: room.tipo,
			capacidad: room.capacidad,
			piso: room.piso,
			vista: room.vista || null,
			precio_noche: room.precio_noche,
			estado: room.estado,
		})
		.eq("id_habitacion", room.id_habitacion);

	if (error) throw error;
};
