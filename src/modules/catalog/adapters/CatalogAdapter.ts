import type { ProductDTO } from '../services/CatalogService'

export interface ProductModel {
    id: string
    name: string
    unit: string;
    description?: string;
    lastUpdate?: Date;
    lastUpdateRelative?: string;
    lastStore?: string;
    lastStoreId?: string;
    lastPrice?: number;
    priceRange?: { min: number; max: number };
    created_by?: string;
    formattedPriceRange?: string;
    history: ProductHistoryModel[]
    category: string;
    formattedPrice: string; // Add missing properties
    formattedAveragePrice?: string; // New field
    averagePrice?: number; // Needed for Logic/Charts
    formattedUnitPrice?: string; // e.g. "100 ₽/кг"
    displayName: string;
    priceStatus: 'good' | 'neutral' | 'bad';
    normalizedPrice?: number;
}

export interface ProductHistoryModel {
    id?: string
    price: number
    date: string
    storeName: string
    storeId: string
    author: string
    unit: string
    dateRelative: string
    createdBy?: string
    confirmCount: number
    denyCount: number
    userVote?: 'confirm' | 'deny'
    freshnessScore: number
    freshnessLabel: string
}

export function adaptProduct(dto: ProductDTO): ProductModel {
    // Determine price status
    let status: 'good' | 'neutral' | 'bad' = 'neutral'

    if (dto.lastPrice && dto.averagePrice) {
        // Compare normalized price if available, else raw price logic (legacy compatibility)
        const currentCheck = dto.normalizedPrice || dto.lastPrice

        // Average is now calculated based on normalized prices if they exist
        if (currentCheck <= dto.averagePrice * 0.95) {
            status = 'good'
        } else if (currentCheck >= dto.averagePrice * 1.05) {
            status = 'bad'
        }
    }

    return {
        id: dto.id,
        name: dto.name,
        category: dto.category,
        displayName: `${dto.name} (${dto.unit})`,
        unit: dto.unit,
        created_by: dto.created_by,
        lastUpdate: dto.lastUpdate ? new Date(dto.lastUpdate) : undefined,
        lastUpdateRelative: dto.lastUpdate ? formatTimeAgo(new Date(dto.lastUpdate)) : '',
        lastStore: dto.lastStore,
        lastStoreId: dto.lastStoreId,
        lastPrice: dto.lastPrice,
        priceRange: dto.priceRange,
        formattedPriceRange: formatPriceRange(dto.priceRange),
        formattedPrice: dto.lastPrice ? formatPrice(dto.lastPrice) : 'Нет цены',
        formattedAveragePrice: dto.averagePrice ? `~${formatPrice(dto.averagePrice)}` : undefined,
        averagePrice: dto.averagePrice,
        formattedUnitPrice: dto.normalizedPrice ? `~${Math.round(dto.normalizedPrice)} ₽/${getUnitBase(dto.quantityUnit)}` : undefined,
        priceStatus: status,
        normalizedPrice: dto.normalizedPrice,
        history: (dto.history || []).map(h => ({
            id: h.id,
            price: h.price,
            date: h.date,
            storeName: h.storeName,
            storeId: h.storeId,
            author: h.author,
            unit: h.unit,
            dateRelative: new Date(h.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
            createdBy: h.createdBy,
            confirmCount:   h.confirmCount ?? 0,
            denyCount:      h.denyCount ?? 0,
            userVote:       h.userVote,
            freshnessScore: h.freshnessScore ?? 0,
            freshnessLabel: buildFreshnessLabel(h)
        }))
    }
}

function buildFreshnessLabel(h: import('../services/CatalogService').ProductHistoryDTO): string {
    const confirmCount = h.confirmCount ?? 0
    const denyCount    = h.denyCount ?? 0
    if (confirmCount === 0 && denyCount === 0) return ''
    const net = confirmCount - denyCount
    const ageHours = (Date.now() - new Date(h.date).getTime()) / 3_600_000
    if (net > 0) {
        if (ageHours < 24) return `✓ подтверждено ${Math.floor(ageHours)} ч. назад`
        return `✓ подтверждено`
    }
    if (net < 0) return `✗ данные оспорены`
    return `± неоднозначно`
}

function formatTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime()
    if (diff < 60000) return 'только что'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`
    return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatPrice(price?: number): string {
    if (price === undefined || price === null) return 'Нет цен'
    return `${price.toLocaleString()} ₽`
}

function formatPriceRange(range?: { min: number; max: number }): string {
    if (!range) return 'Нет цен'
    if (range.min !== range.max) {
        return `${range.min.toLocaleString()} - ${range.max.toLocaleString()} ₽`
    }
    return `${range.min.toLocaleString()} ₽`
}

function getUnitBase(unit?: string): string {
    if (!unit) return 'ед.'
    const u = unit.toLowerCase()
    if (u === 'g' || u === 'г' || u === 'kg' || u === 'кг') return 'кг'
    if (u === 'ml' || u === 'мл' || u === 'l' || u === 'л') return 'л'
    return unit
}
