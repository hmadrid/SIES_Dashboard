<script setup>
import { ref, onMounted } from 'vue'
import { useAPI } from '../composables/useAPI.js'

const { datos, status, kpis, cargarDatos, cargarFiltros } = useAPI()
const listaAnios = ref([])
const filtroAnio = ref('')

function fmtNum(n) { return n?.toLocaleString('es-CL') || '0' }
function fmtPesos(n) {
  n = parseInt(n); if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return '$' + (n/1_000_000).toFixed(1) + 'M'
  return '$' + n.toLocaleString('es-CL')
}

onMounted(async () => {
  const f = await cargarFiltros()
  listaAnios.value = f.anios
  if (listaAnios.value.length) filtroAnio.value = listaAnios.value[0]
  await cargarDatos({ limit: 25, anio: filtroAnio.value })
})
</script>

<template>
  <div>
    <div v-if="status" class="status" :class="status.type">
      <span class="material-icons">{{ status.type === 'loading' ? 'hourglass_empty' : status.type === 'error' ? 'error' : 'check_circle' }}</span>
      {{ status.msg }}
    </div>

    <div class="section-title"><span class="material-icons">account_balance</span> Oferta de Sistema Universitario</div>
    <div class="stats-grid">
      <div class="stat-card primary"><div class="top"><div><div class="value">{{ fmtNum(kpis.carreras_unicas) }}</div><div class="label">Carreras Únicas</div></div><div class="icon-wrap"><span class="material-icons">menu_book</span></div></div></div>
      <div class="stat-card info"><div class="top"><div><div class="value">{{ fmtNum(kpis.total_carreras) }}</div><div class="label">Programas por Nivel</div></div><div class="icon-wrap"><span class="material-icons">layers</span></div></div></div>
      <div class="stat-card warning"><div class="top"><div><div class="value">{{ fmtNum(kpis.total_vacantes) }}</div><div class="label">Vacantes Totales</div></div><div class="icon-wrap"><span class="material-icons">event_seat</span></div></div></div>
      <div class="stat-card purple"><div class="top"><div><div class="value">{{ fmtPesos(kpis.arancel_promedio) }}</div><div class="label">Arancel Promedio</div></div><div class="icon-wrap"><span class="material-icons">payments</span></div></div></div>
    </div>

    <div class="section-title" style="margin-top:2rem"><span class="material-icons">people</span> Matrícula Histórica (SIES)</div>
    <div class="stats-grid">
      <div class="stat-card primary"><div class="top"><div><div class="value">{{ fmtNum(kpis.mat_total) }}</div><div class="label">Matrícula Total</div></div><div class="icon-wrap"><span class="material-icons">people</span></div></div></div>
      <div class="stat-card info"><div class="top"><div><div class="value">{{ fmtNum(kpis.mat_nueva) }}</div><div class="label">Matrícula Nueva</div></div><div class="icon-wrap"><span class="material-icons">person_add</span></div></div></div>
      <div class="stat-card success"><div class="top"><div><div class="value">{{ fmtNum(kpis.mat_mujeres) }}</div><div class="label">Matrícula Mujeres</div></div><div class="icon-wrap"><span class="material-icons">female</span></div></div></div>
      <div class="stat-card warning"><div class="top"><div><div class="value">{{ fmtNum(kpis.mat_hombres) }}</div><div class="label">Matrícula Hombres</div></div><div class="icon-wrap"><span class="material-icons">male</span></div></div></div>
    </div>
  </div>
</template>

<style scoped>
</style>
