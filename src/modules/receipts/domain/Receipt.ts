export interface ReceiptItem {
    id: string
    receipt_id: string
    product_id: string
    product_name: string
    price: number
    quantity: number
    quantity_unit: string
    total_item_price: number
    created_at?: string
}

export interface Receipt {
    id: string
    user_id: string
    store_name: string
    total_amount: number
    purchase_date: string
    created_at?: string
    items?: ReceiptItem[]
}

export interface AddReceiptItemDTO {
    product_id: string
    product_name: string
    price: number
    quantity: number
    quantity_unit: string
}

export interface AddReceiptDTO {
    store_name: string
    purchase_date: string
    total_amount: number
    items: AddReceiptItemDTO[]
}
