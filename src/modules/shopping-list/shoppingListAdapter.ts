// src/modules/shopping-list/shoppingListAdapter.ts

export interface ShoppingListDto {
    id: string
    user_id: string
    product_id?: string
    text: string
    is_checked: boolean
    price?: number
    quantity?: number
    unit?: string
    created_at: string
}

export interface ShoppingListModel {
    id: string
    userId: string
    productId?: string
    text: string
    isChecked: boolean
    price?: number
    estimatedPrice?: number // New field for predictive budgeting
    quantity?: number
    unit?: string
    createdAt: Date
}

export function shoppingListDtoToModel(dto: any): ShoppingListModel {
    return {
        id: dto.id,
        userId: dto.user_id,
        productId: dto.product_id,
        text: dto.text,
        isChecked: dto.is_checked,
        price: dto.price,
        estimatedPrice: dto.estimated_price, // Added mapping
        quantity: dto.quantity,
        unit: dto.unit,
        createdAt: new Date(dto.created_at)
    }
}

export function shoppingListModelToDto(model: ShoppingListModel): ShoppingListDto {
    return {
        id: model.id,
        user_id: model.userId,
        product_id: model.productId,
        text: model.text,
        is_checked: model.isChecked,
        price: model.price,
        quantity: model.quantity,
        unit: model.unit,
        created_at: model.createdAt.toISOString()
    }
}
