import heroImg from '../user_media/cover.jpg'
import galleryImg1 from '../user_media/gallery1.png'
import galleryImg2 from '../user_media/gallery2.png'
import galleryImg3 from '../user_media/gallery3.png'
import galleryImg4 from '../user_media/gallery4.png'
import galleryImg5 from '../user_media/gallery5.png'
import galleryImg6 from '../user_media/gallery6.png'
import galleryImg7 from '../user_media/gallery7.png'
import galleryImg8 from '../user_media/gallery8.png'
import introVideo from '../user_media/Intro_video.mp4'
import commentFeatureImg from '../user_media/comment2.png'
import commenterImg2 from '../user_media/comment_p1.jpg'
import commenterImg3 from '../user_media/comment_p2.jpg'
import mapInstructionPdf from '../user_media/MAP--WE ARE VR.pdf'

export const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export const dateGrid = [
  { day: 1, disabled: true }, { day: 2, disabled: true }, { day: 3, disabled: true },
  { day: 4, disabled: true }, { day: 5, disabled: true }, { day: 6, disabled: true },
  { day: 7, disabled: true },
  { day: 8, price: 37.95, level: 'normal' }, { day: 9, price: 37.95, level: 'normal' },
  { day: 10, price: 37.95, level: 'normal' }, { day: 11, price: 37.95, level: 'normal' },
  { day: 12, price: 37.95, level: 'normal' }, { day: 13, price: 45.95, level: 'peak' },
  { day: 14, price: 45.95, level: 'peak' }, { day: 15, price: 37.95, level: 'normal' },
  { day: 16, price: 37.95, level: 'normal' }, { day: 17, price: 37.95, level: 'normal' },
  { day: 18, price: 37.95, level: 'normal' }, { day: 19, price: 37.95, level: 'normal' },
  { day: 20, price: 45.95, level: 'peak' }, { day: 21, price: 45.95, level: 'peak' },
  { day: 22, price: 37.95, level: 'normal' }, { day: 23, price: 37.95, level: 'normal' },
  { day: 24, price: 37.95, level: 'normal' }, { day: 25, disabled: true },
  { day: 26, price: 45.95, level: 'peak' }, { day: 27, price: 45.95, level: 'peak' },
  { day: 28, price: 45.95, level: 'peak' }, { day: 29, price: 37.95, level: 'normal' },
  { day: 30, price: 37.95, level: 'normal' }, { day: 31, price: 37.95, level: 'normal' },
]

export const ALL_TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
]

export const OFF_PEAK_PRICES = { adult: 37.95, child: 27.95, senior: 34.95, group: 32.95, family: 31.95 }
export const PEAK_PRICES     = { adult: 45.95, child: 34.95, senior: 41.95, group: 40.95, family: 39.95 }

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

export const galleryImages = [galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6, galleryImg7, galleryImg8]

export const testimonials = [
  { quote: 'I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking. Truly one of the best VR experiences I\'ve ever tried!', name: 'Emily', rating: 5, img: commenterImg2 },
  { quote: 'The experience transported me straight into ancient China. It\'s amazing how real everything felt, from the sounds to the lighting. Perfect blend of history and technology — highly recommended!', name: 'Michael', rating: 5, img: commenterImg3 },
]

export const newsItems = [
  { title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond', body: 'Visitors to a virtual reality historical tour in Richmond can "walk" through corridors made of stone and brick in the underground palace of the Qin Dynasty to see the world-renowned Terracotta Warriors.', link: 'https://www.richmond-news.com/local-news/virtual-reality-tour-historic-terracotta-warriors-richmond-bc-11506120' },
  { title: '"Terracotta Warriors: Secrets Of The First Emperor\'s Mausoleum" Wins First Prize At The 2025 \'Yuanmeng Shanhai\' Second China Virtual Reality Innovation Competition', body: '"Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum" won First Prize at the 2025 \'Yuanmeng Shanhai\' China Virtual Reality Innovation Competition, showcasing China\'s latest XR achievements in cultural and technological innovation.', link: 'https://mp.weixin.qq.com/s/hRm4bngXABJ7W3fWNAcjDg' },
]

export const qrPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#fff"/><rect x="16" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="224" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="16" y="224" width="80" height="80" fill="#0b0b0b"/><rect x="96" y="96" width="128" height="128" fill="#0b0b0b"/><rect x="128" y="128" width="64" height="64" fill="#fff"/></svg>`)

export { heroImg, introVideo, commentFeatureImg, mapInstructionPdf }
