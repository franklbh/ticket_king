const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(date, days) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

export function weekdayName(dateStr) {
  return WEEKDAYS[new Date(`${dateStr}T12:00:00`).getDay()]
}

export function formatDateShort(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()} (${weekdayName(dateStr)})`
}

export function formatDateWithDay(dateStr) {
  return { date: dateStr, day: weekdayName(dateStr) }
}

export function formatTimeRange(start, end) {
  return `${start}-${end}`
}
