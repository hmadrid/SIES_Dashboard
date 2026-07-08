import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API = 'https://rn5h6ghm.function2.insforge.app/api'

export const useSIESStore = defineStore('sies', () => {
  // Estado
  const datos = ref([])
  const status = ref(null)
  const totalRegistros = ref(0)
  const kpis = ref({})
  const listaAnios = ref([])
  const universidades = ref([])

  // Filtros
  const filtroAnio = ref('')
  const filtroUniversidad = ref('')
  const filtroNivel = ref('')
  const filtroVigencia = ref('')
  const filtroTipoIES = ref('')
  const busqueda = ref('')
  const pagina = ref(1)
  const perPage = ref(25)
  const sortCol = ref('')
  const sortAsc = ref(true)

  // Computed
  const totalPaginas = computed(() => Math.max(1, Math.ceil(totalRegistros.value / perPage.value)))

  // Acciones
  async function cargarFiltros() {
    const res = await fetch(`${API}/sies-filtros`)
    const data = await res.json()
    listaAnios.value = (data.anios || []).filter(a => a >= 2018)
    universidades.value = data.universidades || []
    if (listaAnios.value.length) filtroAnio.value = listaAnios.value[0]
  }

  async function cargarDatos() {
    status.value = { type: 'loading', msg: 'Consultando InsForge...' }
    try {
      const qs = new URLSearchParams()
      qs.append('limit', perPage.value)
      qs.append('offset', (pagina.value - 1) * perPage.value)
      if (filtroAnio.value) qs.append('año', filtroAnio.value)
      if (filtroUniversidad.value) qs.append('nombre_ies', filtroUniversidad.value)
      if (filtroNivel.value) qs.append('nivel_global', filtroNivel.value)
      if (filtroVigencia.value) qs.append('vigencia', filtroVigencia.value)
      if (filtroTipoIES.value) qs.append('tipo_ies', filtroTipoIES.value)
      if (busqueda.value.trim()) qs.append('busqueda', busqueda.value.trim())
      if (sortCol.value) {
        qs.append('orderCol', sortCol.value)
        qs.append('orderDir', sortAsc.value ? 'asc' : 'desc')
      }

      const res = await fetch(`${API}/sies-oferta?${qs}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()

      datos.value = (result.data || []).map(r => ({
        Año: r.año, 'Tipo Institución 1': r.tipo_institucion_1,
        'Código IES': r.codigo_ies, 'Nombre IES': r.nombre_ies,
        'Código Sede': r.codigo_sede, 'Nombre Sede': r.nombre_sede,
        'Código Carrera': r.codigo_carrera, 'Nombre Carrera': r.nombre_carrera,
        Modalidad: r.modalidad, Jornada: r.jornada,
        'Nivel Global': r.nivel_global, 'Nivel Carrera': r.nivel_carrera,
        'Vacantes Semestre Uno': r.vacantes_semestre_uno,
        'Matrícula Anual': r.matricula_anual, 'Arancel Anual': r.arancel_anual,
        'Acreditación Carrera o Programa': r.acreditacion_carrera,
        Vigencia: r.vigencia, 'Duración Estudios': r.duracion_estudios,
        'Región Sede': r.region_sede
      }))

      totalRegistros.value = result.total || 0
      kpis.value = result.kpis || {}
      status.value = { type: 'success', msg: `${totalRegistros.value.toLocaleString('es-CL')} registros` }
    } catch (e) {
      status.value = { type: 'error', msg: `Error: ${e.message}` }
    }
  }

  return {
    datos, status, totalRegistros, kpis, listaAnios, universidades,
    filtroAnio, filtroUniversidad, filtroNivel, filtroVigencia, filtroTipoIES,
    busqueda, pagina, perPage, sortCol, sortAsc, totalPaginas,
    cargarFiltros, cargarDatos
  }
})
