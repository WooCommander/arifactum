<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, HelpCircle } from 'lucide-vue-next'
import { parseBirthdayInput } from '../../lib/birthdayUtils'
import { FpHaptics } from '@/shared/lib/haptics'
import type { BirthdayInsertDTO } from '../../domain/Birthday'

const emit = defineEmits<{
    (e: 'add', payload: BirthdayInsertDTO): void
}>()

const inputValue = ref('')
const isFocused = ref(false)

const parsedInfo = computed(() => {
    return parseBirthdayInput(inputValue.value)
})

const isValid = computed(() => parsedInfo.value !== null)

const handleAdd = () => {
    if (!isValid.value || !parsedInfo.value) return
    FpHaptics.success()
    emit('add', {
        day: parsedInfo.value.day,
        month: parsedInfo.value.month,
        year: parsedInfo.value.year,
        name: parsedInfo.value.name
    })
    inputValue.value = ''
}

const showHelp = ref(false)
</script>

<template>
    <div class="add-birthday-container">
        <div class="input-wrapper" :class="{ focused: isFocused }">
            <input 
                v-model="inputValue"
                type="text" 
                class="bday-input" 
                placeholder="22.02.1977 Мама"
                @focus="isFocused = true"
                @blur="isFocused = false"
                @keyup.enter="handleAdd"
            />
            
            <button 
                class="help-btn" 
                @click="showHelp = !showHelp" 
                title="Форматы ввода"
                type="button"
            >
                <HelpCircle :size="20" />
            </button>
            
            <button 
                class="add-btn" 
                :disabled="!isValid" 
                @click="handleAdd"
            >
                <Plus :size="24" :stroke-width="3" />
            </button>
        </div>

        <transition name="fade">
            <div v-if="inputValue && isValid && parsedInfo" class="preview-box">
                <span class="preview-icon">✨</span>
                Will add: <b>{{ parsedInfo.name }}</b> 
                (День: {{ parsedInfo.day }}, Месяц: {{ parsedInfo.month }}<span v-if="parsedInfo.year">, Год: {{ parsedInfo.year }}</span>)
            </div>
            
            <div v-else-if="inputValue && !isValid" class="preview-box error">
                <span class="preview-icon">⚠️</span>
                Непонятный формат. Попробуйте: <b>ДД.ММ Имя</b> или <b>ДД.ММ.ГГГГ Имя</b>
            </div>
        </transition>

        <transition name="fade">
            <div v-if="showHelp" class="help-box">
                <h4>Поддерживаемые форматы:</h4>
                <ul>
                    <li><code>22.02.1977 Мама</code> — с годом</li>
                    <li><code>15.08 Коллега</code> — без года</li>
                    <li><code>22-02-1977</code> или <code>22/02</code> тоже работают</li>
                </ul>
                <p>Имя или описание указывается через пробел после даты.</p>
            </div>
        </transition>
    </div>
</template>

<style scoped lang="scss">
.add-birthday-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: var(--spacing-lg);
}

.input-wrapper {
    display: flex;
    align-items: center;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 6px 6px 6px 16px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

    &.focused {
        border-color: var(--color-primary);
        box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }
}

.bday-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    min-width: 0; // prevent overflow

    &::placeholder {
        color: var(--color-text-tertiary);
        font-weight: 500;
    }
}

.help-btn {
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;

    &:hover {
        background: var(--color-background);
        color: var(--color-text-primary);
    }
}

.add-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: none;
    background: var(--color-primary);
    color: var(--color-on-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:disabled {
        background: var(--color-border);
        color: var(--color-text-tertiary);
        cursor: not-allowed;
    }

    &:not(:disabled):hover {
        background: color-mix(in srgb, var(--color-primary) 90%, black);
        transform: scale(1.05);
    }
    
    &:not(:disabled):active {
        transform: scale(0.95);
    }
}

.preview-box {
    font-size: 0.85rem;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;

    &.error {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444; // Tailwind red-500
    }

    .preview-icon {
        font-size: 1rem;
    }
}

.help-box {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 12px;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    
    h4 {
        margin: 0 0 8px 0;
        color: var(--color-text-primary);
    }
    
    ul {
        margin: 0 0 8px 0;
        padding-left: 20px;
        
        li {
            margin-bottom: 4px;
        }
    }
    
    p {
        margin: 0;
        font-style: italic;
    }

    code {
        background: var(--color-background);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: inherit;
        font-weight: 700;
        color: var(--color-primary);
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
