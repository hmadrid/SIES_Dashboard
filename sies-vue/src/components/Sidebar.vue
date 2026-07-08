<script setup>
defineProps({ seccion: String, isOpen: Boolean })
defineEmits(['cambiar'])
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
      <div class="nav-section">Análisis</div>
      <div class="nav-item" :class="{active:seccion==='resumen'}" @click="$emit('cambiar','resumen')">
        <span class="material-icons">dashboard</span> <span>Resumen</span>
      </div>
      <div class="nav-item" :class="{active:seccion==='oferta'}" @click="$emit('cambiar','oferta')">
        <span class="material-icons">menu_book</span> <span>Oferta Académica</span>
      </div>
      <div class="nav-section">Datos Complementarios</div>
      <div class="nav-item" :class="{active:seccion==='matricula'}" @click="$emit('cambiar','matricula')">
        <span class="material-icons">people</span> <span>Matrícula</span>
      </div>
      <div class="nav-item" :class="{active:seccion==='titulacion'}" @click="$emit('cambiar','titulacion')">
        <span class="material-icons">school</span> <span>Titulación</span>
      </div>
      <div class="nav-item" :class="{active:seccion==='empleabilidad'}" @click="$emit('cambiar','empleabilidad')">
        <span class="material-icons">work</span> <span>Empleabilidad</span>
      </div>
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
.nav-item.active { background:rgba(0,119,182,.25); border-left-color:var(--accent,#00b4d8); color:#fff }
.nav-item .material-icons { font-size:20px; opacity:0.8 }
.nav-item.active .material-icons { opacity:1 }
.sidebar-footer { padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,.1); font-size:0.7rem; opacity:0.5; text-align:center }
</style>
