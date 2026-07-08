<script setup>
defineProps({
  value: [String, Number],
  label: String,
  icon: String,
  color: { type: String, default: 'primary' }
})
</script>

<template>
  <div class="stat-card" :class="color">
    <div class="top">
      <div>
        <div class="value">{{ value }}</div>
        <div class="label">{{ label }}</div>
      </div>
      <div class="icon-wrap">
        <span class="material-icons">{{ icon }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.stat-card .value { font-size:1.6rem; font-weight:700; color:var(--text-primary); line-height:1.1 }
.stat-card .label { font-size:0.78rem; color:var(--text-secondary); margin-top:0.2rem; font-weight:500 }
</style>
