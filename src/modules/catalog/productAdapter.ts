// src/modules/catalog/productAdapter.ts
// Преобразование DTO продукта из API в UI‑модель и обратно

export interface ProductDto {
    id: string
    name: string
    category_id: string
    created_at: string
    created_by: string | null
}

export interface ProductModel {
    id: string
    name: string
    categoryId: string
    createdAt: Date
    createdBy: string | null
}

/** Преобразует объект, полученный из Supabase, в модель, используемую в UI. */
export function productDtoToModel(dto: ProductDto): ProductModel {
    return {
        id: dto.id,
        name: dto.name,
        categoryId: dto.category_id,
        createdAt: new Date(dto.created_at),
        createdBy: dto.created_by ?? null,
    }
}

/** Преобразует UI‑модель обратно в DTO для отправки в API. */
export function productModelToDto(model: ProductModel): ProductDto {
    return {
        id: model.id,
        name: model.name,
        category_id: model.categoryId,
        created_at: model.createdAt.toISOString(),
        created_by: model.createdBy,
    }
}
