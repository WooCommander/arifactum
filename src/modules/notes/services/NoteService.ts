import { supabase } from '@/api/supabase'
import type { Note, NoteInsertDTO, NoteUpdateDTO } from '../domain/Note'

export class NoteService {
    static async fetchNotes(): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Note[]
    }

    static async getNote(id: string): Promise<Note | null> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('getNote error', error)
            return null
        }
        return data as Note
    }

    static async createNote(note: NoteInsertDTO): Promise<Note> {
        const { data, error } = await supabase
            .from('notes')
            .insert({
                title: note.title,
                content: note.content,
                color: note.color || '#fef3c7'
            })
            .select()
            .single()

        if (error) throw error
        return data as Note
    }

    static async updateNote(id: string, updates: NoteUpdateDTO): Promise<Note> {
        const { data, error } = await supabase
            .from('notes')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as Note
    }

    static async deleteNote(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    }
}
