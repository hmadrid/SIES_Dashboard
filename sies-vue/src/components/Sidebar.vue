<script setup>
import { useRouter, useRoute } from 'vue-router'
defineProps({ isOpen: Boolean })

const router = useRouter()
const route = useRoute()

const items = [
  { section: 'Análisis' },
  { path: '/resumen', icon: 'dashboard', label: 'Resumen' },
  { path: '/oferta', icon: 'menu_book', label: 'Oferta Académica' },
  { section: 'Datos Complementarios' },
  { path: '/matricula', icon: 'people', label: 'Matrícula' },
  { path: '/titulacion', icon: 'school', label: 'Titulación' },
  { path: '/empleabilidad', icon: 'work', label: 'Empleabilidad' },
]

function navigate(path) { if (path) router.push(path) }
</script>

<template>
  <aside class="sidebar" :class="{ 'colapsado': !isOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <span class="material-icons" style="font-size:32px">school</span>
        <div>
          <h2>Dashboard SIES</h2>
          <p class="subtitle">Sistema de Información de Educación Superior</p>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.section" class="nav-section">{{ item.section }}</div>
        <div v-else class="nav-item" :class="{ active: route.path === item.path }" @click="navigate(item.path)">
          <span class="material-icons">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </div>
      </template>
    </nav>
    <div class="sidebar-footer">InsForge + Vue · $0 costo</div>
  </aside>
</template>

<style scoped>
.sidebar {
  width:260px; background:linear-gradient(180deg,#0077b6,#00b4d8); color:#fff;
  position:fixed; left:0; top:0; height:100vh; display:flex; flex-direction:column;
  z-index:100; box-shadow:4px 0 20px rgba(0,0,0,.3); transition:transform 0.3s ease;
}
.sidebar.colapsado { transform:translateX(-100%) }
.sidebar-header { padding:1.5rem; border-bottom:1px solid rgba(255,255,255,.1) }
.sidebar-header .logo { display:flex; align-items:center; gap:0.75rem }
.sidebar-header h2 { font-size:1.1rem; font-weight:700 }
.sidebar-header .subtitle { font-size:0.75rem; opacity:0.7; margin-top:0.25rem }
.sidebar-nav { flex:1; padding:1rem 0 }
.nav-section { font-size:0.65rem; text-transform:uppercase; letter-spacing:1.5px; color:rgba(255,255,255,.4); padding:1rem 1.5rem 0.5rem }
.nav-item { display:flex; align-items:center; gap:1rem; padding:0.85rem 1.5rem; cursor:pointer; transition:all 0.2s; border-left:3px solid transparent; color:rgba(255,255,255,.75); font-size:0.9rem }
.nav-item:hover { background:rgba(255,255,255,.08); color:#fff }
.nav-item.active { background:rgba(0,119,182,.25); border-left-color:#00b4d8; color:#fff }
.nav-item .material-icons { font-size:20px; opacity:0.8 }
.nav-item.active .material-icons { opacity:1 }
.sidebar-footer { padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,.1); font-size:0.7rem; opacity:0.5; text-align:center }
</style>
