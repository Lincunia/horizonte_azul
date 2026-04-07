<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '../lib/supabaseClient.ts';

const usuarios = ref([])

async function getUsuarios() {
    const { data } = await supabase.from('usuarios').select();
    usuarios.value = data;
};

onMounted(() => {
    getUsuarios()
})
</script>

<template>
  <ul>
    <li v-for="usuario in usuarios" :key="usuario.id_usuario">
      {{ usuario.nombre }}
      {{ usuario.email }}
    </li>
  </ul>
</template>