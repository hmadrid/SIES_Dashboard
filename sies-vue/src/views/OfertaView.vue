<script setup>
import { onMounted, watch, nextTick } from 'vue'
import { useSIESStore } from '../stores/sies.js'
import StatCard from '../components/StatCard.vue'
import Chart from 'chart.js/auto'

const store = useSIESStore()

function fmtNum(n) { return n?.toLocaleString('es-CL') || '0' }
function fmtPesos(n) {
  n = parseInt(n); if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return '$' + (n/1_000_000).toFixed(1) + 'M'
  return '$' + n.toLocaleString('es-CL')
}

const iesTabs = [
  { label: 'Todos', value: '' },
  { label: 'Universidades', value: 'Universidades' },
  { label: 'Institutos', value: 'Institutos Profesionales' },
  { label: 'CFT', value: 'Centros de Formación Técnica' }
]

let chartVacantes = null, chartArancel = null

function updateCharts() {
  const k = store.kpis
  const c1 = document.getElementById('chart-vacantes')
  if (c1) {
    if (chartVacantes) chartVacantes.destroy()
    chartVacantes = new Chart(c1, {
      type: 'doughnut',
      data: {
        labels: ['Presencial', 'No Presencial'],
        datasets: [{ data: [k.vacantes_presencial || 1, k.vacantes_no_presencial || 1], backgroundColor: ['#0077b6', '#90e0ef'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    })
  }
  const c2 = document.getElementById('chart-aranceles')
  if (c2 && k.historico_oferta?.length) {
    if (chartArancel) chartArancel.destroy()
    chartArancel = new Chart(c2, {
      type: 'line',
      data: {
        labels: k.historico_oferta.map(h => h.anio),
        datasets: [{ label: 'Arancel', data: k.historico_oferta.map(h => h.arancel_promedio), borderColor: '#ff9800', backgroundColor: 'rgba(255,152,0,0.1)', fill: true, tension: 0.4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => (v/1000000).toFixed(1) + 'M' } } } }
    })
  }
}

let searchTimeout
watch(() => store.busqueda, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { store.pagina = 1; store.cargarDatos() }, 350)
})

watch([() => store.filtroAnio, () => store.filtroUniversidad, () => store.filtroNivel, () => store.filtroVigencia, () => store.filtroTipoIES, () => store.pagina, () => store.sortCol, () => store.sortAsc], () => {
  store.cargarDatos().then(() => nextTick(updateCharts))
})

onMounted(async () => {
  if (!store.listaAnios.length) await store.cargarFiltros()
  await store.cargarDatos()
  nextTick(updateCharts)
})
</script>

<template>
  <div>
    <div v-if="store.status" class="status" :class="store.status.type">
      <span class="material-icons">{{ store.status.type === 'loading' ? 'hourglass_empty' : store.status.type === 'error' ? 'error' : 'check_circle' }}</span>
      {{ store.status.msg }}
    </div>

    <div class="section-title"><span class="material-icons">menu_book</span> Oferta Académica</div>

    <div class="ies-tabs">
      <div v-for="tab in iesTabs" :key="tab.value" class="ies-tab" :class="{active: store.filtroTipoIES === tab.value}" @click="store.filtroTipoIES = tab.value">
        {{ tab.label }}
      </div>
    </div>

    <div class="stats-grid">
      <StatCard :value="fmtNum(store.kpis.total_carreras)" label="Total Programas" icon="menu_book" color="primary" />
      <StatCard :value="fmtNum(store.kpis.carreras_pregrado)" label="Pregrado" icon="school" color="info" />
      <StatCard :value="fmtNum(store.kpis.carreras_postgrado)" label="Postgrado" icon="workspace_premium" color="purple" />
      <StatCard :value="fmtNum(store.kpis.total_vacantes)" label="Vacantes Totales" icon="event_seat" color="success" />
      <StatCard :value="fmtPesos(store.kpis.arancel_promedio)" label="Arancel Prom." icon="payments" color="warning" />
    </div>

    <div class="filters-bar">
      <select v-model="store.filtroAnio"><option v-for="a in store.listaAnios" :key="a" :value="a">{{ a }}</option></select>
      <select v-model="store.filtroUniversidad"><option value="">Todas</option><option v-for="u in store.universidades" :key="u" :value="u">{{ u }}</option></select>
      <select v-model="store.filtroNivel"><option value="">Todos</option><option value="Pregrado">Pregrado</option><option value="Postgrado">Postgrado</option></select>
      <input type="text" v-model="store.busqueda" placeholder="Buscar carrera...">
    </div>

    <div class="charts-grid">
      <div class="chart-card"><div class="header"><h3>Vacantes: Presencial vs Online</h3></div><canvas id="chart-vacantes"></canvas></div>
      <div class="chart-card"><div class="header"><h3>Evolución Aranceles</h3></div><canvas id="chart-aranceles"></canvas></div>
    </div>

    <div class="table-card">
      <div class="header"><h3>Registros</h3><span class="count">{{ store.datos.length }} de {{ store.totalRegistros }}</span></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Año</th><th>Nombre IES</th><th>Nombre Carrera</th><th>Nivel</th><th>Vacantes</th><th>Arancel</th></tr></thead>
          <tbody>
            <tr v-for="(r,i) in store.datos" :key="i">
              <td>{{ r.Año }}</td><td>{{ r['Nombre IES'] }}</td><td>{{ r['Nombre Carrera'] }}</td>
              <td>{{ r['Nivel Global'] }}</td><td>{{ fmtNum(r['Vacantes Semestre Uno']) }}</td><td>{{ fmtPesos(r['Arancel Anual']) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Pág {{ store.pagina }} de {{ store.totalPaginas }}</span>
        <div class="pagination-btns">
          <button class="btn btn-outline" @click="store.pagina--" :disabled="store.pagina <= 1">← Anterior</button>
          <button class="btn btn-outline" @click="store.pagina++" :disabled="store.pagina >= store.totalPaginas">Siguiente →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ies-tabs { display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:2px solid #e2e8f0 }
.ies-tab { padding:0.5rem 1.25rem; font-size:0.875rem; font-weight:500; color:var(--text-secondary); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all 0.2s; border-radius:4px 4px 0 0 }
.ies-tab:hover { color:var(--primary); background:var(--accent-light) }
.ies-tab.active { color:var(--primary); border-bottom-color:var(--primary); font-weight:600 }
.filters-bar { background:var(--card-bg); border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 1px 3px rgba(0,0,0,.06); display:flex; gap:1rem; flex-wrap:wrap; align-items:center; margin-bottom:1.5rem }
.filters-bar select, .filters-bar input { padding:0.6rem 1rem; border:1px solid #e0e0e0; border-radius:8px; font-size:0.85rem; background:#fff }
.charts-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.5rem; margin-bottom:1.5rem }
.chart-card { background:var(--card-bg); border-radius:12px; padding:1.5rem; box-shadow:0 4px 20px rgba(0,119,182,.15) }
.chart-card .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem }
.chart-card h3 { font-size:1rem; font-weight:500 }
.chart-card canvas { max-height:280px }
.table-card { background:var(--card-bg); border-radius:12px; box-shadow:0 4px 20px rgba(0,119,182,.15); overflow:hidden }
.table-card .header { padding:1.25rem 1.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center }
.table-card h3 { font-size:1rem; font-weight:500 }
.table-card .count { font-size:0.8rem; color:var(--text-secondary); background:#f5f5f5; padding:0.3rem 0.8rem; border-radius:20px }
.table-wrapper { overflow-x:auto }
table { width:100%; border-collapse:collapse }
thead { background:#fafafa }
th { text-align:left; padding:0.85rem 1.25rem; font-size:0.75rem; font-weight:500; text-transform:uppercase; color:var(--text-secondary); border-bottom:1px solid #eee }
td { padding:0.85rem 1.25rem; border-bottom:1px solid #f5f5f5; font-size:0.875rem }
.pagination { padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; font-size:0.8rem }
.pagination-btns { display:flex; gap:0.5rem }
.btn { padding:0.5rem 1rem; border:none; border-radius:8px; font-size:0.8rem; font-weight:500; cursor:pointer }
.btn-outline { background:transparent; border:1px solid #ddd; color:var(--text-secondary) }
.btn-outline:hover { border-color:var(--primary); color:var(--primary) }
.btn-outline:disabled { opacity:0.5; cursor:not-allowed }
</style>
