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
.section-title { font-size:1.1rem; font-weight:500; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem; color:var(--text-primary) }
.section-title .material-icons { color:var(--primary) }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1.25rem; margin-bottom:1.5rem }
.stat-card { background:var(--card-bg); border-radius:16px; padding:1.5rem 1.75rem; box-shadow:0 4px 20px rgba(0,119,182,.15),0 2px 8px rgba(0,0,0,.08); border:1px solid rgba(0,119,182,.08); display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden; transition:all 0.3s }
.stat-card::before { content:''; position:absolute; top:0; left:0; width:100%; height:4px }
.stat-card.primary::before { background:linear-gradient(90deg,var(--primary),var(--accent)) }
.stat-card.info::before { background:linear-gradient(90deg,var(--accent),#67e8f9) }
.stat-card.success::before { background:linear-gradient(90deg,#10b981,#34d399) }
.stat-card.warning::before { background:linear-gradient(90deg,#f59e0b,#fbbf24) }
.stat-card.purple::before { background:linear-gradient(90deg,var(--purple),#c084fc) }
.stat-card:hover { box-shadow:0 8px 30px rgba(0,119,182,.2),0 4px 12px rgba(0,0,0,.1); transform:translateY(-2px) }
.stat-card .top { display:flex; justify-content:space-between; align-items:flex-start }
.stat-card .value { font-size:1.6rem; font-weight:700; color:var(--text-primary); line-height:1.1 }
.stat-card .label { font-size:0.78rem; color:var(--text-secondary); margin-top:0.2rem; font-weight:500 }
.icon-wrap { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:var(--accent-light); color:var(--primary) }
.stat-card.purple .icon-wrap { background:rgba(156,39,176,.12); color:var(--purple) }
.stat-card.success .icon-wrap { background:rgba(16,185,129,.12); color:var(--green) }
.stat-card.warning .icon-wrap { background:rgba(245,158,11,.12); color:var(--orange) }
.stat-card.info .icon-wrap { background:var(--accent-light); color:var(--accent) }
.stat-card .icon-wrap .material-icons { font-size:22px }
.status { padding:0.85rem 1.25rem; border-radius:10px; margin-bottom:1.5rem; font-size:0.85rem; display:flex; align-items:center; gap:0.75rem }
.status.loading { background:rgba(0,180,216,.1); color:var(--primary) }
.status.error { background:rgba(239,68,68,.1); color:var(--red) }
.status.success { background:rgba(16,185,129,.1); color:var(--green) }
</style>
.status.error { background:rgba(239,68,68,.1); color:var(--red) }
.status.success { background:rgba(16,185,129,.1); color:var(--green) }
</style>
