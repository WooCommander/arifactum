import { ref, readonly } from 'vue'

const EXCHANGE_RATE_KEY = 'fp_exchange_rate'
const DEFAULT_RATE = 16.35

const savedRate = localStorage.getItem(EXCHANGE_RATE_KEY)
const exchangeRate = ref<number>(savedRate ? Number(savedRate) : DEFAULT_RATE)

export const settingsStore = {
    exchangeRate: readonly(exchangeRate),

    setExchangeRate(rate: number) {
        if (rate <= 0) return
        exchangeRate.value = rate
        localStorage.setItem(EXCHANGE_RATE_KEY, String(rate))
    },

    reset() {
        exchangeRate.value = DEFAULT_RATE
        localStorage.removeItem(EXCHANGE_RATE_KEY)
    }
}
