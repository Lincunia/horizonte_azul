<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../lib/supabaseClient.ts";
import { useToast } from "../../composables/useToast.ts";
import ToastMessage from "../../components/ToastMessage.vue";

const router = useRouter();

const habitaciones = ref([
    { numero: 101, tipo: "Individual", estado: "Disponible", precio: 100000 },
    { numero: 203, tipo: "Doble", estado: "Ocupada", precio: 180000 },
]);

const filtroTexto = ref("");
const filtroEstado = ref("");

const hoy = new Date().toISOString().split("T")[0];

const habitacionesFiltradas = computed(() => {
  return habitaciones.value.map(h => {

    const ocupada = reservas.value.some(r =>
      r.habitacion == h.numero &&
      r.estado !== "Cancelada" &&
      hoy >= r.entrada &&
      hoy < r.salida
    );

    return {
      ...h,
      estado: ocupada ? "Ocupada" : "Disponible"
    };

  }).filter(h => {
    return (
      (h.numero.toString().includes(filtroTexto.value) ||
       h.tipo.toLowerCase().includes(filtroTexto.value.toLowerCase())) &&
      (filtroEstado.value === "" || h.estado === filtroEstado.value)
    );
  });
});

const reservas = ref([
    {
        id: 1,
        cliente: "Juan Pérez",
        habitacion: 101,
        entrada: "2026-04-15",
        salida: "2026-04-18",
        estado: "Activa",
    },
]);

const nuevaReserva = ref({
    cliente: "",
    habitacion: "",
    entrada: "",
    salida: "",
});

const hayConflicto = (habitacion: number, entrada: string, salida: string) => {
  return reservas.value.some(r => {
    return (
      r.habitacion == habitacion &&
      r.estado !== "Cancelada" &&
      (
        (entrada >= r.entrada && entrada < r.salida) ||
        (salida > r.entrada && salida <= r.salida) ||
        (entrada <= r.entrada && salida >= r.salida)
      )
    );
  });
};

const reservaEditando = ref<string | null>(null);

const crearReserva = () => {

  if (
    !nuevaReserva.value.cliente ||
    !nuevaReserva.value.habitacion ||
    !nuevaReserva.value.entrada ||
    !nuevaReserva.value.salida
  ) {
    useToast().showMessage("error", "Completa todos los campos");
    return;
  }

  if (
    hayConflicto(
      Number(nuevaReserva.value.habitacion),
      nuevaReserva.value.entrada,
      nuevaReserva.value.salida
    )
  ) {
    useToast().showMessage("error", "La habitación ya está reservada en esas fechas");
    return;
  }

  if (reservaEditando.value) {

    const reserva = reservas.value.find(r => r.id === reservaEditando.value);

    if (!reserva || reserva.estado === "Cancelada") {
      reservaEditando.value = null;
    } else {

      if (reserva.estado === "Finalizada") {
        useToast().showMessage("error", "No se puede modificar esta reserva");
        return;
      }

      reserva.cliente = nuevaReserva.value.cliente;
      reserva.habitacion = Number(nuevaReserva.value.habitacion);
      reserva.entrada = nuevaReserva.value.entrada;
      reserva.salida = nuevaReserva.value.salida;

      useToast().showMessage("success", "Reserva actualizada");

      reservaEditando.value = null;

      nuevaReserva.value = {
        cliente: "",
        habitacion: "",
        entrada: "",
        salida: ""
      };

      return;
    }
  }

  const existe = reservas.value.some(r =>
    r.cliente === nuevaReserva.value.cliente &&
    r.habitacion == nuevaReserva.value.habitacion &&
    r.entrada === nuevaReserva.value.entrada &&
    r.salida === nuevaReserva.value.salida &&
    r.estado !== "Cancelada"
  );

  if (existe) {
    useToast().showMessage("error", "Esta reserva ya existe");
    return;
  }

  reservas.value.push({
    id: crypto.randomUUID(),
    cliente: nuevaReserva.value.cliente,
    habitacion: Number(nuevaReserva.value.habitacion),
    entrada: nuevaReserva.value.entrada,
    salida: nuevaReserva.value.salida,
    estado: "Activa",
  });

  useToast().showMessage("success", "Reserva creada");

  nuevaReserva.value = {
    cliente: "",
    habitacion: "",
    entrada: "",
    salida: ""
  };
};

const cancelarReserva = (id: string) => {
  const reserva = reservas.value.find(r => r.id === id);

  if (!reserva || reserva.estado === "Cancelada") return;

  reserva.estado = "Cancelada";

  if (reservaEditando.value === id) {
    reservaEditando.value = null;

    nuevaReserva.value = {
      cliente: "",
      habitacion: "",
      entrada: "",
      salida: ""
    };
  }
};

const modificarReserva = (reserva: any) => {
    reservaEditando.value = reserva.id;
    
    nuevaReserva.value = {
        cliente: reserva.cliente,
        habitacion: reserva.habitacion,
        entrada: reserva.entrada,
        salida: reserva.salida
  };
};

const checkIn = (reserva: any) => {

  if (reserva.estado !== "Activa") {
    useToast().showMessage("error", "No se puede hacer check-in");
    return;
  }

  reserva.estado = "Ocupada";
};

const checkOut = (reserva: any) => {

  if (reserva.estado !== "Ocupada") {
    useToast().showMessage("error", "No se puede hacer check-out");
    return;
  }

  reserva.estado = "Finalizada";
};

const calcularDias = (entrada: string, salida: string) => {
    const inicio = new Date(entrada);
    const fin = new Date(salida);
    const diff = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    return diff || 1;
};

const generarFactura = (reserva: any) => {
    const habitacion = habitaciones.value.find(
        (h) => h.numero == reserva.habitacion,
    );

    if (!habitacion) {
        alert("Habitación no encontrada");
        return;
    }

    const dias = calcularDias(reserva.entrada, reserva.salida);
    const total = dias * habitacion.precio;

    alert(`
    FACTURA
    ------------------------
    Cliente: ${reserva.cliente}
    Habitación: ${reserva.habitacion}
    Días: ${dias}
    Precio por noche: $${habitacion.precio}
    TOTAL: $${total}
  `);
};

const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error al cerrar sesión:", error);
        useToast().showMessage("error", "Error al cerrar sesión");
    } else {
        setTimeout(() => {
            router.push("/login");
        }, 1500);
    }
};
</script>

<template>
    <div class="recepcion-container">
        <h1>Panel de Recepcionista</h1>

        <button class="btn btn-critical" @click="handleLogout">
            Cerrar Sesión
        </button>
        <ToastMessage />
        <section>
            <h2>Buscar Habitaciones</h2>

            <div>
                <input
                    v-model="filtroTexto"
                    type="text"
                    placeholder="Número o tipo de habitación"
                />
                <select v-model="filtroEstado">
                    <option value="">Estado</option>
                    <option>Disponible</option>
                    <option>Ocupada</option>
                    <option>Mantenimiento</option>
                </select>
                <button>Buscar</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Habitación</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="h in habitacionesFiltradas" :key="h.numero">
                        <td>{{ h.numero }}</td>
                        <td>{{ h.tipo }}</td>
                        <td>{{ h.estado }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section>
            <h2>Gestión de Reservas</h2>

            <div>
                <input
                    v-model="nuevaReserva.cliente"
                    type="text"
                    placeholder="Nombre del cliente"
                />
                <input v-model="nuevaReserva.entrada" type="date" />
                <input v-model="nuevaReserva.salida" type="date" />
                <select v-model="nuevaReserva.habitacion">
                    <option disabled value="">Habitación</option>
                    <option v-for="h in habitaciones" :key="h.numero" :value="h.numero">
                        {{ h.numero }}
                    </option>
                </select>

                <button @click="crearReserva">
                      {{ reservaEditando ? "Actualizar Reserva" : "Crear Reserva" }}
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Habitación</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="reserva in reservas" :key="reserva.id">
                        <td>{{ reserva.cliente }}</td>
                        <td>{{ reserva.habitacion }}</td>
                        <td>{{ reserva.entrada }}</td>
                        <td>{{ reserva.salida }}</td>
                        <td>{{ reserva.estado }}</td>
                        <td>
                            <button @click="modificarReserva(reserva)">Modificar</button>
                            <button @click="cancelarReserva(reserva.id)">Cancelar</button>
                            <button @click="generarFactura(reserva)">Facturar</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section>
            <h2>Check-in / Check-out</h2>

            <table>
                <tbody>
                    <tr v-for="reserva in reservas" :key="reserva.id">
                        <td>{{ reserva.cliente }}</td>
                        <td>{{ reserva.habitacion }}</td>
                        <td>{{ reserva.entrada }}</td>
                        <td>{{ reserva.salida }}</td>
                        <td>
                            <button 
                                @click="checkIn(reserva)" 
                                :disabled="reserva.estado !== 'Activa'"
                            >
                                Check-in
                            </button>
                            <button 
                                @click="checkOut(reserva)" 
                                :disabled="reserva.estado !== 'Ocupada'"
                            >
                                Check-out
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
</template>
