# Google Apps Script — Dashboard SIES Universidades

Dashboard web interactivo con datos del Sistema de Información de Educación Superior (SIES) de Chile. 100% gratuito.

## Arquitectura

```
BigQuery (datos)  ←  Apps Script (api.gs)  ←  Navegador (Vue 3 + Chart.js)
  190K filas             SQL directo               Dashboard HTML
  $0/mes                 $0/mes                    $0
```

**URL del dashboard:** `https://script.google.com/macros/s/AKfycbyRv1bKQRhsotd8XP5uIhjfbNgpprJ7VAnxdj5nIQvpm4U_9aZI9-DK-K0lY6jXUcAN/exec`

---

## Características del Dashboard

### Frontend Vue 3 Composition API
- **Reactividad**: filtros, búsquedas y cambios de sección actualizan los datos al instante sin recargar la página
- **Computed properties**: cálculos derivados (totales, promedios, tendencias) se actualizan automáticamente
- **Watchers**: la paginación y los gráficos se actualizan cuando cambian los filtros
- **Lifecycle hooks**: carga diferida de gráficos para mejor performance
- **Componentes render condicional**: cada sección (Resumen, Oferta, Matrícula, etc.) solo se renderiza cuando es necesaria

### Secciones
| Sección | Contenido |
|---------|-----------|
| **📊 Resumen** | 4 stat cards con valores grandes, iconos, tendencias año a año y footer descriptivo |
| **📚 Oferta Académica** | Stat cards + filtros (año, universidad, nivel, vigencia) + gráfico doughnut + tabla paginada |
| **👥 Matrícula** | Placeholder (datos disponibles en carpeta Matrícula) |
| **🎓 Titulación** | Placeholder (datos disponibles en carpeta Titulados) |
| **💼 Empleabilidad** | Placeholder (datos disponibles en carpeta Empleabilidad) |

### Stat Cards (Resumen)
- Valor principal grande
- Icono con fondo de color
- Indicador de tendencia (% vs año anterior)
- Barra superior con gradient de color
- Efecto hover con elevación y sombra
- Paleta: azul (#0077b6), cyan (#00b4d8), verde (#10b981), naranja (#f59e0b), púrpura (#9c27b0)

### Stat Cards (Oferta)
- Total programas, Pregrado, Postgrado, Vacantes Totales, Arancel Promedio
- Iconos Material Design
- Efectos hover

### Filtros en Oferta
- **Año**: todos los años disponibles (2010-2025)
- **Universidad**: selector con 67 universidades
- **Nivel**: Pregrado / Postgrado
- **Vigencia**: con/sin estudiantes nuevos
- **Búsqueda**: por nombre de carrera
- **Limpiar**: reset de todos los filtros

### Gráficos
- **Chart.js 4** con CDN
- **Bar chart**: programas por sede (Resumen)
- **Line chart**: evolución de aranceles con gradiente de llenado (Resumen)
- **Doughnut chart**: distribución por sede (Oferta)
- Renderización lazy (solo se generan cuando la sección es visible)
- Tooltips con formato de moneda ($X.XM)

### Tablas
- Encabezados clickeables para ordenar por columna
- Paginación (25 registros por página)
- Hover en filas con tinte azul
- Formato automático de moneda en columnas de aranceles

### Sidebar
- Navegación fija a la izquierda
- Fondo con gradiente azul oscuro (#0077b6 → #00b4d8)
- 5 secciones con iconos Material Design
- Item activo con borde izquierdo cyan
- Footer con info de costo ($0)

### Topbar
- Título dinámico según sección activa
- Fecha actual
- Badge "SIES 2010-2025"

### Seguridad
- **Claves Configurables**: Las API Keys (como la del Chat IA en Groq) ya no están quemadas en el código, sino que se extraen dinámicamente usando `PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY')` para evitar filtraciones de credenciales.

### Performance
- **Paginación Robusta en BigQuery**: Migración de `Jobs.query` a `Jobs.insert` con polling y `getQueryResults` recursivo (usando `pageToken`). Esto garantiza que resultsets grandes no sufran cortes parciales ni superen el timeout de 10s de Apps Script.
- **Consultas Multianuales Optimizadas**: Carga diferida donde el resumen histórico realiza consultas pre-calculadas en BigQuery (`GROUP BY Año`), y el selector del dashboard descarga únicamente los datos detallados del año activo de forma reactiva.
- **Cache local inteligente**: El almacenamiento `localStorage` guarda tanto la lista de años disponibles de la base de datos como el dataset del año en curso.

### Paleta de Colores
| Color | Hex | Uso |
|-------|-----|-----|
| Azul primary | #0077b6 | Sidebar, botones, acentos |
| Cyan | #00b4d8 | Gradientes, iconos activos |
| Cyan light | #caf0f8 | Tags, fondos de iconos |
| Azul oscuro | #023e8a | Textos en tags |
| Verde | #10b981 | Stat cards, tendencias positivas |
| Naranja | #f59e0b | Stat cards, warnings |
| Púrpura | #9c27b0 | Stat cards alternativas |
| Rojo | #ef4444 | Tendencias negativas |
| Fondo | #f0f4f8 | Página |

---

## Archivos del proyecto

| Archivo | Rol |
|---------|-----|
| `api.gs` | Código servidor: doGet (HTML), getDataForDashboard (BigQuery), getJsonData (API JSON) |
| `frontend_vue.html` | Dashboard principal - Vue 3 Composition API + Chart.js + Material Icons |
| `Index.html` | Dashboard anterior (legacy) |
| `appsscript.json` | Config del proyecto (BigQuery service, webapp público) |
| `_datos.gs` | Placeholder (datos en BigQuery) |
| `consolidar_todas.py` | Consolida CSVs anuales en dataset unificado |
| `upload_bigquery.py` | Sube CSV a BigQuery |
| `universidades_2010_2025.csv` | Dataset - 190K filas, 67 universidades, 2010-2025 |

---

## Dataset (BigQuery)

- **Tabla**: `dotacion-ua.SIES.Oferta`
- **Filas**: 190.485 (2010-2025)
- **67 universidades** chilenas
- **26 columnas**: año, IES, sede, carrera, área, grado, modalidad, vacantes, aranceles, ponderaciones PAES, acreditación, etc.

---

## Tecnologías

| Capa | Tecnología | Detalle |
|------|-----------|---------|
| Datos | BigQuery | 190K filas, $0 (tier gratuito) |
| API | Google Apps Script | SQL directo, $0 (20K ejec/día) |
| Frontend | Vue 3 CDN | Composition API, reactivity system |
| Gráficos | Chart.js 4 CDN | Bar, Line, Doughnut charts |
| Iconos | Material Icons (Google Fonts) | 900+ iconos |
| CSS | Variables CSS + Flexbox/Grid | Diseño responsive |
| Cache | localStorage | 1 hora TTL |
| Despliegue | clasp CLI | $0 |

---

## Cómo actualizar (1 vez al año)

### 1. Consolidar datos locales
```bash
cd "11.Informacion Entorno SIES"
python Google_App_Script/consolidar_todas.py
```

### 2. Subir a BigQuery
En https://console.cloud.google.com/bigquery:
- Dataset: `SIES`
- Tabla: `universidades`
- "+ Crear tabla" → Subir CSV → Detección automática

### 3. Desplegar cambios
```bash
cd Google_App_Script
npx @google/clasp push --force
npx @google/clasp deploy -d "nueva versión"
```

---

## Proyectos asociados

- **GCP:** `dotacion-ua` (240095991553)
- **Apps Script:** [Editor](https://script.google.com/d/1GTg-ZHz_9NfLehVn8MrJ8kmRh9_QhGnuSbQwbQ-erejPPsZbx5ApGH1o/edit)
- **Google Sheet:** [Sheet original](https://drive.google.com/open?id=1q5RXQqOxQCMWqKc8eeI1PQMvIUXgsYZdGZVaObvP7TE) (ya no se usa para datos)

---

## Comandos útiles

```bash
# Subir cambios
cd Google_App_Script
npx @google/clasp push --force

# Crear deployment
npx @google/clasp deploy -d "descripción"

# Ver deployments
npx @google/clasp deployments

# Abrir editor
npx @google/clasp open
```
