const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const ADMIN_TIME_ZONE = 'America/Vancouver'

function adminDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

export function todayIso() {
  const { year, month, day } = adminDateParts()
  return `${year}-${month}-${day}`
}

export function currentAdminMinutes() {
  const { hour, minute } = adminDateParts()
  return Number(hour) * 60 + Number(minute)
}

export function minutesFromTime(value) {
  const [hours = '0', minutes = '0'] = String(value || '').slice(0, 5).split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function latestSlotStartForDate(dateStr) {
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return day === 5 || day === 6 ? '20:00' : '19:00'
}

export function isSlotStartWithinBusinessPolicy(dateStr, startTime) {
  const start = minutesFromTime(startTime)
  return start >= minutesFromTime('10:00') && start <= minutesFromTime(latestSlotStartForDate(dateStr))
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
