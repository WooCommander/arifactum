import { supabase } from '@/api/supabase'
import type { Birthday, BirthdayInsertDTO, BirthdayUpdateDTO } from '../domain/Birthday'

export class BirthdayService {
    static async fetchBirthdays(): Promise<Birthday[]> {
        const { data, error } = await supabase
            .from('birthdays')
            .select('*')
            // Order doesn't matter much here since we'll sort them dynamically by "days left" in the store
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Birthday[]
    }

    static async createBirthday(birthday: BirthdayInsertDTO): Promise<Birthday> {
        const { data, error } = await supabase
            .from('birthdays')
            .insert({
                name: birthday.name,
                day: birthday.day,
                month: birthday.month,
                year: birthday.year
            })
            .select()
            .single()

        if (error) throw error
        return data as Birthday
    }

    static async updateBirthday(id: string, updates: BirthdayUpdateDTO): Promise<Birthday> {
        const { data, error } = await supabase
            .from('birthdays')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as Birthday
    }

    static async deleteBirthday(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('birthdays')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    }
}
