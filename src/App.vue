<template>
	<div>
		<button @click="incrementar">Contador: {{ count }}</button>
	</div>
	<div>		
		<router-view />
	</div>
</template>

  
  <script setup lang="ts">
  import { ref } from 'vue'
  
  const count = ref<number>(0)
  
  function incrementar(): void {
	count.value++
  }
  </script>