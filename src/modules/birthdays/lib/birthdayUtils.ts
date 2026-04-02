import type { ParsedBirthdayInput } from '../domain/Birthday'

/**
 * Парсит строку ввода. 
 * Примеры:
 * "22.02.1977 мама" -> { day: 22, month: 2, year: 1977, name: "мама" }
 * "22.02 мама" -> { day: 22, month: 2, year: null, name: "мама" }
 * Возвращает null, если формат не распознан.
 */
export function parseBirthdayInput(input: string): ParsedBirthdayInput | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    // Регулярка для: DD.MM.YYYY Имя или DD.MM Имя (разделители точка, дефис или слеш)
    const regex = /^(\d{1,2})[\.\/\-](\d{1,2})(?:[\.\/\-](\d{4}|\d{2}))?\s+(.+)$/i
    const match = trimmed.match(regex)

    if (!match) return null

    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    
    // Валидация дня и месяца
    if (day < 1 || day > 31 || month < 1 || month > 12) return null

    let year: number | null = null
    if (match[3]) {
        let parsedYear = parseInt(match[3], 10)
        // Если указали "77", считаем это 1977. Если "15", считаем 2015.
        if (parsedYear < 100) {
            parsedYear += parsedYear > 30 ? 1900 : 2000
        }
        year = parsedYear
    }

    const name = match[4].trim()
    if (!name) return null

    return { day, month, year, name }
}

export function getZodiac(day: number, month: number): string {
    // Находим первый знак, где месяц меньше, или (месяц равен и день меньше/равен)
    // Но алгоритм проще:
    if ((month === 1 && day <= 19) || (month === 12 && day >= 22)) return '♑ Козерог'
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '♒ Водолей'
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '♓ Рыбы'
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '♈ Овен'
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '♉ Телец'
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '♊ Близнецы'
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '♋ Рак'
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '♌ Лев'
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '♍ Дева'
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '♎ Весы'
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '♏ Скорпион'
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '♐ Стрелец'
    return '✨ Неизвестно'
}

export function getChineseZodiac(year: number | null): string | null {
    if (!year) return null
    const animals = ['Обезьяна 🐒', 'Петух 🐓', 'Собака 🐕', 'Свинья 🐖', 'Крыса 🐀', 'Бык 🐂', 'Тигр 🐅', 'Кролик 🐇', 'Дракон 🐉', 'Змея 🐍', 'Лошадь 🐎', 'Коза 🐐']
    // Китайский зодиак: 1900 был годом Крысы (не совсем, 1900 - Крыса? 1900 % 12 = 4 (Дракон). 
    // Математика (год % 12). 1924 (Крыса) % 12 = 4. Значит индекс 4 это Крыса.
    // 0 = Обезьяна, 1 = Петух, 2 = Собака, 3 = Свинья, 4 = Крыса, 5 = Бык...
    return animals[year % 12]
}

export function getDaysUntilNext(day: number, month: number): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let nextBday = new Date(today.getFullYear(), month - 1, day)
    
    // Если ДР уже прошел в этом году, ставим на следующий
    if (nextBday.getTime() < today.getTime()) {
        nextBday.setFullYear(today.getFullYear() + 1)
    }
    
    const diffTime = Math.abs(nextBday.getTime() - today.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function calculateAge(year: number | null, day: number, month: number): number | null {
    if (!year) return null
    const today = new Date()
    let age = today.getFullYear() - year
    
    // Уменьшаем возраст на 1, если ДР в этом году еще не наступил
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
        age--
    }
    return age
}

/**
 * Возвращает сколько лет ИСПОЛНИТСЯ (или исполнилось) в ТЕКУЩЕМ/СЛЕДУЮЩЕМ дне рождения
 */
export function getTurningAge(year: number | null, day: number, month: number): number | null {
    if (!year) return null
    const today = new Date()
    let nextBdayYear = today.getFullYear()
    
    let nextBday = new Date(today.getFullYear(), month - 1, day)
    // Если ДР уже прошел в этом году, значит следующий будет в следующем году
    if (nextBday.getTime() < today.setHours(0,0,0,0)) {
        nextBdayYear++
    }
    
    return nextBdayYear - year
}

/**
 * Рассчитывает ближайшую тысячную круглую дату (например, 10 000 дней)
 */
export function getNextRoundDays(year: number | null, day: number, month: number) {
    if (!year) return null
    
    const birthDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const daysLived = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLived < 0) return null // Рожден в будущем
    
    const exactNextMilestone = (Math.floor(daysLived / 1000) + 1) * 1000
    const milestoneDate = new Date(birthDate.getTime() + exactNextMilestone * 24 * 60 * 60 * 1000)
    
    return {
        daysLived,
        nextMilestone: exactNextMilestone,
        milestoneDate: milestoneDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
}
