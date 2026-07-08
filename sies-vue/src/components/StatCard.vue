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
