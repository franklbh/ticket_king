export const BUSINESS_TIME_ZONE = 'America/Vancouver'

function businessDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

export function businessTodayDate() {
  const { year, month, day } = businessDateParts()
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function businessCurrentMonthStart() {
  const today = businessTodayDate()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

export function isoDate(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
