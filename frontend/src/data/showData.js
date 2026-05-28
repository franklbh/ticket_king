import mapInstructionPdf from '../picture/MAP--WE ARE VR.pdf'

export const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

function parseSlotHour(timeStr) {
  const [time, period] = timeStr.split(' ')
  let h = parseInt(time)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h
}

export function isDateTimePeak(date, timeStr) {
  const dow = date.getDay() // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true
  if (dow === 5) return parseSlotHour(timeStr) >= 14 // Fri 14:00+
  return false
}

export const ticketTypes = [
  { id: 'adult' },
  { id: 'child' },
  { id: 'senior' },
  { id: 'group' },
  { id: 'family' },
]

export const newsItems = [
  { title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond', body: 'Visitors to a virtual reality historical tour in Richmond can "walk" through corridors made of stone and brick in the underground palace of the Qin Dynasty to see the world-renowned Terracotta Warriors.', link: 'https://www.richmond-news.com/local-news/virtual-reality-tour-historic-terracotta-warriors-richmond-bc-11506120' },
  { title: '"Terracotta Warriors: Secrets Of The First Emperor\'s Mausoleum" Wins First Prize At The 2025 \'Yuanmeng Shanhai\' Second China Virtual Reality Innovation Competition', body: '"Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum" won First Prize at the 2025 \'Yuanmeng Shanhai\' China Virtual Reality Innovation Competition, showcasing China\'s latest XR achievements in cultural and technological innovation.', link: 'https://mp.weixin.qq.com/s/hRm4bngXABJ7W3fWNAcjDg' },
]

export const qrPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#fff"/><rect x="16" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="224" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="16" y="224" width="80" height="80" fill="#0b0b0b"/><rect x="96" y="96" width="128" height="128" fill="#0b0b0b"/><rect x="128" y="128" width="64" height="64" fill="#fff"/></svg>`)

export { mapInstructionPdf }
