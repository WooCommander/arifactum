<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: 'text' | 'number' | 'password' | 'email' | 'date'
  error?: string
  disabled?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const isFocused = ref(false)
const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== ''
})

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const val = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', val)
}

const onFocus = () => {
  isFocused.value = true
  emit('focus')
}

const onBlur = () => {
  isFocused.value = false
  emit('blur')
}
</script>

<template>
  <div class="fp-input-wrapper" :class="{ 'has-error': !!props.error, 'is-focused': isFocused, 'has-value': hasValue }">
    <div class="input-container">
      <input :id="inputId" class="fp-input" :type="props.type" :value="props.modelValue" :disabled="props.disabled"
        :placeholder="props.label && !isFocused && !hasValue ? '' : props.placeholder || ' '" @input="onInput"
        @focus="onFocus" @blur="onBlur" />
      <label v-if="props.label" :for="inputId" class="fp-label">
        {{ props.label }}
      </label>
    </div>
    <span v-if="props.error" class="error-text">{{ props.error }}</span>
  </div>
</template>

<style scoped lang="scss">
.fp-input-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-md);
  position: relative;
}

.input-container {
  position: relative;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  border-bottom: 2px solid var(--color-border);
  transition: border-color 0.2s;
  height: 56px; // Material Default

  display: flex;
  align-items: flex-end; // Align input to bottom
}

.fp-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 8px 16px;
  font-size: var(--text-body-1);
  color: var(--color-text-primary);
  outline: none;
  height: 28px;
  margin-bottom: 8px; // Space for text
}

.fp-label {
  position: absolute;
  left: 16px;
  top: 16px;
  font-size: var(--text-body-1);
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  pointer-events: none;
}

// States
.is-focused .input-container {
  border-bottom-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 4%, transparent);
}

.has-error .input-container {
  border-bottom-color: var(--color-error);
}

.is-focused .fp-label,
.has-value .fp-label {
  top: 4px;
  font-size: var(--text-caption);
  color: var(--color-primary);
}

.has-error .fp-label {
  color: var(--color-error);
}

.error-text {
  font-size: var(--text-caption);
  color: var(--color-error);
  padding: 4px 16px 0;
}
</style>
