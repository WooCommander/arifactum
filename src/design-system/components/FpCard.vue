<script setup lang="ts">
interface Props {
  flat?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  flat: false,
  padding: 'md'
})
</script>

<template>
  <div class="fp-card" :class="[`p-${props.padding}`, { 'is-flat': props.flat }]">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.fp-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  width: 100%;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: var(--spacing-sm);

  &.shadow {
    box-shadow: var(--shadow-1);
  }

  // Padding variants
  &.p-none {
    padding: 0;
  }

  &.p-sm {
    padding: var(--spacing-sm);
  }

  &.p-md {
    padding: var(--spacing-md);
  }

  &.p-lg {
    padding: var(--spacing-lg);
  }


}
</style>
