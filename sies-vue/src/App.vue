<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const isSidebarOpen = ref(true)

const titulo = computed(() => {
  const t = { '/resumen': 'Sistema Universitario', '/oferta': 'Oferta Académica', '/matricula': 'Matrícula', '/titulacion': 'Titulación', '/empleabilidad': 'Empleabilidad' }
  return t[route.path] || 'Dashboard'
})
</script>

<template>
  <div class="layout">
    <Sidebar :isOpen="isSidebarOpen" />
    <main class="main" :class="{ 'full-width': !isSidebarOpen }">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <button @click="isSidebarOpen = !isSidebarOpen" class="menu-btn">
            <span class="material-icons">menu</span>
          </button>
          <h1>{{ titulo }}</h1>
        </div>
        <div class="topbar-right">
          <span class="date">{{ new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' }) }}</span>
          <span class="badge">SIES 2010-2025</span>
        </div>
      </div>
      <div class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
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
}
* { margin:0; padding:0; box-sizing:border-box }
body { font-family:'Roboto',sans-serif; background:var(--bg-page); color:var(--text-primary); min-height:100vh }
.material-icons { font-family:'Material Icons'; font-weight:normal; font-style:normal; font-size:24px; line-height:1; letter-spacing:normal; text-transform:none; display:inline-block; white-space:nowrap; word-wrap:normal; direction:ltr }
.layout { display:flex; min-height:100vh }
.main { margin-left:260px; flex:1; transition:margin-left 0.3s ease; min-width:0 }
.main.full-width { margin-left:0 }
.topbar { background:var(--card-bg); padding:1rem 2rem; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; box-shadow:0 1px 3px rgba(0,0,0,.06) }
.topbar h1 { font-size:1.4rem; font-weight:500 }
.topbar-right { display:flex; align-items:center; gap:1rem }
.topbar .badge { background:var(--primary); color:#fff; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem; font-weight:500 }
.topbar .date { font-size:0.85rem; color:var(--text-secondary) }
.menu-btn { background:none; border:none; cursor:pointer; color:var(--text-primary); display:flex; align-items:center; justify-content:center; padding:4px; border-radius:4px }
.content { padding:1.5rem }
.footer { text-align:center; padding:2rem; font-size:0.8rem; color:var(--text-secondary) }

.fade-enter-active, .fade-leave-active { transition:opacity 0.2s ease }
.fade-enter-from, .fade-leave-to { opacity:0 }

.stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1.25rem; margin-bottom:1.5rem }
.stat-card { background:var(--card-bg); border-radius:16px; padding:1.25rem 1.5rem; box-shadow:0 4px 20px rgba(0,119,182,.15),0 2px 8px rgba(0,0,0,.08); border:1px solid rgba(0,119,182,.08); display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden; transition:all 0.3s }
.stat-card::before { content:''; position:absolute; top:0; left:0; width:100%; height:4px }
.stat-card.primary::before { background:linear-gradient(90deg,var(--primary),var(--accent)) }
.stat-card.info::before { background:linear-gradient(90deg,var(--accent),#67e8f9) }
.stat-card.success::before { background:linear-gradient(90deg,#10b981,#34d399) }
.stat-card.warning::before { background:linear-gradient(90deg,#f59e0b,#fbbf24) }
.stat-card.purple::before { background:linear-gradient(90deg,var(--purple),#c084fc) }
.stat-card:hover { box-shadow:0 8px 30px rgba(0,119,182,.2),0 4px 12px rgba(0,0,0,.1); transform:translateY(-2px) }
.stat-card .top { display:flex; justify-content:space-between; align-items:flex-start }
.stat-card .value { font-size:1.4rem; font-weight:700; color:var(--text-primary); line-height:1.1 }
.stat-card .label { font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem; font-weight:500 }
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
.status .material-icons { font-size:20px }

.section-title { font-size:1.1rem; font-weight:500; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem; color:var(--text-primary) }
.section-title .material-icons { color:var(--primary) }

@media (max-width:768px) {
  .main { margin-left:0 !important }
  .sidebar { transform:translateX(-100%) }
  .topbar { padding:0.75rem 1rem }
  .content { padding:1rem }
  .stats-grid { grid-template-columns:1fr }
}
</style>