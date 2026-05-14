<script setup lang="ts">
import FpBackButton from './FpBackButton.vue'

interface Props {
  title?: string
  subtitle?: string
  backTo?: string | object
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  showBack: false,
})
</script>

<template>
  <div class="page-title-row">
    <div class="title-with-back">
      <slot name="left">
        <FpBackButton v-if="showBack || backTo" :to="backTo" />
      </slot>
      
      <div class="title-group">
        <h1 class="page-title">
          <slot name="title">{{ title }}</slot>
        </h1>
        <div v-if="subtitle || $slots.subtitle" class="page-subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </div>
      </div>
    </div>
    
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 12px);
}
</style>
