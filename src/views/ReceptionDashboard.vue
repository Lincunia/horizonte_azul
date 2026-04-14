<template>
  <div class="recepcion-container">

    <h1>Panel de Recepcionista</h1>

    <!-- 🔍 Buscar habitaciones -->
    <section>
      <h2>Buscar Habitaciones</h2>

      <div>
        <input type="text" placeholder="Número o tipo de habitación" />
        <select>
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
          <tr>
            <td>101</td>
            <td>Individual</td>
            <td>Disponible</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 🛎️ Reservas -->
    <section>
      <h2>Gestión de Reservas</h2>

      <div>
        <input type="text" placeholder="Nombre del cliente" />
        <input type="date" />
        <input type="date" />
        <select>
          <option>Habitación</option>
        </select>

        <button>Crear Reserva</button>
        <button>Modificar</button>
        <button>Cancelar</button>
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
          <tr>
            <td>Juan Pérez</td>
            <td>101</td>
            <td>2026-04-15</td>
            <td>2026-04-18</td>
            <td>Activa</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 🔑 Check-in / Check-out -->
    <section>
      <h2>Check-in / Check-out</h2>

      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Habitación</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ana Gómez</td>
            <td>203</td>
            <td>2026-04-13</td>
            <td>2026-04-16</td>
            <td>
              <button>Check-in</button>
              <button>Check-out</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
  </template>