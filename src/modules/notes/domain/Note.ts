export interface Note {
    id: string
    user_id: string
    title: string | null
    content: string
    color: string
    created_at: string
    updated_at: string
}

export interface NoteInsertDTO {
    title?: string | null
    content: string
    color?: string
}

export interface NoteUpdateDTO {
    title?: string | null
    content?: string
    color?: string
}

// Предопределенные цвета стикеров
export const NOTE_COLORS = [
    '#fef3c7', // Желтый (классика)
    '#d1fae5', // Мятно-зеленый
    '#e0e7ff', // Бледно-голубой
    '#fce7f3', // Розовый
    '#f3e8ff', // Сиреневый
    '#f3f4f6'  // Светло-серый
]
