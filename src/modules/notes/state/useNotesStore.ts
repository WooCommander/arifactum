import { ref, readonly } from 'vue'
import type { Note, NoteInsertDTO, NoteUpdateDTO } from '../domain/Note'
import { NoteService } from '../services/NoteService'
import { authStore } from '@/modules/auth/store/authStore'

const notes = ref<Note[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useNotesStore = () => {
    const fetchNotes = async () => {
        if (!authStore.user.value) {
            notes.value = []
            return
        }
        
        isLoading.value = true
        error.value = null
        try {
            notes.value = await NoteService.fetchNotes()
        } catch (err: any) {
            console.error('Failed to fetch notes:', err)
            error.value = err.message || 'Ошибка загрузки заметок'
        } finally {
            isLoading.value = false
        }
    }

    const addNote = async (data: NoteInsertDTO) => {
        try {
            const newNote = await NoteService.createNote(data)
            notes.value.unshift(newNote)
            return newNote
        } catch (err: any) {
            console.error('Failed to add note:', err)
            throw err
        }
    }

    const editNote = async (id: string, updates: NoteUpdateDTO) => {
        try {
            const updated = await NoteService.updateNote(id, updates)
            const idx = notes.value.findIndex(n => n.id === id)
            if (idx !== -1) {
                notes.value[idx] = updated
            }
            return updated
        } catch (err: any) {
            console.error('Failed to edit note:', err)
            throw err
        }
    }

    const removeNote = async (id: string) => {
        try {
            await NoteService.deleteNote(id)
            notes.value = notes.value.filter(n => n.id !== id)
        } catch (err: any) {
            console.error('Failed to delete note:', err)
            throw err
        }
    }

    return {
        notes: readonly(notes),
        isLoading: readonly(isLoading),
        error: readonly(error),
        fetchNotes,
        addNote,
        editNote,
        removeNote
    }
}
