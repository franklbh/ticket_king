export const SHOW_SLOT_PRICES = {
  weekday: { adult: 25.95, senior: 24.95, child: 21.95, group: 23.95, family: 22.95 },
  weekend: { adult: 27.95, senior: 26.95, child: 23.95, group: 25.95, family: 24.95 },
}

export const GAME_SLOT_PRICES = {
  weekday: { adult: 15.95, child: 12.95, group: 14.95, family: 13.95 },
  weekend: { adult: 16.95, child: 13.95, group: 15.95, family: 14.95 },
}

export const TERRACOTTA_TUESDAY_DISCOUNT_CODE = 'terracotta_tuesday_50'
export const TERRACOTTA_TUESDAY_DISCOUNT_RATE = 0.5

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function parseSessionDate(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date
  if (typeof date !== 'string') return null
  const normalized = date.trim()
  if (!normalized) return null
  const dateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function experienceId(experience) {
  return typeof experience === 'string' ? experience : experience?.id || experience?.show_id || ''
}

export function isTerracottaTuesdayDiscountEligible(experience, date) {
  const sessionDate = parseSessionDate(date)
  return experienceId(experience) === 'terracotta-warriors' && sessionDate?.getDay() === 2
}

export function applyTerracottaTuesdayDiscount(price, experience, date) {
  const numericPrice = Number(price || 0)
  if (!Number.isFinite(numericPrice)) return 0
  return isTerracottaTuesdayDiscountEligible(experience, date)
    ? roundMoney(numericPrice * TERRACOTTA_TUESDAY_DISCOUNT_RATE)
    : numericPrice
}

export function applyTerracottaTuesdayDiscountToPrices(prices, experience, date) {
  if (!isTerracottaTuesdayDiscountEligible(experience, date)) return prices
  return Object.fromEntries(
    Object.entries(prices || {}).map(([key, price]) => [key, applyTerracottaTuesdayDiscount(price, experience, date)]),
  )
}

export function applyCartItemTuesdayDiscount(item) {
  if (!isTerracottaTuesdayDiscountEligible(item, item?.session_date_key || item?.session_date)) return item
  if (item.automatic_discount_code === TERRACOTTA_TUESDAY_DISCOUNT_CODE) return item
  const originalUnitPrice = Number(item.original_unit_price ?? item.unit_price ?? 0)
  const unitPrice = applyTerracottaTuesdayDiscount(originalUnitPrice, item, item.session_date_key || item.session_date)
  return {
    ...item,
    original_unit_price: originalUnitPrice,
    unit_price: unitPrice,
    automatic_discount_code: TERRACOTTA_TUESDAY_DISCOUNT_CODE,
  }
}

export function hasSeniorTicket(experience) {
  return ['terracotta-warriors', 'panda', 'dragon'].includes(experience?.id)
}

export function getSlotPricePeriod(experience, date) {
  if (!(date instanceof Date)) return 'weekday'
  const day = date.getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

export function getExperiencePriceTable(experience) {
  if (experience?.category === 'arcade') return GAME_SLOT_PRICES
  if (experience?.id === 'panda' || experience?.id === 'dragon') return SHOW_SLOT_PRICES
  return {
    weekday: experience?.offPeakPrices || {},
    weekend: experience?.peakPrices || experience?.offPeakPrices || {},
  }
}

export function getPricesForSlot(experience, date) {
  return applyTerracottaTuesdayDiscountToPrices(getBasePricesForSlot(experience, date), experience, date)
}

export function getBasePricesForSlot(experience, date) {
  const period = getSlotPricePeriod(experience, date)
  const table = getExperiencePriceTable(experience)
  return table[period] || table.weekday || {}
}

export function getExperiencePriceFrom(experience) {
  const table = getExperiencePriceTable(experience)
  const values = [...Object.values(table.weekday || {}), ...Object.values(table.weekend || {})]
    .filter((value) => Number.isFinite(Number(value)))
  return values.length ? Math.min(...values.map(Number)) : Number(experience?.priceFrom || 0)
}
