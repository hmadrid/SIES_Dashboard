import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import ResumenView from './views/ResumenView.vue'
import OfertaView from './views/OfertaView.vue'

const routes = [
  { path: '/', redirect: '/resumen' },
  { path: '/resumen', component: ResumenView },
  { path: '/oferta', component: OfertaView },
  { path: '/matricula', component: () => import('./views/PlaceholderView.vue') },
  { path: '/titulacion', component: () => import('./views/PlaceholderView.vue') },
  { path: '/empleabilidad', component: () => import('./views/PlaceholderView.vue') },
]

const router = createRouter({ history: createWebHashHistory(), routes })
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
