export type CurrencyCode = 'RUB' | 'USD' | 'EUR'

export interface ExchangeRates {
  USD: number
  EUR: number
}

class CurrencyService {
  // Rates: how many RUB per 1 unit of currency
  private usdRate = 92.5
  private eurRate = 100.2

  getRates(): ExchangeRates {
    return { USD: this.usdRate, EUR: this.eurRate }
  }

  setRates(usd: number, eur: number) {
    if (usd > 0) this.usdRate = usd
    if (eur > 0) this.eurRate = eur
  }

  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount
    // Convert to RUB first
    const rub = from === 'RUB' ? amount
      : from === 'USD' ? amount * this.usdRate
      : amount * this.eurRate
    // Convert from RUB to target
    if (to === 'RUB') return rub
    if (to === 'USD') return rub / this.usdRate
    return rub / this.eurRate
  }

  format(amount: number, code: CurrencyCode): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'RUB' ? 0 : 2
    }).format(amount)
  }
}

export const instance = new CurrencyService()
export { instance as CurrencyService }
