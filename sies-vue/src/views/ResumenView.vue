<script setup>
import { onMounted } from 'vue'
import { useSIESStore } from '../stores/sies.js'
import StatCard from '../components/StatCard.vue'

const store = useSIESStore()

function fmtNum(n) { return n?.toLocaleString('es-CL') || '0' }
function fmtPesos(n) {
  n = parseInt(n); if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return '$' + (n/1_000_000).toFixed(1) + 'M'
  return '$' + n.toLocaleString('es-CL')
}

onMounted(async () => {
  if (!store.listaAnios.length) await store.cargarFiltros()
  await store.cargarDatos()
})
</script>

<template>
  <div>
    <div v-if="store.status" class="status" :class="store.status.type">
      <span class="material-icons">{{ store.status.type === 'loading' ? 'hourglass_empty' : store.status.type === 'error' ? 'error' : 'check_circle' }}</span>
      {{ store.status.msg }}
    </div>

    <div class="section-title"><span class="material-icons">account_balance</span> Oferta de Sistema Universitario</div>
    <div class="stats-grid">
      <StatCard :value="fmtNum(store.kpis.carreras_unicas)" label="Carreras Únicas" icon="menu_book" color="primary" />
      <StatCard :value="fmtNum(store.kpis.total_carreras)" label="Programas por Nivel" icon="layers" color="info" />
      <StatCard :value="fmtNum(store.kpis.total_vacantes)" label="Vacantes Totales" icon="event_seat" color="warning" />
      <StatCard :value="fmtPesos(store.kpis.arancel_promedio)" label="Arancel Promedio" icon="payments" color="purple" />
    </div>

    <div class="section-title" style="margin-top:2rem"><span class="material-icons">people</span> Matrícula Histórica (SIES)</div>
    <div class="stats-grid">
      <StatCard :value="fmtNum(store.kpis.mat_total)" label="Matrícula Total" icon="people" color="primary" />
      <StatCard :value="fmtNum(store.kpis.mat_nueva)" label="Matrícula Nueva" icon="person_add" color="info" />
      <StatCard :value="fmtNum(store.kpis.mat_mujeres)" label="Matrícula Mujeres" icon="female" color="success" />
      <StatCard :value="fmtNum(store.kpis.mat_hombres)" label="Matrícula Hombres" icon="male" color="warning" />
    </div>
  </div>
</template>
