// src/modules/prices/priceAdapter.ts
// Преобразование DTO цены из API в UI‑модель и обратно

export interface PriceDto {
    id: string
    product_id: string
    store_id: string
    value: number
    currency: string
    created_at: string
}

export interface PriceModel {
    id: string
    productId: string
    storeId: string
    value: number
    currency: string
    createdAt: Date
}

/**
 * Преобразует объект, полученный из Supabase, в модель, используемую в UI.
 */
export function priceDtoToModel(dto: PriceDto): PriceModel {
    return {
        id: dto.id,
        productId: dto.product_id,
        storeId: dto.store_id,
        value: dto.value,
        currency: dto.currency,
        createdAt: new Date(dto.created_at),
    }
}

/**
 * Преобразует UI‑модель обратно в DTO для отправки в API.
 */
export function priceModelToDto(model: PriceModel): PriceDto {
    return {
        id: model.id,
        product_id: model.productId,
        store_id: model.storeId,
        value: model.value,
        currency: model.currency,
        created_at: model.createdAt.toISOString(),
    }
}
