// src/modules/catalog/storeAdapter.ts
// Преобразование DTO магазина из API в UI‑модель и обратно

export interface StoreDto {
    id: string
    name: string
    created_at: string
    created_by: string | null
}

export interface StoreModel {
    id: string
    name: string
    createdAt: Date
    createdBy: string | null
}

/** Преобразует объект, полученный из Supabase, в модель, используемую в UI. */
export function storeDtoToModel(dto: StoreDto): StoreModel {
    return {
        id: dto.id,
        name: dto.name,
        createdAt: new Date(dto.created_at),
        createdBy: dto.created_by ?? null,
    }
}

/** Преобразует UI‑модель обратно в DTO для отправки в API. */
export function storeModelToDto(model: StoreModel): StoreDto {
    return {
        id: model.id,
        name: model.name,
        created_at: model.createdAt.toISOString(),
        created_by: model.createdBy,
    }
}
