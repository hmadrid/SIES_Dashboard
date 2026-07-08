<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAPI } from '../composables/useAPI.js'
import Chart from 'chart.js/auto'

const { datos, status, totalRegistros, kpis, cargarDatos, cargarFiltros } = useAPI()

const filtroAnio = ref('')
const filtroUniversidad = ref('')
const filtroNivel = ref('')
const filtroVigencia = ref('')
const filtroTipoIES = ref('')
const busqueda = ref('')
const pagina = ref(1)
const perPage = 25
const sortCol = ref('')
const sortAsc = ref(true)

const listaAnios = ref([])
const universidades = ref([])
const chartsVisible = ref(false)

const totalPaginas = computed(() => Math.max(1, Math.ceil(totalRegistros.value / perPage)))

const iesTabs = [
  { label: 'Todos', value: '' },
  { label: 'Universidades', value: 'Universidades' },
  { label: 'Institutos', value: 'Institutos Profesionales' },
  { label: 'CFT', value: 'Centros de Formación Técnica' }
]

function fmtNum(n) { return n?.toLocaleString('es-CL') || '0' }
function fmtPesos(n) {
  n = parseInt(n); if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return '$' + (n/1_000_000).toFixed(1) + 'M'
  return '$' + n.toLocaleString('es-CL')
}

async function cargar() {
  await cargarDatos({
    limit: perPage, offset: (pagina.value - 1) * perPage,
    anio: filtroAnio.value, universidad: filtroUniversidad.value,
    nivel: filtroNivel.value, vigencia: filtroVigencia.value,
    tipoIES: filtroTipoIES.value, busqueda: busqueda.value.trim(),
    orderCol: sortCol.value || undefined, orderDir: sortAsc.value ? 'asc' : 'desc'
  })
  chartsVisible.value = true
  nextTick(() => updateCharts())
}

watch([filtroAnio, filtroUniversidad, filtroNivel, filtroVigencia, filtroTipoIES, pagina, sortCol, sortAsc], cargar)

let searchTimeout
watch(busqueda, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { pagina.value = 1; cargar() }, 350)
})

onMounted(async () => {
  const f = await cargarFiltros()
  listaAnios.value = f.anios
  universidades.value = f.universidades
  if (listaAnios.value.length) filtroAnio.value = listaAnios.value[0]
  await cargar()
})

let chartVacantes = null, chartArancel = null

function updateCharts() {
  const k = kpis.value
  // Vacantes Presencial vs Online
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
  // Evolución Aranceles
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
</script>

<template>
  <div>
    <div v-if="status" class="status" :class="status.type">
      <span class="material-icons">{{ status.type === 'loading' ? 'hourglass_empty' : status.type === 'error' ? 'error' : 'check_circle' }}</span>
      {{ status.msg }}
    </div>

    <div class="section-title"><span class="material-icons">menu_book</span> Oferta Académica</div>

    <!-- Sub-tabs tipo IES -->
    <div class="ies-tabs">
      <div v-for="tab in iesTabs" :key="tab.value" class="ies-tab" :class="{active: filtroTipoIES === tab.value}" @click="filtroTipoIES = tab.value">
        {{ tab.label }}
      </div>
    </div>

    <!-- KPIs -->
    <div class="stats-grid">
      <div class="stat-card primary"><div class="top"><div><div class="value">{{ fmtNum(kpis.total_carreras) }}</div><div class="label">Total Programas</div></div><div class="icon-wrap"><span class="material-icons">menu_book</span></div></div></div>
      <div class="stat-card info"><div class="top"><div><div class="value">{{ fmtNum(kpis.carreras_pregrado) }}</div><div class="label">Pregrado</div></div><div class="icon-wrap"><span class="material-icons">school</span></div></div></div>
      <div class="stat-card purple"><div class="top"><div><div class="value">{{ fmtNum(kpis.carreras_postgrado) }}</div><div class="label">Postgrado</div></div><div class="icon-wrap"><span class="material-icons">workspace_premium</span></div></div></div>
      <div class="stat-card success"><div class="top"><div><div class="value">{{ fmtNum(kpis.total_vacantes) }}</div><div class="label">Vacantes Totales</div></div><div class="icon-wrap"><span class="material-icons">event_seat</span></div></div></div>
      <div class="stat-card warning"><div class="top"><div><div class="value">{{ fmtPesos(kpis.arancel_promedio) }}</div><div class="label">Arancel Prom.</div></div><div class="icon-wrap"><span class="material-icons">payments</span></div></div></div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <select v-model="filtroAnio"><option v-for="a in listaAnios" :key="a" :value="a">{{ a }}</option></select>
      <select v-model="filtroUniversidad"><option value="">Todas</option><option v-for="u in universidades" :key="u" :value="u">{{ u }}</option></select>
      <select v-model="filtroNivel"><option value="">Todos</option><option value="Pregrado">Pregrado</option><option value="Postgrado">Postgrado</option></select>
      <input type="text" v-model="busqueda" placeholder="Buscar carrera...">
    </div>

    <!-- Charts -->
    <div class="charts-grid" v-if="chartsVisible">
      <div class="chart-card"><div class="header"><h3>Vacantes: Presencial vs Online</h3></div><canvas id="chart-vacantes"></canvas></div>
      <div class="chart-card"><div class="header"><h3>Evolución Aranceles</h3></div><canvas id="chart-aranceles"></canvas></div>
    </div>

    <!-- Tabla -->
    <div class="table-card">
      <div class="header"><h3>Registros</h3><span class="count">{{ datos.length }} de {{ totalRegistros }}</span></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Año</th><th>Nombre IES</th><th>Nombre Carrera</th><th>Nivel</th><th>Vacantes</th><th>Arancel</th></tr></thead>
          <tbody>
            <tr v-for="(r,i) in datos" :key="i">
              <td>{{ r['Año'] }}</td><td>{{ r['Nombre IES'] }}</td><td>{{ r['Nombre Carrera'] }}</td>
              <td>{{ r['Nivel Global'] }}</td><td>{{ fmtNum(r['Vacantes Semestre Uno']) }}</td><td>{{ fmtPesos(r['Arancel Anual']) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Pág {{ pagina }} de {{ totalPaginas }}</span>
        <div class="pagination-btns">
          <button class="btn btn-outline" @click="pagina--" :disabled="pagina <= 1">← Anterior</button>
          <button class="btn btn-outline" @click="pagina++" :disabled="pagina >= totalPaginas">Siguiente →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title { font-size:1.1rem; font-weight:500; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem }
.section-title .material-icons { color:var(--primary) }
.ies-tabs { display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:2px solid #e2e8f0 }
.ies-tab { padding:0.5rem 1.25rem; font-size:0.875rem; font-weight:500; color:var(--text-secondary); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all 0.2s; border-radius:4px 4px 0 0 }
.ies-tab:hover { color:var(--primary); background:var(--accent-light) }
.ies-tab.active { color:var(--primary); border-bottom-color:var(--primary); font-weight:600 }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1.25rem; margin-bottom:1.5rem }
.stat-card { background:var(--card-bg); border-radius:16px; padding:1.5rem 1.75rem; box-shadow:0 4px 20px rgba(0,119,182,.15),0 2px 8px rgba(0,0,0,.08); border:1px solid rgba(0,119,182,.08); display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden; transition:all 0.3s }
.stat-card .top { display:flex; justify-content:space-between; align-items:flex-start }
.stat-card .value { font-size:1.6rem; font-weight:700; color:var(--text-primary) }
.stat-card .label { font-size:0.78rem; color:var(--text-secondary); margin-top:0.2rem; font-weight:500 }
.icon-wrap { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:var(--accent-light); color:var(--primary) }
.stat-card .icon-wrap .material-icons { font-size:22px }
.filters-bar { background:var(--card-bg); border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 1px 3px rgba(0,0,0,.06); display:flex; gap:1rem; flex-wrap:wrap; align-items:center; margin-bottom:1.5rem }
.filters-bar select, .filters-bar input { padding:0.6rem 1rem; border:1px solid #e0e0e0; border-radius:8px; font-size:0.85rem; background:#fff }
.charts-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.5rem; margin-bottom:1.5rem }
.chart-card { background:var(--card-bg); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow) }
.chart-card .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem }
.chart-card h3 { font-size:1rem; font-weight:500 }
.chart-card canvas { max-height:280px }
.table-card { background:var(--card-bg); border-radius:12px; box-shadow:var(--shadow); overflow:hidden }
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
.status { padding:0.85rem 1.25rem; border-radius:10px; margin-bottom:1.5rem; font-size:0.85rem; display:flex; align-items:center; gap:0.75rem }
.status.loading { background:rgba(0,180,216,.1); color:var(--primary) }
.status.error { background:rgba(239,68,68,.1); color:var(--red) }
.status.success { background:rgba(16,185,129,.1); color:var(--green) }
</style>
