import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

import heroImg from './user_media/cover.jpg'
import galleryImg1 from './user_media/gallery1.png'
import galleryImg2 from './user_media/gallery2.png'
import galleryImg3 from './user_media/gallery3.png'
import galleryImg4 from './user_media/gallery4.png'
import galleryImg5 from './user_media/gallery5.png'
import galleryImg6 from './user_media/gallery6.png'
import galleryImg7 from './user_media/gallery7.png'
import galleryImg8 from './user_media/gallery8.png'
import introVideo from './user_media/Intro_video.mp4'
import commentFeatureImg from './user_media/comment2.png'
import commenterImg2 from './user_media/comment_p1.jpg'
import commenterImg3 from './user_media/comment_p2.jpg'
import mapInstructionPdf from './user_media/MAP--WE ARE VR.pdf'
import logoWhite from './user_media/logo_white.png'

// Fix Leaflet's broken default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VENUE_COORDS = [49.1754267, -123.1324168]
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Terracotta+Warriors+VR--We+Are+VR/@49.1754267,-123.1349917,1220m/data=!3m2!1e3!4b1!4m6!3m5!1s0x5486751de09f7601:0x2cc78f091846bb35!8m2!3d49.1754267!4d-123.1324168!16s%2Fg%2F11y0s7b4zn?entry=ttu&g_ep=EgoyMDI2MDUxMS4wIKXMDSoASAFQAw%3D%3D'

const USERS_KEY = 'ticket_king_local_users'
const SESSION_KEY = 'ticket_king_local_session'
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
]

const dateGrid = [
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

const timeSlots = [
  { time: '10:00 AM', price: 37.95 }, { time: '10:30 AM', price: 37.95 },
  { time: '11:00 AM', price: 37.95 }, { time: '11:30 AM', price: 37.95 },
  { time: '12:00 PM', price: 37.95 }, { time: '12:30 PM', price: 37.95 },
  { time: '1:00 PM', price: 37.95 }, { time: '1:30 PM', price: 37.95 },
  { time: '2:00 PM', price: 37.95 }, { time: '2:30 PM', price: 37.95 },
  { time: '3:00 PM', price: 43.95 }, { time: '3:30 PM', price: 43.95 },
  { time: '4:00 PM', price: 43.95 }, { time: '4:30 PM', price: 43.95 },
  { time: '5:00 PM', price: 43.95 },
]

const ticketTypes = [
  { id: 'regular', label: 'Regular', description: '$37.95/each', price: 37.95 },
  { id: 'child', label: 'Child (7-15)', description: '$27.95/each', price: 27.95, info: 'Children under 7 years old are not permitted. Children aged 7 to 14 years must be accompanied by an adult.' },
  { id: 'senior', label: 'Senior (65+)', description: '$34.95/each', price: 34.95 },
  { id: 'family', label: 'Family Bundle (max. 2 adults)', description: '$31.95/each', price: 31.95, info: 'Ticket for min. 3 people, max. 2 adults.' },
  { id: 'group', label: 'Group Ticket (min. 6 people)', description: '$33.95/each', price: 33.95, info: 'Ticket for min. 6 people.' },
]

const ticketPricing = [
  { label: 'Regular', desc: 'Standard entry for one person', price: 'Starts from $37.95/each' },
  { label: 'Child (7-15)', desc: 'Must be accompanied by an adult', price: 'Starts from $27.95/each' },
  { label: 'Senior (65+)', desc: 'Ticket for seniors 65+', price: 'Starts from $34.95/each' },
  { label: 'Family Bundle', desc: 'Ticket for min. 3 people, max. 2 adults', price: 'Starts from $31.95/each' },
  { label: 'Group Ticket', desc: 'Ticket for min. 6 people', price: 'Starts from $33.95/each' },
]

const faqItems = [
  { q: 'If I wear glasses, can I still attend?', a: 'Yes — our VR headset is designed so that you can usually wear your corrective or reading glasses inside the device comfortably.' },
  { q: 'Can children attend?', a: 'Children aged 7–15 are welcome with a child ticket and must be accompanied by a paying adult at all times during the experience.' },
  { q: 'Can I buy tickets on-site?', a: 'We recommend booking online in advance to secure your preferred time slot, as sessions have limited capacity. Limited walk-in availability may exist.' },
  { q: 'Can I refund or exchange my ticket?', a: 'Tickets are non-refundable. Date and time exchanges are available up to 24 hours before your scheduled session, subject to availability.' },
  { q: 'What if I miss my scheduled time slot?', a: 'Please arrive at least 10 minutes before your session. Late arrivals may not be accommodated, and tickets cannot be transferred for missed time slots.' },
  { q: 'Can I pay by credit card, WeChat, or Alipay?', a: 'Yes, we accept Visa, Mastercard, WeChat Pay, Alipay, and Apple Pay at checkout.' },
]

const galleryImages = [galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6, galleryImg7, galleryImg8]

const testimonials = [
  { quote: 'I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking. Truly one of the best VR experiences I\'ve ever tried!', name: 'Emily', rating: 5, img: commenterImg2 },
  { quote: 'The experience transported me straight into ancient China. It\'s amazing how real everything felt, from the sounds to the lighting. Perfect blend of history and technology — highly recommended!', name: 'Michael', rating: 5, img: commenterImg3 },
]

const newsItems = [
  { title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond', body: 'Visitors to a virtual reality historical tour in Richmond can "walk" through corridors made of stone and brick in the underground palace of the Qin Dynasty to see the world-renowned Terracotta Warriors.', link: 'https://www.richmond-news.com/local-news/virtual-reality-tour-historic-terracotta-warriors-richmond-bc-11506120' },
  { title: '"Terracotta Warriors: Secrets Of The First Emperor\'s Mausoleum" Wins First Prize At The 2025 \'Yuanmeng Shanhai\' Second China Virtual Reality Innovation Competition', body: '"Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum" won First Prize at the 2025 \'Yuanmeng Shanhai\' China Virtual Reality Innovation Competition, showcasing China\'s latest XR achievements in cultural and technological innovation.', link: 'https://mp.weixin.qq.com/s/hRm4bngXABJ7W3fWNAcjDg' },
]

const qrPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#fff"/><rect x="16" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="224" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="16" y="224" width="80" height="80" fill="#0b0b0b"/><rect x="96" y="96" width="128" height="128" fill="#0b0b0b"/><rect x="128" y="128" width="64" height="64" fill="#fff"/></svg>`)

const loadUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] } }
const saveUsers = (users) => { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }
const normalize = (value) => value.trim().toLowerCase()
const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
const fullDateLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const isSameMonth = (date, year, month) => date.getFullYear() === year && date.getMonth() === month
const normalizePhone = (value) => value.replace(/[^\d]/g, '')
const isReasonableName = (value) => {
  const trimmed = value.trim()
  return /^[\p{L}][\p{L}' -]{1,49}$/u.test(trimmed) && !/[' -]{2,}/.test(trimmed)
}
const isReasonablePhone = (value) => {
  if (!value.trim()) return true
  const digits = normalizePhone(value)
  return digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits)
}

const isStrictEmail = (email) => {
  const value = email.trim()
  if (!emailPattern.test(value)) return false
  const [local, domain] = value.split('@')
  if (!local || !domain) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return domain.split('.').every((part) => part && !part.startsWith('-') && !part.endsWith('-'))
}

const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const badge = (type) => (type === 'peak' ? 'peak' : type === 'normal' ? 'normal' : 'muted')
const currency = (val) => `$${val.toFixed(2)}`

// Rust-colored custom Leaflet marker
const rustIcon = new L.DivIcon({
  html: `<div style="width:18px;height:24px;position:relative"><div style="width:18px;height:18px;background:#7d2c21;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div></div>`,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  popupAnchor: [0, -26],
  className: '',
})

// ── Brand Logo ───────────────────────────────────────────────────────────
function BrandLogo({ height = 40 }) {
  return (
    <img src={logoWhite} alt="WE ARE VR" style={{ height, width: 'auto', display: 'block' }} />
  )
}

// ── Map Modal ────────────────────────────────────────────────────────────
function MapModal({ onClose }) {
  const markerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => markerRef.current?.openPopup(), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="map-modal-close" onClick={onClose} type="button" aria-label="Close map">✕</button>
        <MapContainer center={VENUE_COORDS} zoom={16} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Marker position={VENUE_COORDS} icon={rustIcon} ref={markerRef}>
            <Popup closeButton={true} autoPan={true}>
              <div className="map-popup">
                <div className="map-popup-title">WE ARE VR</div>
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="map-popup-addr">
                  Unit 210<br />5300 Number 3 Rd,<br />Richmond, BC
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}

// ── Nav Menu Overlay ─────────────────────────────────────────────────────
function NavMenu({ onClose, onBuyTicket, onNavigateToSection }) {
  const scrollTo = (id) => {
    onClose()
    if (onNavigateToSection) {
      onNavigateToSection(id)
      return
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="nav-menu-overlay">
      <button className="nav-menu-close" onClick={onClose} type="button" aria-label="Close menu">✕</button>
      <div className="nav-menu-inner">
        <div className="nav-menu-brand">WE ARE VR</div>
        <nav className="nav-menu-links">
          <button className="nav-menu-item" onClick={() => scrollTo('intro')} type="button">Introduce</button>
          <button className="nav-menu-item" onClick={() => scrollTo('gallery')} type="button">Gallery</button>
          <button className="nav-menu-item" onClick={() => scrollTo('tickets')} type="button">Ticket</button>
          <button className="nav-menu-item" onClick={() => scrollTo('faq')} type="button">FAQ</button>
          <button className="nav-menu-item" onClick={() => scrollTo('contact')} type="button">Contact &amp; Location</button>
        </nav>
        <button
          className="nav-menu-buy-btn"
          onClick={() => { onClose(); onBuyTicket() }}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
          BUY TICKET
        </button>
        <div className="nav-menu-socials">
          <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="nav-social" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
          <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="nav-social" aria-label="Instagram"><i className="fab fa-instagram" /></a>
          <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="nav-social nav-social-text" aria-label="Xiaohongshu">小红书</a>
          <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="nav-social" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
          <a href="mailto:info@vrvr.show" className="nav-social" aria-label="Email"><i className="far fa-envelope" /></a>
          <a href="tel:+17788054699" className="nav-social" aria-label="Phone"><i className="fas fa-phone-alt" /></a>
        </div>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────
function App() {
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const [langOpen, setLangOpen] = useState(false)
  const [view, setView] = useState('main')
  const [authMode, setAuthMode] = useState('login')
  const [users, setUsers] = useState(() => loadUsers())
  const [session, setSession] = useState(() => readSession())
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({ name: '', email: '', username: '', password: '' })
  const [showBooking, setShowBooking] = useState(false)
  const [step, setStep] = useState('date')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2025, 11, 1))
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [counts, setCounts] = useState(() => ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
  const [vipQty, setVipQty] = useState(0)
  const [vipModal, setVipModal] = useState(false)
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '', optIn: false })
  const [contactTouched, setContactTouched] = useState({})
  const [timeLeft, setTimeLeft] = useState(300)
  const [showQr, setShowQr] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const bookingRef = useRef(null)

  const currentUser = useMemo(() => {
    if (!session) return null
    return users.find((u) => u.id === session.userId) || null
  }, [session, users])

  const totals = useMemo(() => {
    const ticketTotal = ticketTypes.reduce((sum, t) => sum + counts[t.id] * t.price, 0)
    const vipTotal = vipQty * 20
    const subtotal = ticketTotal + vipTotal
    const fees = subtotal > 0 ? Math.max(2.5, subtotal * 0.139) : 0
    return { ticketTotal, vipTotal, subtotal, fees, grand: subtotal + fees }
  }, [counts, vipQty])

  const contactErrors = useMemo(() => {
    const errors = {}
    if (!isReasonableName(contact.first)) errors.first = 'Enter a valid first name using letters, spaces, hyphens, or apostrophes.'
    if (!isReasonableName(contact.last)) errors.last = 'Enter a valid last name using letters, spaces, hyphens, or apostrophes.'
    if (!isStrictEmail(contact.email)) errors.email = 'Enter a valid email address, such as name@example.com.'
    if (!isReasonablePhone(contact.phone)) errors.phone = 'Enter a valid phone number with 10 to 15 digits, or leave it blank.'
    return errors
  }, [contact])

  const visibleDateGrid = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = new Date(year, month, 1).getDay()
    const specialDates = year === 2025 && month === 11 ? new Map(dateGrid.map((item) => [item.day, item])) : null
    const dates = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1
      const date = new Date(year, month, day)
      const special = specialDates?.get(day)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const price = special?.price ?? (isWeekend ? 45.95 : 37.95)
      const disabled = special?.disabled ?? false
      return {
        day,
        date,
        key: `${year}-${month}-${day}`,
        disabled,
        price: disabled ? undefined : price,
        level: disabled ? undefined : (special?.level ?? (isWeekend ? 'peak' : 'normal')),
      }
    })

    return [
      ...Array.from({ length: leadingBlanks }, (_, idx) => ({ key: `blank-${year}-${month}-${idx}`, blank: true })),
      ...dates,
    ]
  }, [calendarMonth])

  useEffect(() => {
    if (step !== 'payment') return undefined
    setTimeLeft(300)
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    const onScroll = () => {
      const top = document.documentElement.scrollTop || document.body.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      setScrollProgress(height > 0 ? (top / height) * 100 : 0)
      setShowBackTop(top > 300)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const revealTargets = document.querySelectorAll([
      '.intro-section',
      '.section-heading',
      '.gallery-card',
      '.ticket-pricing-row',
      '.faq-item',
      '.reviews-top',
      '.review-photo-cell',
      '.review-card',
      '.news-item',
      '.panel',
      '.header-card',
    ].join(','))

    if (!revealTargets.length) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }

    revealTargets.forEach((el, idx) => {
      el.classList.add('motion-reveal')
      el.style.setProperty('--reveal-delay', `${Math.min((idx % 8) * 55, 330)}ms`)
    })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })

    revealTargets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [view, showBooking])

  const resetAuthForm = () => { setAuthForm({ name: '', email: '', username: '', password: '' }); setAuthMessage('') }

  const openAuth = (mode) => {
    setAuthMode(mode); resetAuthForm(); setShowBooking(false); setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createSession = (user) => {
    const s = { userId: user.id, username: user.username, createdAt: new Date().toISOString() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s); setView('main')
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    const name = authForm.name.trim(), username = normalize(authForm.username)
    const email = normalize(authForm.email), password = authForm.password
    if (name.length < 2) { setAuthMessage('Please enter your full name.'); return }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { setAuthMessage('Username: 3–24 lowercase letters, numbers, or underscores.'); return }
    if (!isStrictEmail(email)) { setAuthMessage('Please enter a valid email address.'); return }
    if (password.length < 8) { setAuthMessage('Password must be at least 8 characters.'); return }
    if (users.some((u) => u.username === username)) { setAuthMessage('That username is already taken.'); return }
    if (users.some((u) => u.email === email)) { setAuthMessage('That email is already registered.'); return }
    const user = { id: crypto.randomUUID(), name, username, email, passwordHash: await hashPassword(password), emailVerified: false, role: 'Operator', createdAt: new Date().toISOString() }
    const next = [...users, user]; saveUsers(next); setUsers(next); createSession(user)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const ue = normalize(authForm.username), ph = await hashPassword(authForm.password)
    const user = users.find((u) => u.username === ue || u.email === ue)
    if (!user || user.passwordHash !== ph) { setAuthMessage('Username or password is incorrect.'); return }
    createSession(user)
  }

  const logout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); setView('main') }

  const revealBooking = () => {
    setView('main'); setShowBooking(true); setStep('date')
    if (!selectedDate) setCalendarMonth(new Date(2025, 11, 1))
    requestAnimationFrame(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const backToMain = () => { setShowBooking(false); setView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const restartBooking = () => {
    setStep('date')
    setSelectedDate(null)
    setSelectedTime(null)
    setVipQty(0)
    setTimeLeft(300)
    setCalendarMonth(new Date(2025, 11, 1))
  }

  const changeCount = (id, delta) => setCounts((p) => ({ ...p, [id]: Math.max(0, p[id] + delta) }))
  const changeCalendarMonth = (delta) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }
  const markContactTouched = (field) => setContactTouched((prev) => ({ ...prev, [field]: true }))
  const updateContact = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }))
  }
  const applyCoupon = () => {
    const code = couponCode.trim()
    setCouponMessage(code ? `Code "${code}" is not available for this preview checkout.` : 'Enter a coupon code first.')
  }
  const cancelQrPayment = () => {
    if (window.confirm('Are you sure you want to cancel the payment?')) {
      setShowQr(null)
    }
  }
  const submitNewsletter = () => {
    setNewsletterMessage(isStrictEmail(newsletterEmail) ? 'Thanks, your email has been saved for this preview.' : 'Please enter a valid email address.')
  }
  const navigateToMainSection = (id) => {
    setView('main')
    setShowBooking(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const canProceedDate = Boolean(selectedDate)
  const canProceedTime = Boolean(selectedTime)
  const ticketErrors = {
    family: counts.family > 0 && counts.family < 3 ? 'Family bundle requires at least 3 people.' : '',
    group: counts.group > 0 && counts.group < 6 ? 'Group ticket requires at least 6 people.' : '',
  }
  const hasTicketErrors = Object.values(ticketErrors).some(Boolean)
  const canProceedTickets = totals.subtotal > 0 && !hasTicketErrors
  const canProceedContact = Object.keys(contactErrors).length === 0
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const paymentExpired = step === 'payment' && timeLeft === 0
  const bookingSteps = [
    { id: 'date', label: 'Date' },
    { id: 'time', label: 'Time' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'contact', label: 'Contact' },
    { id: 'payment', label: 'Payment' },
  ]
  const currentStepIndex = bookingSteps.findIndex((item) => item.id === step)

  const startStripeCheckout = async () => {
    if (paymentExpired) return
    try {
      setStripeLoading(true)
      const apiBase = import.meta.env.VITE_API_BASE || ''
      const res = await fetch(`${apiBase}/api/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Math.max(1, counts.regular || 1), showName: 'Terracotta Warriors VR', date: selectedDate ? fullDateLabel(selectedDate.date) : 'TBD', time: selectedTime?.time || 'TBD' }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err); alert('Unable to start checkout. Please try again.')
    } finally { setStripeLoading(false) }
  }

  const renderLangSelect = () => (
    <div className="lang">
      <button className="lang-toggle" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen} type="button">
        <span className="lang-icon"><span className="lang-a">A</span><span className="lang-translate">文</span></span>
        <span className="lang-down">▾</span>
      </button>
      {langOpen && (
        <div className="lang-menu">
          {languages.map((l) => (
            <button className={`lang-option ${l.code === selectedLang.code ? 'active' : ''}`} onClick={() => { setSelectedLang(l); setLangOpen(false) }} key={l.code} type="button">
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const headerCards = (
    <div className="header-cards">
      <div className={`header-card ${step === 'date' ? 'active' : ''} ${selectedDate ? 'complete' : ''}`}>
        <div className="header-icon">📅</div>
        <div className="header-meta">
          <div className="meta-label">Selected date</div>
          <div className="meta-value">{selectedDate ? fullDateLabel(selectedDate.date) : 'Choose a date'}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('date')} disabled={step === 'date'} type="button">
          {step === 'date' ? 'Current' : 'Edit'}
        </button>
      </div>
      <div className={`header-card ${step === 'time' ? 'active' : ''} ${selectedTime ? 'complete' : ''}`}>
        <div className="header-icon">🕐</div>
        <div className="header-meta">
          <div className="meta-label">Selected time</div>
          <div className="meta-value">{selectedTime ? selectedTime.time : 'Choose a time'}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('time')} disabled={!selectedDate || step === 'time'} type="button">
          {step === 'time' ? 'Current' : 'Edit'}
        </button>
      </div>
    </div>
  )

  const renderDate = () => (
    <div className="panel payment-panel">
      <div className="panel-title"><div className="title-accent" /><h3>Select Date</h3></div>
      <div className="month-bar">
        <button className="nav-arrow" onClick={() => changeCalendarMonth(-1)} type="button" aria-label="Previous month">{'<'}</button>
        <div className="month-label">{monthLabel(calendarMonth)}</div>
        <button className="nav-arrow" onClick={() => changeCalendarMonth(1)} type="button" aria-label="Next month">{'>'}</button>
      </div>
      <div className="calendar">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div className="dow" key={d}>{d}</div>)}
        {visibleDateGrid.map((d) => (
          d.blank ? (
            <span key={d.key} className="day day-blank" aria-hidden="true" />
          ) : (
            <button
              key={d.key}
              className={`day ${d.disabled ? 'disabled' : ''} ${selectedDate?.key === d.key ? 'selected' : ''} ${badge(d.level)}`}
              disabled={d.disabled}
              onClick={() => setSelectedDate(d)}
              type="button"
              aria-pressed={selectedDate?.key === d.key}
              aria-label={d.price ? `Select ${fullDateLabel(d.date)}, ${currency(d.price)}` : `${fullDateLabel(d.date)} unavailable`}
            >
              <span className="day-number">{d.day}</span>
              <span className="day-price">{d.price ? currency(d.price) : '-'}</span>
            </button>
          )
        ))}
      </div>
      <div className="actions"><button className="primary" disabled={!canProceedDate} onClick={() => setStep('time')} type="button">Next</button></div>
    </div>
  )

  const renderTime = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>Select Time</h3></div>
      <div className="time-hint">Choose a start time; each event lasts about 45 minutes.</div>
      <div className="slot-grid">
        {timeSlots.map((slot) => (
          <button key={slot.time} className={`slot ${selectedTime?.time === slot.time ? 'selected' : ''} ${slot.price > 40 ? 'peak' : ''}`} onClick={() => setSelectedTime(slot)} type="button">
            <span className="slot-time">{slot.time}</span>
            <span className="slot-price">{currency(slot.price)}</span>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('date')} type="button">Back</button>
        <button className="primary" disabled={!canProceedTime} onClick={() => setStep('tickets')} type="button">Next</button>
      </div>
    </div>
  )

  const renderTickets = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>Select Tickets</h3></div>
      <div className="ticket-list">
        {ticketTypes.map((t) => (
          <div key={t.id} className={`ticket-row ${ticketErrors[t.id] ? 'ticket-row-error' : ''}`}>
            <div className="ticket-info">
              <div className="ticket-title-row">
                <div className="ticket-title">{t.label}</div>
                {t.info && (
                  <span className="ticket-info-popover">
                    <button className="ticket-info-badge" type="button" aria-label={`${t.label} information`}>i</button>
                    <span className="ticket-info-tooltip" role="tooltip">{t.info}</span>
                  </span>
                )}
              </div>
              <div className="ticket-desc">{t.description}</div>
              {ticketErrors[t.id] && <div className="ticket-error">{ticketErrors[t.id]}</div>}
            </div>
            <div className="ticket-actions">
              <div className="counter">
                <button onClick={() => changeCount(t.id, -1)} disabled={counts[t.id] === 0} type="button">-</button>
                <div className="counter-value">{counts[t.id]}</div>
                <button onClick={() => changeCount(t.id, 1)} type="button">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="summary-row"><div>Total Amount</div><div className="summary-val">{currency(totals.ticketTotal)}</div></div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('time')} type="button">Back</button>
        <button className="primary" disabled={!canProceedTickets} onClick={() => setVipModal(true)} type="button">Next</button>
      </div>
    </div>
  )

  const renderContact = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>Contact Details</h3></div>
      <div className="form-grid">
        <label className={contactTouched.first && contactErrors.first ? 'field-invalid' : ''}>
          <span>First name</span>
          <input type="text" placeholder="Your first name" value={contact.first} onBlur={() => markContactTouched('first')} onChange={(e) => updateContact('first', e.target.value)} autoComplete="given-name" />
          {contactTouched.first && contactErrors.first && <small className="field-error">{contactErrors.first}</small>}
        </label>
        <label className={contactTouched.last && contactErrors.last ? 'field-invalid' : ''}>
          <span>Last name</span>
          <input type="text" placeholder="Your last name" value={contact.last} onBlur={() => markContactTouched('last')} onChange={(e) => updateContact('last', e.target.value)} autoComplete="family-name" />
          {contactTouched.last && contactErrors.last && <small className="field-error">{contactErrors.last}</small>}
        </label>
        <label className={contactTouched.email && contactErrors.email ? 'field-invalid' : ''}>
          <span>Email</span>
          <input type="email" placeholder="name@example.com" value={contact.email} onBlur={() => markContactTouched('email')} onChange={(e) => updateContact('email', e.target.value)} autoComplete="email" />
          {contactTouched.email && contactErrors.email ? <small className="field-error">{contactErrors.email}</small> : <small>Your tickets will be sent to this email.</small>}
        </label>
        <label className={contactTouched.phone && contactErrors.phone ? 'field-invalid' : ''}>
          <span>Phone (optional)</span>
          <input type="tel" placeholder="e.g. (778) 123-4567" value={contact.phone} onBlur={() => markContactTouched('phone')} onChange={(e) => updateContact('phone', e.target.value)} autoComplete="tel" />
          {contactTouched.phone && contactErrors.phone && <small className="field-error">{contactErrors.phone}</small>}
        </label>
        <label className="checkbox"><input type="checkbox" checked={contact.optIn} onChange={(e) => setContact({ ...contact, optIn: e.target.checked })} /><span>I agree to receive updates and special offers.</span></label>
      </div>
      <p className="policy-copy">By continuing you agree to the Privacy Policy and Terms and Conditions.</p>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('tickets')} type="button">Back</button>
        <button className="primary" disabled={!canProceedContact} onClick={() => setStep('payment')} type="button">Continue to Payment</button>
      </div>
    </div>
  )

  const renderPayment = () => (
    <div className="panel payment-panel">
      {paymentExpired ? (
        <div className="payment-expired-card">
          <div className="payment-expired-message"><span aria-hidden="true">⚠️</span><p>Your reservation hold expired. Please start over to pick a new date and time.</p></div>
          <button className="payment-start-over" onClick={restartBooking} type="button">Start over</button>
        </div>
      ) : (
        <>
          <div className="timer-banner">Complete payment within <strong>{minutes}:{seconds}</strong> to secure your reservation.</div>
          <div className="panel-title"><div className="title-accent" /><h3>Order Summary</h3></div>
          <div className="order-block">
            <div className="order-date"><div className="order-label">{selectedDate ? fullDateLabel(selectedDate.date) : 'Date TBD'} · {selectedTime?.time}</div><div className="order-sub">Duration approx. 45 minutes</div></div>
            <div className="line-items">
              {ticketTypes.map((t) => counts[t.id] > 0 && (
                <div key={t.id} className="line"><div><div className="line-label">{t.label}</div><div className="line-price">{currency(t.price)}</div></div><div className="line-qty">×{counts[t.id]}</div></div>
              ))}
              {vipQty > 0 && <div className="line"><div><div className="line-label">VIP Upgrade</div><div className="line-price">+$20.00/each</div></div><div className="line-qty">×{vipQty}</div></div>}
            </div>
            <div className="totals">
              <div className="totals-row"><span>Subtotal</span><span>{currency(totals.subtotal)}</span></div>
              <div className="totals-row"><span>Fees &amp; taxes</span><span>{currency(totals.fees)}</span></div>
              <div className="totals-row due"><span>Total due</span><span>{currency(totals.grand)}</span></div>
            </div>
            <div className="warning">⚠️ Tickets are non-refundable and valid only on the event date.</div>
          </div>
          <div className="coupon-row">
            <input type="text" placeholder="Coupon code" value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponMessage('') }} />
            <button className="coupon-btn" onClick={applyCoupon} type="button">Apply</button>
          </div>
          {couponMessage && <div className="coupon-message">{couponMessage}</div>}
          <div className="contact-summary">
            <div className="contact-head"><div>Contact details</div><button className="link-btn" onClick={() => setStep('contact')} type="button">Edit</button></div>
            <div className="contact-cols">
              <div><div className="label">First name</div><div className="value">{contact.first || '—'}</div></div>
              <div><div className="label">Last name</div><div className="value">{contact.last || '—'}</div></div>
              <div><div className="label">Email</div><div className="value">{contact.email || '—'}</div></div>
              <div><div className="label">Phone</div><div className="value">{contact.phone || '—'}</div></div>
            </div>
          </div>
          <div className="pay-options">
            <button className="pay-btn stripe" onClick={startStripeCheckout} disabled={stripeLoading || paymentExpired} type="button">
              <span className="pay-icon stripe-word">stripe</span>
              <span>{stripeLoading ? 'processing payment...' : 'Credit Card'}</span>
            </button>
            <button className="pay-btn wechat" onClick={() => setShowQr('wechat')} disabled={paymentExpired} type="button">
              <span className="pay-icon wechat-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32"><path d="M13.2 7.2C6.9 7.2 2 11.1 2 16.1c0 2.8 1.6 5.2 4 6.8l-.8 3 3.5-1.7c1.3.5 2.8.8 4.5.8.8 0 1.6-.1 2.4-.2-.4-1-.6-2-.6-3.1 0-4.4 4.2-8 9.6-8.5-1.5-3.5-5.9-6-11.4-6z"/><path d="M25 15.1c-4.2 0-7.6 2.8-7.6 6.3s3.4 6.3 7.6 6.3c1 0 2-.2 2.9-.5l2.5 1.2-.6-2.1c1.4-1.1 2.2-2.8 2.2-4.8 0-3.6-3.4-6.4-7-6.4z"/></svg>
              </span>
              <span>WeChat Pay</span>
            </button>
            <button className="pay-btn alipay" onClick={() => setShowQr('alipay')} disabled={paymentExpired} type="button">
              <span className="pay-icon alipay-icon" aria-hidden="true">支</span>
              <span>Alipay</span>
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="page">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* ── Topbar (booking flow only) ── */}
      {showBooking && view !== 'auth' && (
        <header className="topbar">
          <button className="booking-top-main" onClick={backToMain} type="button" aria-label="Return to main page">
            <span className="booking-close-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </span>
            <span>Main page</span>
          </button>
          <div className="top-actions">
            {currentUser ? (
              <><span className="auth-welcome">Hi, {currentUser.name}</span><button className="ghost-btn" onClick={logout} type="button">Logout</button></>
            ) : (
              <button className="ghost-btn" onClick={() => openAuth('login')} type="button">Login / Sign up</button>
            )}
            {renderLangSelect()}
            <button className="menu-dots-btn" onClick={() => setShowNavMenu(true)} type="button" aria-label="Navigation menu">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </button>
          </div>
        </header>
      )}

      {/* ── Auth ── */}
      {view === 'auth' && (
        <div className="auth-page">
          <button className="auth-close-btn" onClick={() => setView('main')} type="button" aria-label="Close account screen">
            <span aria-hidden="true">×</span>
          </button>
          <div className="auth-inner">
            <section className="auth-left">
              <p className="auth-eyebrow">Ticket King Account</p>
              <h2>Sign in to manage your bookings.</h2>
              <p>Accounts are stored locally for the frontend preview. Email verification can be enabled later.</p>
            </section>
            <section className="auth-card">
              <div className="auth-tabs">
                <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); resetAuthForm() }} type="button">Log in</button>
                <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); resetAuthForm() }} type="button">Sign up</button>
              </div>
              <h3>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h3>
              <form className="auth-form" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
                {authMode === 'signup' && (
                  <>
                    <AuthField label="Full name" value={authForm.name} onChange={(v) => setAuthForm({ ...authForm, name: v })} placeholder="Jane Smith" autoComplete="name" />
                    <AuthField label="Email address" value={authForm.email} onChange={(v) => setAuthForm({ ...authForm, email: v })} placeholder="name@example.com" type="email" autoComplete="email" />
                  </>
                )}
                <AuthField label={authMode === 'login' ? 'Username or email' : 'Username'} value={authForm.username} onChange={(v) => setAuthForm({ ...authForm, username: v })} placeholder={authMode === 'login' ? 'username or email' : 'jane_smith'} autoComplete="username" helper={authMode === 'signup' ? '3–24 lowercase letters, numbers, or underscores.' : 'You can use your username or email.'} />
                <AuthField label="Password" value={authForm.password} onChange={(v) => setAuthForm({ ...authForm, password: v })} placeholder="Enter your password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} helper={authMode === 'signup' ? 'At least 8 characters.' : undefined} />
                {authMessage && <div className="auth-error">{authMessage}</div>}
                <button className="auth-submit" type="submit">{authMode === 'login' ? 'Log in' : 'Sign up'}</button>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      {view !== 'auth' && (
        <>
          {!showBooking && (
            <div className="marketing">

              {/* Hero */}
              <section className="hero-rich" style={{ backgroundImage: `url(${heroImg})` }}>
                {/* Floating header overlaid on hero */}
                <div className="hero-header">
                  <button className="brand-button" onClick={() => { setView('main'); setShowBooking(false) }} type="button">
                    <BrandLogo height={68} />
                  </button>
                  <div className="top-actions">
                    {currentUser ? (
                      <><span className="auth-welcome">Hi, {currentUser.name}</span><button className="ghost-btn" onClick={logout} type="button">Logout</button></>
                    ) : (
                      <button className="ghost-btn" onClick={() => openAuth('login')} type="button">Login / Sign up</button>
                    )}
                    {renderLangSelect()}
                    <button className="menu-dots-btn" onClick={() => setShowNavMenu(true)} type="button" aria-label="Navigation menu">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </button>
                  </div>
                </div>
                <div className="hero-overlay" />
                <div className="hero-inner">
                  <p className="hero-kicker">A groundbreaking location-based VR experience</p>
                  <h1>Terracotta Warriors: Secrets Of The First Emperor&apos;s Mausoleum</h1>
                  <div className="hero-btns">
                    <button className="hero-buy-btn" onClick={revealBooking} type="button">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
                      BUY TICKET
                    </button>
                  </div>
                  <div className="hero-meta-row">
                    <div className="hero-pill">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <div><div><strong>Sunday to Thursday</strong> ··· 10AM – 9PM</div><div><strong>Friday and Saturday</strong> ··· 10AM – 10PM</div></div>
                    </div>
                    <div className="hero-pill">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      <div><div><strong>We Are VR in Lansdowne Centre</strong></div><div>Near North entrance (Alderbridge Way)</div></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Introduction */}
              <section className="intro-section" id="intro">
                <div className="intro-media">
                  <video controls poster={galleryImg1} className="intro-video"><source src={introVideo} type="video/mp4" /></video>
                </div>
                <div className="intro-text">
                  <h2>Introduction</h2>
                  <p>&ldquo;Terracotta Warriors: Secrets of the First Emperor&apos;s Mausoleum&rdquo; is a groundbreaking location-based VR experience created by Xi&apos;an Hongwen, in collaboration with VIVE Arts and Wevr. For the first time, this immersive production is officially licensed by the Emperor Qin Shi Huang&apos;s Mausoleum Site Museum.</p>
                  <p>The project brings together world-class creative and technical teams to deliver an authentic, interactive journey that stays true to the latest archaeological discoveries. Audiences travel back to the Great Qin and embark on an unforgettable adventure into the heart of the mausoleum.</p>
                </div>
              </section>

              {/* Gallery */}
              <section className="gallery-section" id="gallery">
                <div className="section-heading">
                  <div className="section-eyebrow">Secrets of the First Emperor&apos;s Mausoleum</div>
                  <h2>Gallery</h2>
                </div>
                <div className="gallery-grid">
                  {galleryImages.map((src, idx) => (
                    <div key={idx} className="gallery-card" style={{ backgroundImage: `url(${src})` }} />
                  ))}
                </div>
              </section>

              {/* Tickets */}
              <section className="tickets-section" id="tickets">
                <div className="section-heading light">
                  <div className="section-eyebrow">Reserve Your Spot</div>
                  <h2>Tickets</h2>
                </div>
                <div className="ticket-pricing-list">
                  {ticketPricing.map((t) => (
                    <div key={t.label} className="ticket-pricing-row">
                      <div className="ticket-pricing-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
                      </div>
                      <div className="ticket-pricing-info">
                        <div className="ticket-pricing-name">{t.label}</div>
                        <div className="ticket-pricing-desc">{t.desc}</div>
                      </div>
                      <div className="ticket-pricing-price">{t.price}</div>
                      <button className="ticket-section-buy-btn" onClick={revealBooking} type="button">BUY TICKET</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section className="faq-section" id="faq">
                <div className="section-heading light">
                  <div className="section-eyebrow">Have a question in mind?</div>
                  <h2>Read Our FAQs</h2>
                </div>
                <div className="faq-list">
                  {faqItems.map((item, idx) => (
                    <div key={idx} className={`faq-item ${faqOpen === idx ? 'open' : ''}`}>
                      <button className="faq-q" onClick={() => setFaqOpen(faqOpen === idx ? null : idx)} type="button">
                        <span className="faq-toggle">{faqOpen === idx ? '−' : '+'}</span>
                        {item.q}
                      </button>
                      {faqOpen === idx && <div className="faq-a">{item.a}</div>}
                    </div>
                  ))}
                </div>
              </section>

              {/* Reviews */}
              <section className="reviews-section">
                <div className="reviews-top">
                  <div className="quote-badge">&ldquo;</div>
                  <div className="review-stats-row">
                    <span className="stat-badge">100k+ Views</span>
                    <span className="stat-badge">99% Satisfied</span>
                    <span className="stat-badge">5+ Show Location</span>
                  </div>
                </div>
                <div className="reviews-grid">
                  <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
                  <div className="review-card rust-card">
                    <p className="review-quote">&ldquo;{testimonials[0].quote}&rdquo;</p>
                    <div className="reviewer">
                      <img src={testimonials[0].img} alt={testimonials[0].name} className="reviewer-img" />
                      <div><div className="reviewer-name">{testimonials[0].name}</div><div className="reviewer-stars">{'★'.repeat(testimonials[0].rating)} {testimonials[0].rating} / 5</div></div>
                    </div>
                  </div>
                  <div className="review-card dark-card">
                    <p className="review-quote">&ldquo;{testimonials[1].quote}&rdquo;</p>
                    <div className="reviewer">
                      <img src={testimonials[1].img} alt={testimonials[1].name} className="reviewer-img" />
                      <div><div className="reviewer-name">{testimonials[1].name}</div><div className="reviewer-stars">{'★'.repeat(testimonials[1].rating)} {testimonials[1].rating} / 5</div></div>
                    </div>
                  </div>
                  <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
                </div>
              </section>

              {/* News */}
              <section className="news-section">
                <div className="section-heading">
                  <div className="section-eyebrow">Informing Minds, Inspiring Stories</div>
                  <h2>News &amp; Media</h2>
                </div>
                <div className="news-list">
                  {newsItems.map((n) => (
                    <div key={n.title} className="news-item">
                      <a href={n.link} target="_blank" rel="noreferrer" className="news-title-link"><h4>{n.title}</h4></a>
                      <p>{n.body}</p>
                      <a href={n.link} target="_blank" rel="noreferrer" className="news-read-more">Read More &rsaquo;</a>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="site-footer" id="contact">
                <div className="footer-inner">
                  <div className="footer-col footer-brand-col">
                    <div className="footer-logo-group">
                      <BrandLogo height={68} />
                    </div>
                    <div className="footer-socials">
                      <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook" data-label="Facebook"><i className="fab fa-facebook-f" /></a>
                      <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram" data-label="Instagram"><i className="fab fa-instagram" /></a>
                      <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="social-link social-link-text" aria-label="Xiaohongshu" data-label="Xiaohongshu">小红书</a>
                      <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="social-link" aria-label="TikTok" data-label="TikTok"><i className="fab fa-tiktok" /></a>
                      <a href="mailto:info@vrvr.show" className="social-link" aria-label="Email" data-label="Email"><i className="far fa-envelope" /></a>
                    </div>
                    <div className="footer-newsletter">
                      <div className="footer-newsletter-label">Subscribe to Our newsletter</div>
                      <div className="footer-newsletter-row">
                        <input type="email" placeholder="Your email here" value={newsletterEmail} onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterMessage('') }} className="footer-email-input" />
                        <button className="footer-signup-btn" onClick={submitNewsletter} type="button">SIGN UP</button>
                      </div>
                      {newsletterMessage && <div className="footer-newsletter-message">{newsletterMessage}</div>}
                    </div>
                  </div>

                  <div className="footer-col">
                    <h4 className="footer-col-title">Reach Our Location</h4>
                    <div className="footer-location-name">Lansdowne Centre</div>
                    <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="footer-location-addr-link">
                      Unit 210-5300 Number 3 Rd, Richmond, BC
                    </a>
                    <button className="footer-map-link" onClick={() => setShowMapModal(true)} type="button">View On Map</button>
                    <button className="footer-map-link highlight" onClick={() => window.open(mapInstructionPdf, '_blank')} type="button">
                      Click here for detailed location instruction
                    </button>
                  </div>

                  <div className="footer-col">
                    <h4 className="footer-col-title">Opening Hours</h4>
                    <div className="footer-hours-row"><span className="footer-hours-day">Sunday to Thursday ···</span><span className="footer-hours-time">10AM – 9PM</span></div>
                    <div className="footer-hours-row"><span className="footer-hours-day">Friday and Saturday ···</span><span className="footer-hours-time">10AM – 10PM</span></div>
                    <h4 className="footer-col-title" style={{ marginTop: '28px' }}>Contact Us</h4>
                    <div className="footer-contact-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      info@vrvr.show
                    </div>
                    <div className="footer-contact-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.36a16 16 0 0 0 6.13 6.13l.951-.951a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      (778) 805-4699
                    </div>
                  </div>
                </div>
                <div className="footer-copy">© {new Date().getFullYear()} We Are VR · Lansdowne Centre, Richmond BC</div>
              </footer>
            </div>
          )}

          {/* Booking flow */}
          {showBooking && (
            <div className="content" ref={bookingRef} id="booking">
              <div className="booking-hero">
                <div>
                  <p className="booking-eyebrow">Secure checkout</p>
                  <h2>Reserve your visit</h2>
                </div>
                <div className="booking-stepper" aria-label="Booking progress">
                  {bookingSteps.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`booking-step ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'done' : ''}`}
                    >
                      <span className="booking-step-dot">{idx + 1}</span>
                      <span className="booking-step-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {headerCards}
              {step === 'date' && renderDate()}
              {step === 'time' && renderTime()}
              {step === 'tickets' && renderTickets()}
              {step === 'contact' && renderContact()}
              {step === 'payment' && renderPayment()}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {vipModal && (
        <div className="overlay" onClick={() => setVipModal(false)}>
          <div className="vip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vip-card">
              <div className="vip-card-glow" />
              <div className="vip-head">
                <div className="vip-icon">♛</div>
                <div>
                  <div className="vip-eyebrow">Upgrade your visit</div>
                  <div className="vip-title">VIP Experience</div>
                  <div className="vip-price">+$20.00 / guest</div>
                </div>
              </div>
              <div className="vip-benefits">
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>Exclusive Tour</strong>
                </div>
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>Priority Entry</strong>
                </div>
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>Souvenir</strong>
                </div>
              </div>
            </div>
            <div className="vip-quantity-row">
              <div className="ticket-info"><div className="ticket-title">VIP add-on</div><div className="ticket-desc">Choose how many guests receive VIP benefits.</div></div>
              <div className="ticket-actions">
                <div className="counter">
                  <button onClick={() => setVipQty((v) => Math.max(0, v - 1))} type="button">-</button>
                  <div className="counter-value">{vipQty}</div>
                  <button onClick={() => setVipQty((v) => v + 1)} type="button">+</button>
                </div>
              </div>
            </div>
            <div className="actions stacked">
              <button className="secondary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">Skip</button>
              <button className="primary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">Confirm Upgrade</button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <div className="overlay qr-overlay">
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Scan QR Code to Pay</h4>
            <p className="qr-subtitle">Please use {showQr === 'wechat' ? 'WeChat' : 'Alipay'} app to scan the QR code</p>
            <div className="qr-warning">⚠️ Please do not close this window during payment</div>
            <div className="qr-code-frame">
              <img src={qrPlaceholder} alt={`${showQr === 'wechat' ? 'WeChat Pay' : 'Alipay'} QR code`} />
            </div>
            <button className="qr-cancel-btn" onClick={cancelQrPayment} type="button">Cancel Payment</button>
          </div>
        </div>
      )}

      {showMapModal && <MapModal onClose={() => setShowMapModal(false)} />}
      {showNavMenu && <NavMenu onClose={() => setShowNavMenu(false)} onBuyTicket={revealBooking} onNavigateToSection={navigateToMainSection} />}

      {view === 'main' && !showBooking && (
        <div className="floating-cta">
          <button className="cta-pill" onClick={revealBooking} type="button">BUY TICKET</button>
        </div>
      )}

      {showBackTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">↑</button>
      )}
    </div>
  )
}

function AuthField({ helper, label, onChange, type = 'text', value, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input className="auth-input" onChange={(e) => onChange(e.target.value)} type={type} value={value} {...props} />
      {helper && <span className="auth-helper">{helper}</span>}
    </label>
  )
}

export default App
