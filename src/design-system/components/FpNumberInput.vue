<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'

interface Props {
    modelValue: number | string
    label?: string
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    placeholder?: string
    stepper?: boolean
    unit?: string
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    step: 1,
    disabled: false,
    stepper: false
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void
}>()

const isFocused = ref(false)
const isDecimal = computed(() => (props.step ?? 1) < 1)
const inputMode = computed(() => isDecimal.value ? 'decimal' : 'numeric')

// Внутреннее строковое значение для отображения
const displayValue = ref(String(props.modelValue ?? 0))

// Синхронизация снаружи → внутрь (только когда поле не в фокусе)
watch(() => props.modelValue, (val) => {
    if (!isFocused.value) {
        displayValue.value = String(val ?? 0)
    }
})

const num = computed(() => Number(props.modelValue) || 0)
const canDec = computed(() => !props.disabled && (props.min === undefined || num.value > props.min))
const canInc = computed(() => !props.disabled && (props.max === undefined || num.value < props.max))

const decrement = () => {
    if (!canDec.value) return
    const next = parseFloat((num.value - (props.step ?? 1)).toPrecision(10))
    const clamped = props.min !== undefined ? Math.max(next, props.min) : next
    displayValue.value = String(clamped)
    emit('update:modelValue', clamped)
}

const increment = () => {
    if (!canInc.value) return
    const next = parseFloat((num.value + (props.step ?? 1)).toPrecision(10))
    const clamped = props.max !== undefined ? Math.min(next, props.max) : next
    displayValue.value = String(clamped)
    emit('update:modelValue', clamped)
}

// Разрешённые управляющие клавиши
const ALLOWED_KEYS = new Set([
    'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
])

const onKeyDown = (e: KeyboardEvent) => {
    if (ALLOWED_KEYS.has(e.key)) return
    // Разрешаем Ctrl+A/C/V/X
    if (e.ctrlKey || e.metaKey) return
    // Разрешаем цифры
    if (/^\d$/.test(e.key)) return
    // Разрешаем точку и запятую (только для decimal)
    if (isDecimal.value && (e.key === '.' || e.key === ',')) return
    // Разрешаем минус в начале (если min не задан или < 0)
    if (e.key === '-' && (props.min === undefined || props.min < 0)) return
    // Всё остальное — блокируем
    e.preventDefault()
}

const onInput = (e: Event) => {
    const input = e.target as HTMLInputElement
    // Заменяем запятую на точку
    let raw = input.value.replace(',', '.')
    // Убираем дублирующиеся точки (оставляем только первую)
    const parts = raw.split('.')
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('')
    // Обновляем отображение если строка изменилась
    if (raw !== input.value) {
        const pos = input.selectionStart ?? raw.length
        input.value = raw
        input.setSelectionRange(pos, pos)
    }
    displayValue.value = raw
    const val = parseFloat(raw)
    if (!isNaN(val)) emit('update:modelValue', val)
}

const onBlur = (e: Event) => {
    isFocused.value = false
    const input = e.target as HTMLInputElement
    let val = parseFloat(input.value.replace(',', '.'))
    if (isNaN(val)) val = num.value
    if (props.min !== undefined) val = Math.max(val, props.min)
    if (props.max !== undefined) val = Math.min(val, props.max)
    displayValue.value = String(val)
    emit('update:modelValue', val)
}
</script>

<template>
    <div class="fp-number-input" :class="{ 'is-disabled': disabled, 'is-stepper': stepper }">
        <!-- Stepper mode: [−] value [+] -->
        <template v-if="stepper">
            <span v-if="label" class="fp-number-label">{{ label }}</span>
            <div class="stepper-wrap" :class="{ focused: isFocused }">
                <button class="stepper-btn" type="button" :disabled="!canDec" @click="decrement" aria-label="Уменьшить">
                    <Minus :size="16" :stroke-width="2.5" />
                </button>
                <input
                    class="stepper-input"
                    type="text"
                    :value="displayValue"
                    :disabled="disabled"
                    :inputmode="inputMode"
                    @keydown="onKeyDown"
                    @input="onInput"
                    @blur="onBlur"
                    @focus="isFocused = true"
                />
                <button class="stepper-btn" type="button" :disabled="!canInc" @click="increment" aria-label="Увеличить">
                    <Plus :size="16" :stroke-width="2.5" />
                </button>
            </div>
        </template>

        <!-- Plain input mode -->
        <template v-else>
            <span v-if="label" class="fp-number-label">{{ label }}</span>
            <div class="plain-wrap" :class="{ focused: isFocused }">
                <input
                    class="plain-input"
                    type="text"
                    :value="displayValue"
                    :disabled="disabled"
                    :placeholder="placeholder ?? '0'"
                    :inputmode="inputMode"
                    @keydown="onKeyDown"
                    @input="onInput"
                    @blur="onBlur"
                    @focus="isFocused = true"
                />
                <span v-if="unit" class="plain-unit">{{ unit }}</span>
            </div>
        </template>
    </div>
</template>

<style scoped lang="scss">
.fp-number-input {
    display: flex;
    flex-direction: column;
    gap: 5px;

    &.is-disabled {
        opacity: 0.5;
        pointer-events: none;
    }
}

.fp-number-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    padding-left: 2px;
    letter-spacing: 0.01em;
}

/* ── Plain mode ───────────────────────────── */
.plain-wrap {
    display: flex;
    align-items: center;
    height: 44px;
    border: 1.5px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    padding: 0 12px;
    transition: border-color 0.2s;

    &.focused {
        border-color: var(--color-primary);
    }
}

.plain-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    height: 100%;
    outline: none;
    font-family: var(--font-family-base);
    padding: 0;

    &::placeholder {
        color: var(--color-text-disabled);
        font-weight: 400;
    }
}

.plain-unit {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-left: 4px;
    flex-shrink: 0;
}

/* ── Stepper mode ─────────────────────────── */
.stepper-wrap {
    display: flex;
    align-items: center;
    height: 44px;
    border: 1.5px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    overflow: hidden;
    transition: border-color 0.2s;

    &.focused {
        border-color: var(--color-primary);
    }
}

.stepper-btn {
    flex-shrink: 0;
    width: 44px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: background 0.15s, color 0.15s;

    &:active:not(:disabled),
    &:hover:not(:disabled) {
        background: var(--color-surface-hover);
        color: var(--color-primary);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
}

.stepper-input {
    flex: 1;
    min-width: 0;
    text-align: center;
    border: none;
    border-left: 1.5px solid var(--color-border);
    border-right: 1.5px solid var(--color-border);
    background: transparent;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: 0 4px;
    height: 100%;
    outline: none;
    font-family: var(--font-family-base);
}
</style>
