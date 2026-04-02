<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'full' | 'icon'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const classes = computed(() => [
  'fp-button',
  `fp-button--${props.variant}`,
  `fp-button--${props.size}`,
  { 'fp-button--loading': props.loading }
])
</script>

<template>
  <button :class="classes" :disabled="props.disabled || props.loading" :type="props.type"
    @click="emit('click', $event)">
    <span v-if="loading" class="fp-button__loader">...</span>
    <span v-else class="fp-button__content">
      <slot />
    </span>
  </button>
</template>

<style scoped lang="scss">
/* @use '../tokens.scss' as *; - Variables are now global */

.fp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: var(--font-family-base);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;

  // Sizes & Radius
  &--sm {
    height: 32px;
    padding: 0 16px;
    font-size: var(--text-caption);
    border-radius: var(--radius-sm);
  }

  &--icon {
    width: 30px;
    height: 30px;
    padding: 0;
    font-size: 18px;
    border-radius: var(--radius-sm);
    text-transform: none;
    letter-spacing: 0;
    min-width: unset;
  }

  &--md {
    height: 48px;
    padding: 0 32px; // Wider padding for elegance
    font-size: var(--text-button);
    border-radius: var(--radius-md);
    min-width: 120px; // Ensure buttons aren't too small
  }

  &--lg {
    height: 56px;
    padding: 0 40px;
    font-size: var(--text-body-1);
    border-radius: var(--radius-md);
    min-width: 160px;
  }

  &--full {
    width: 100%;
    height: 56px; // Taller for full width
    font-size: var(--text-button);
    border-radius: var(--radius-md);
  }

  // Variants
  &--primary {
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: var(--shadow-1);

    &:hover:not(:disabled) {
      filter: brightness(1.08);
      box-shadow: var(--shadow-2);
    }

    &:active:not(:disabled) {
      box-shadow: var(--shadow-2);
      filter: brightness(1.15);
    }
  }

  &--secondary {
    background-color: var(--color-secondary);
    color: var(--color-on-secondary);

    &:hover:not(:disabled) {
      filter: brightness(0.95);
    }

    &:active:not(:disabled) {
      filter: brightness(0.88);
    }
  }

  &--text {
    background-color: transparent;
    color: var(--color-primary);
    box-shadow: none;

    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--color-primary) 7%, transparent);
    }

    &:active:not(:disabled) {
      background-color: color-mix(in srgb, var(--color-primary) 14%, transparent);
    }
  }

  &--outline {
    background-color: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);

    &:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
      border-color: var(--color-text-secondary);
    }

    &:active:not(:disabled) {
      background-color: var(--color-surface-hover);
    }
  }

  &--danger {
    background-color: var(--color-error);
    color: var(--color-on-primary);

    &:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    &:active:not(:disabled) {
      filter: brightness(1.2);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none !important;
    filter: none !important;
  }
}
</style>
