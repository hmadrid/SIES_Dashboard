import { ref } from 'vue'

const API = 'https://rn5h6ghm.function2.insforge.app/api'

export function useAPI() {
  const datos = ref([])
  const status = ref(null)
  const totalRegistros = ref(0)
  const kpis = ref({})

  async function cargarFiltros() {
    const res = await fetch(`${API}/sies-filtros`)
    const data = await res.json()
    return {
      anios: (data.anios || []).filter(a => a >= 2018),
      universidades: data.universidades || []
    }
  }

  async function cargarDatos(params = {}) {
    status.value = { type: 'loading', msg: 'Consultando InsForge...' }
    try {
      const qs = new URLSearchParams()
      qs.append('limit', params.limit || 25)
      qs.append('offset', params.offset || 0)
      if (params.anio) qs.append('año', params.anio)
      if (params.universidad) qs.append('nombre_ies', params.universidad)
      if (params.nivel) qs.append('nivel_global', params.nivel)
      if (params.vigencia) qs.append('vigencia', params.vigencia)
      if (params.tipoIES) qs.append('tipo_ies', params.tipoIES)
      if (params.busqueda) qs.append('busqueda', params.busqueda)
      if (params.orderCol) qs.append('orderCol', params.orderCol)
      if (params.orderDir) qs.append('orderDir', params.orderDir)

      const res = await fetch(`${API}/sies-oferta?${qs}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()

      datos.value = (result.data || []).map(r => ({
        'Año': r.año, 'Tipo Institución 1': r.tipo_institucion_1,
        'Código IES': r.codigo_ies, 'Nombre IES': r.nombre_ies,
        'Código Sede': r.codigo_sede, 'Nombre Sede': r.nombre_sede,
        'Código Carrera': r.codigo_carrera, 'Nombre Carrera': r.nombre_carrera,
        'Modalidad': r.modalidad, 'Jornada': r.jornada,
        'Nivel Global': r.nivel_global, 'Nivel Carrera': r.nivel_carrera,
        'Vacantes Semestre Uno': r.vacantes_semestre_uno,
        'Matrícula Anual': r.matricula_anual, 'Arancel Anual': r.arancel_anual,
        'Acreditación Carrera o Programa': r.acreditacion_carrera,
        'Vigencia': r.vigencia, 'Duración Estudios': r.duracion_estudios,
        'Región Sede': r.region_sede
      }))

      totalRegistros.value = result.total || 0
      kpis.value = result.kpis || {}
      status.value = { type: 'success', msg: `${totalRegistros.value.toLocaleString('es-CL')} registros` }
    } catch (e) {
      status.value = { type: 'error', msg: `Error: ${e.message}` }
    }
  }

  return { datos, status, totalRegistros, kpis, cargarDatos, cargarFiltros }
}
