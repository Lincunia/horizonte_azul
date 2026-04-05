<script setup lang="ts">
import { ref } from 'vue';
const dynamicId = ref('unDiv');
</script>

<template>
	<div v-bind:id="dynamicId"></div><!--Esta es una directiva-->
</template>
