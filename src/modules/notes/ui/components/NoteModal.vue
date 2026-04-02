<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X, Check } from 'lucide-vue-next'
import { NOTE_COLORS, type Note, type NoteInsertDTO } from '../../domain/Note'
import { FpHaptics } from '@/shared/lib/haptics'

interface Props {
    visible: boolean
    initialData?: Note | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'close'): void
    (e: 'save', data: { id?: string, note: NoteInsertDTO }): void
}>()

const title = ref('')
const content = ref('')
const selectedColor = ref(NOTE_COLORS[0])
const isSaving = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

watch(() => props.visible, (newVal) => {
    if (newVal) {
        if (props.initialData) {
            title.value = props.initialData.title || ''
            content.value = props.initialData.content || ''
            selectedColor.value = props.initialData.color || NOTE_COLORS[0]
        } else {
            // New note defaults
            title.value = ''
            content.value = ''
            selectedColor.value = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
        }
        
        nextTick(() => {
            if (textareaRef.value) {
                textareaRef.value.focus()
            }
        })
    }
})

const handleSave = () => {
    if (!content.value.trim()) return
    
    FpHaptics.success()
    isSaving.value = true
    
    emit('save', {
        id: props.initialData?.id,
        note: {
            title: title.value.trim() || null,
            content: content.value.trim(),
            color: selectedColor.value
        }
    })
    
    // We expect the parent to close the modal after save
    setTimeout(() => {
        isSaving.value = false
    }, 500)
}
</script>

<template>
    <transition name="pop">
        <div v-if="props.visible" class="modal-overlay" @mousedown.self="emit('close')">
            <div class="note-modal" :style="{ backgroundColor: selectedColor }">
                <!-- Header -->
                <div class="modal-header">
                    <input 
                        v-model="title" 
                        class="title-input" 
                        type="text" 
                        placeholder="Заголовок (необязательно)"
                        maxlength="50"
                    />
                    <button class="close-btn" @click="emit('close')">
                        <X :size="24" />
                    </button>
                </div>
                
                <!-- Content -->
                <div class="modal-body">
                    <textarea 
                        ref="textareaRef"
                        v-model="content" 
                        class="content-input" 
                        placeholder="Запишите вашу мысль..."
                    ></textarea>
                </div>
                
                <!-- Footer (Colors & Post) -->
                <div class="modal-footer">
                    <div class="color-picker">
                        <button 
                            v-for="color in NOTE_COLORS" 
                            :key="color"
                            class="color-dot"
                            :style="{ backgroundColor: color }"
                            :class="{ active: selectedColor === color }"
                            @click="selectedColor = color; FpHaptics.selection()"
                            type="button"
                        >
                            <Check v-if="selectedColor === color" :size="14" class="check-icon" />
                        </button>
                    </div>
                    
                    <button class="save-btn" @click="handleSave" :disabled="!content.trim() || isSaving">
                        <span v-if="!isSaving">{{ props.initialData ? 'Сохранить' : 'Готово' }}</span>
                        <div v-else class="loader"></div>
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped lang="scss">
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
}

.note-modal {
    width: 100%;
    max-width: 400px;
    border-radius: 12px; // Classic sticky notes are a bit square, but 12px looks modern
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: background-color 0.3s ease;
    // Note: color text is adjusted below
}

.modal-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    padding-bottom: 0;
    
    .title-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 1.1rem;
        font-weight: 700;
        color: #1f2937; // Dark text for light pastel backgrounds
        
        &::placeholder {
            color: rgba(31, 41, 55, 0.4);
        }
    }
}

.close-btn {
    background: transparent;
    border: none;
    color: rgba(31, 41, 55, 0.6);
    padding: 4px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    
    &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #1f2937;
    }
}

.modal-body {
    padding: 16px;
    flex: 1;
    min-height: 200px;
}

.content-input {
    width: 100%;
    height: 100%;
    min-height: 200px;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-size: 1.05rem;
    line-height: 1.5;
    color: #374151; // Slightly softer than black
    font-family: inherit;
    
    &::placeholder {
        color: rgba(55, 65, 81, 0.4);
    }
}

.modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.3); // Slight glass effect over the note color
    border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.color-picker {
    display: flex;
    gap: 8px;
}

.color-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    
    &.active {
        border-color: rgba(0, 0, 0, 0.2);
        transform: scale(1.1);
    }
    
    .check-icon {
        color: rgba(0,0,0,0.5);
    }
}

.save-btn {
    background: rgba(0, 0, 0, 0.08);
    color: #1f2937;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 100px;
    height: 38px;
    
    &:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.15);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0,0,0,0.1);
    border-top-color: #1f2937;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}

// Modal Animation
.pop-enter-active,
.pop-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-enter-from,
.pop-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.modal-overlay.pop-enter-from,
.modal-overlay.pop-leave-to {
    opacity: 0;
    transform: none;
}
</style>
