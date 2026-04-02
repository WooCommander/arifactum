import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { CurrencyService } from '@/modules/catalog/services/CurrencyService'

export function usePriceFormat() {
    const { currentCurrency } = catalogStore

    const formatPrice = (val: number): string => {
        const currency = currentCurrency.value
        return CurrencyService.format(CurrencyService.convert(val, 'RUB', currency), currency)
    }

    return { formatPrice }
}
