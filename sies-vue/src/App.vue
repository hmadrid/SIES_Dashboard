<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ResumenView from './views/ResumenView.vue'
import OfertaView from './views/OfertaView.vue'

const seccion = ref('resumen')
const isSidebarOpen = ref(true)

function cambiarSeccion(nueva) {
  seccion.value = nueva
}
</script>

<template>
  <div class="layout">
    <Sidebar :seccion="seccion" :isOpen="isSidebarOpen" @cambiar="cambiarSeccion" />
    <main class="main" :class="{ 'full-width': !isSidebarOpen }">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <button @click="isSidebarOpen = !isSidebarOpen" class="menu-btn">
            <span class="material-icons">menu</span>
          </button>
          <h1>{{ seccion === 'resumen' ? 'Sistema Universitario' : 'Oferta Académica' }}</h1>
        </div>
        <div class="topbar-right">
          <span class="date">{{ new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' }) }}</span>
          <span class="badge">SIES 2010-2025</span>
        </div>
      </div>
      <div class="content">
        <ResumenView v-if="seccion === 'resumen'" />
        <OfertaView v-if="seccion === 'oferta'" />
        <div v-if="seccion === 'matricula'" class="placeholder"><span class="material-icons big">people</span><h3>Matrícula</h3><p>Próximamente</p></div>
        <div v-if="seccion === 'titulacion'" class="placeholder"><span class="material-icons big">school</span><h3>Titulación</h3><p>Próximamente</p></div>
        <div v-if="seccion === 'empleabilidad'" class="placeholder"><span class="material-icons big">work</span><h3>Empleabilidad</h3><p>Próximamente</p></div>
      </div>
      <div class="footer">100% gratis — InsForge + Vue 3 + Vite · Datos SIES · Mineduc Chile</div>
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Icons');

:root {
  --bg-page: #f0f4f8; --card-bg: #ffffff; --text-primary: #1a202c;
  --text-secondary: #64748b; --primary: #0077b6; --primary-light: #90e0ef;
  --primary-dark: #023e8a; --accent: #00b4d8; --accent-light: #caf0f8;
  --purple: #9c27b0; --green: #10b981; --orange: #f59e0b; --red: #ef4444;
  --shadow: 0 4px 20px rgba(0,119,182,.15), 0 2px 8px rgba(0,0,0,.08);
}
* { margin:0; padding:0; box-sizing:border-box }
body { font-family:'Roboto',sans-serif; background:var(--bg-page); color:var(--text-primary); min-height:100vh }
.material-icons { font-family:'Material Icons'; font-weight:normal; font-style:normal; font-size:24px; line-height:1; letter-spacing:normal; text-transform:none; display:inline-block; white-space:nowrap; word-wrap:normal; direction:ltr }
.layout { display:flex; min-height:100vh }
.main { margin-left:260px; flex:1; transition:margin-left 0.3s ease; min-width:0; overflow-x:hidden }
.main.full-width { margin-left:0 }
.topbar { background:var(--card-bg); padding:1rem 2rem; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; box-shadow:0 1px 3px rgba(0,0,0,.06) }
.topbar h1 { font-size:1.4rem; font-weight:500 }
.topbar-right { display:flex; align-items:center; gap:1rem }
.topbar .badge { background:var(--primary); color:#fff; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem; font-weight:500 }
.topbar .date { font-size:0.85rem; color:var(--text-secondary) }
.menu-btn { background:none; border:none; cursor:pointer; color:var(--text-primary); display:flex; align-items:center; justify-content:center; padding:4px; border-radius:4px }
.content { padding:1.5rem 2rem }
</style>
