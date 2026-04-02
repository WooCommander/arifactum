export const PRODUCT_CATEGORIES = [
    'Овощи',
    'Фрукты',
    'Мясо',
    'Молочные продукты',
    'Бакалея',
    'Напитки',
    'Хлеб',
    'Бытовая химия'
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]
