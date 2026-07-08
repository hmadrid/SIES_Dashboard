<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
const titles = { '/matricula': 'Matrícula', '/titulacion': 'Titulación', '/empleabilidad': 'Empleabilidad' }
const icons = { '/matricula': 'people', '/titulacion': 'school', '/empleabilidad': 'work' }
</script>

<template>
  <div class="placeholder">
    <span class="material-icons big">{{ icons[route.path] }}</span>
    <h3>{{ titles[route.path] }}</h3>
    <p>Próximamente</p>
  </div>
</template>

<style scoped>
.placeholder { background:var(--card-bg); border-radius:12px; padding:4rem 2rem; text-align:center; box-shadow:0 4px 20px rgba(0,119,182,.15) }
.placeholder .material-icons.big { font-size:4rem; color:#caf0f8; margin-bottom:1rem }
.placeholder h3 { font-size:1.2rem; margin-bottom:0.5rem }
.placeholder p { color:var(--text-secondary) }
</style>
