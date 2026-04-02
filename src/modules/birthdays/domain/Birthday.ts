export interface Birthday {
    id: string
    user_id: string
    name: string
    day: number
    month: number
    year: number | null
    created_at: string
}

export interface BirthdayInsertDTO {
    name: string
    day: number
    month: number
    year: number | null
}

export interface BirthdayUpdateDTO extends Partial<BirthdayInsertDTO> {}

export interface ParsedBirthdayInput {
    day: number
    month: number
    year: number | null
    name: string
}
