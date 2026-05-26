export const SHOW_SLOT_PRICES = {
  weekday: { adult: 25.95, child: 21.95, group: 23.95, family: 22.95 },
  weekend: { adult: 27.95, child: 23.95, group: 25.95, family: 24.95 },
}

export const GAME_SLOT_PRICES = {
  weekday: { adult: 15.95, child: 12.95, group: 14.95, family: 13.95 },
  weekend: { adult: 16.95, child: 13.95, group: 15.95, family: 14.95 },
}

export function hasSeniorTicket(experience) {
  return experience?.id === 'terracotta-warriors'
}

export function getSlotPricePeriod(experience, date) {
  if (!(date instanceof Date)) return 'weekday'
  const day = date.getDay()
  if (experience?.id === 'terracotta-warriors') {
    return day === 0 || day === 6 ? 'weekend' : 'weekday'
  }
  if (experience?.id === 'panda' || experience?.id === 'dragon' || experience?.category === 'arcade') {
    return day === 5 || day === 6 ? 'weekend' : 'weekday'
  }
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
