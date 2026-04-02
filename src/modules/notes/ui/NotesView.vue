<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-vue-next'
import { useNotesStore } from '../state/useNotesStore'
import type { Note } from '../domain/Note'
import NoteModal from './components/NoteModal.vue'
import { FpHaptics } from '@/shared/lib/haptics'

const router = useRouter()
const { notes, isLoading, fetchNotes, addNote, editNote, removeNote } = useNotesStore()

const isModalOpen = ref(false)
const editingNote = ref<Note | null>(null)

onMounted(() => {
    fetchNotes()
})

const openAddModal = () => {
    FpHaptics.selection()
    editingNote.value = null
    isModalOpen.value = true
}

const openEditModal = (note: Note) => {
    FpHaptics.selection()
    editingNote.value = note
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
    setTimeout(() => {
        editingNote.value = null
    }, 300)
}

const handleSaveNote = async (payload: { id?: string, note: any }) => {
    try {
        if (payload.id) {
            await editNote(payload.id, payload.note)
        } else {
            await addNote(payload.note)
        }
        closeModal()
    } catch (e) {
        console.error(e)
    }
}

const handleDelete = async (note: Note) => {
    FpHaptics.warning()
    const isConfirmed = window.confirm('Удалить заметку? Это действие нельзя будет отменить.')

    if (isConfirmed) {
        FpHaptics.success()
        await removeNote(note.id)
    }
}
</script>

<template>
    <div class="notes-view">
        <header class="hub-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <h1 class="title">Заметки</h1>
        </header>

        <p class="subtitle">Ваши личные записи. Доступны только вам.</p>

        <!-- Loading / Empty states -->
        <div v-if="isLoading && notes.length === 0" class="state-container">
            <div class="loader"></div>
            <p>Загрузка заметок...</p>
        </div>

        <div v-else-if="notes.length === 0" class="state-container empty-state">
            <div class="empty-icon-wrapper">
                <Edit2 :size="48" class="text-secondary" />
            </div>
            <h3>Пока нет заметок</h3>
            <p>Нажмите на плюс, чтобы создать свой первый стикер!</p>
        </div>

        <!-- Notes Masonry Grid -->
        <div v-else class="notes-masonry">
            <div 
                v-for="note in notes" 
                :key="note.id" 
                class="note-card"
                :style="{ backgroundColor: note.color }"
                @click="openEditModal(note)"
            >
                <div class="note-header">
                    <h3 v-if="note.title" class="note-title">{{ note.title }}</h3>
                    <div v-else class="note-title empty"></div>

                    <button class="delete-btn" @click.stop="handleDelete(note)">
                        <Trash2 :size="16" />
                    </button>
                </div>
                <div class="note-content">
                    {{ note.content }}
                </div>
            </div>
        </div>

        <!-- Floating Action Button -->
        <button class="fab-btn" @click="openAddModal">
            <Plus :size="28" :stroke-width="3" />
        </button>

        <NoteModal 
            :visible="isModalOpen" 
            :initial-data="editingNote"
            @close="closeModal"
            @save="handleSaveNote"
        />
    </div>
</template>

<style scoped lang="scss">
.notes-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--spacing-md);
    position: relative;
    padding-bottom: 90px; // space for FAB
    overflow-y: auto;
}

.hub-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    .title {
        font-size: 1.5rem;
        font-weight: 800;
        margin: 0;
        color: var(--color-text-primary);
    }
}

.subtitle {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-lg);
    font-size: 0.95rem;
}

.icon-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s;

    &:hover { background: var(--color-surface-hover); }
}

/* Masonry Layout */
.notes-masonry {
    columns: 2;
    column-gap: var(--spacing-md);
    width: 100%;
    
    @media (min-width: 768px) {
        columns: 3;
    }
    @media (min-width: 1024px) {
        columns: 4;
    }
}

.note-card {
    break-inside: avoid;
    margin-bottom: var(--spacing-md);
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); // slightly stronger shadow for stickers
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    
    // Light tilt effect to feel like a sticker
    &:nth-child(even) {
        border-bottom-right-radius: 24px 6px;
    }
    &:nth-child(odd) {
        border-bottom-left-radius: 20px 8px;
    }

    &:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        
        .delete-btn {
            opacity: 1; // show delete button on hover on desktop
        }
    }
    
    &:active {
        transform: scale(0.98);
    }
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.note-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: #1f2937;
    flex: 1;
    word-break: break-word;
    
    &.empty {
        height: 4px; // just space if no title
    }
}

.delete-btn {
    background: rgba(255, 255, 255, 0.4);
    border: none;
    color: rgba(31, 41, 55, 0.6);
    padding: 6px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    opacity: 0.7; // default visible on mobile
    
    @media (hover: hover) {
        opacity: 0; // hide on desktop till hover
    }

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444; // error color
    }
}

.note-content {
    font-size: 0.95rem;
    line-height: 1.5;
    color: #374151;
    white-space: pre-wrap; // preserve line breaks
    word-break: break-word;
}

.fab-btn {
    position: fixed;
    bottom: 80px; // Above bottom nav
    right: var(--spacing-md);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
    box-shadow: 0 8px 16px color-mix(in srgb, var(--color-primary) 40%, transparent);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 50;
    transition: transform 0.2s, background 0.2s;
    
    &:hover {
        transform: scale(1.05);
        background: color-mix(in srgb, var(--color-primary) 90%, black);
    }
    
    &:active {
        transform: scale(0.95);
    }
}

.state-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--color-text-secondary);
    gap: var(--spacing-md);
    
    &.empty-state {
        text-align: center;
        
        h3 {
            margin: 0;
            color: var(--color-text-primary);
        }
        p {
            margin: 0;
            max-width: 250px;
        }
    }
}

.empty-icon-wrapper {
    width: 80px;
    height: 80px;
    background: var(--color-surface);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-sm);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.loader {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}
</style>
