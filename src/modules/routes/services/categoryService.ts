import { supabase } from '@/api/supabase'

export interface Category {
    id: string
    name: string
    created_at?: string
}

export const categoryService = {
    async getCategories(): Promise<Category[]> {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.log('Using local categories fallback (table categories not found in Supabase)')
            return [
                { id: '1', name: 'История' },
                { id: '2', name: 'Мистика' },
                { id: '3', name: 'Природа' },
                { id: '4', name: 'Город' },
                { id: '5', name: 'Для детей' },
                { id: '6', name: 'Спорт' }
            ]
        }
    },

    async addCategory(name: string): Promise<Category> {
        const { data, error } = await supabase
            .from('categories')
            .insert({ name })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
