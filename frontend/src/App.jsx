import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StripeCheckout from './components/StripeCheckout'
import Cart from './components/Cart'
import './App.css'
import HeaderActions from './components/HeaderActions'
import LanguageSelect from './components/LanguageSelect'
import MapModal from './components/MapModal'
import NavMenu from './components/NavMenu'
import PaymentQrModal from './components/PaymentQrModal'
import VipModal from './components/VipModal'
import { languages, translations } from './i18n/translations'
import {
  isDateTimePeak,
  newsItems,
  ticketTypes,
} from './data/showData'
import { allExperiences, vrExperiences } from './data/experiences'
import AuthPage from './pages/AuthPage'
import BookingPage from './pages/BookingPage'
import ExperienceDetailPage from './pages/ExperienceDetailPage'
import MarketingPage from './pages/MarketingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import { getDisplayName } from './api/auth'
import { useCustomerAuth } from './hooks/useCustomerAuth'
import { currency } from './utils/format'
import { isReasonableName, isReasonablePhone, isStrictEmail } from './utils/validation'

const BACKEND_EVENT_SLUGS = {
  'terracotta-warriors': 'terracotta-warriors',
  panda: 'panda-vr',
  dragon: 'dino-vr',
  'cyber-arena': 'game-a',
  'space-odyssey': 'game-b',
  'ocean-quest': 'game-c',
}
const AVAILABILITY_CACHE_MS = 10000

const EXPERIENCE_COPY_KEYS = {
  'terracotta-warriors': 'terr',
  panda: 'panda',
  dragon: 'dragon',
  'cyber-arena': 'cyber',
  'space-odyssey': 'space',
  'ocean-quest': 'ocean',
}

const TICKET_COPY_KEYS = {
  adult: ['ticketTypeRegular', null],
  child: ['ticketTypeChild', 'childInfo'],
  senior: ['ticketTypeSenior', null],
  family: ['ticketTypeFamily', 'familyInfo'],
  group: ['ticketTypeGroup', 'groupInfo'],
}

function isoDate(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function initialTicketCounts() {
  return ticketTypes.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
}

// ── Main App ─────────────────────────────────────────────────────────────
function App() {
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const [view, setView] = useState('main')
  const [showBooking, setShowBooking] = useState(false)
  const [step, setStep] = useState('date')
  const [calendarMonth, setCalendarMonth] = useState(currentMonthStart)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [counts, setCounts] = useState(initialTicketCounts)
  const [rawCounts, setRawCounts] = useState({})
  const [vipQty, setVipQty] = useState(0)
  const [vipModal, setVipModal] = useState(false)
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '', optIn: false })
  const [contactTouched, setContactTouched] = useState({})
  const [timeLeft, setTimeLeft] = useState(300)
  const [showQr, setShowQr] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [showStripeCheckout, setShowStripeCheckout] = useState(false)
  const [alphapayQrImage, setAlphapayQrImage] = useState(null)
  const [alphapayLoading, setAlphapayLoading] = useState(false)
  const alphapayEventSourceRef = useRef(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [availableSlotsLoading, setAvailableSlotsLoading] = useState(false)
  const [availableSlotsLoaded, setAvailableSlotsLoaded] = useState(false)
  const availableSlotsCacheRef = useRef(new Map())
  const [reservation, setReservation] = useState(null)
  const [paymentReservationId, setPaymentReservationId] = useState(null)
  const [checkoutOpening, setCheckoutOpening] = useState(false)
  const [reservationLoading, setReservationLoading] = useState(false)
  const releasedReservationRef = useRef(null)
  const [faqOpen, setFaqOpen] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [bookingExperience, setBookingExperience] = useState(vrExperiences[0])
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wearevr_cart') || '[]') } catch { return [] }
  })
  const [showCart, setShowCart] = useState(false)
  const [bookingsInitialSection, setBookingsInitialSection] = useState('bookings')
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const bookingRef = useRef(null)
  const t = useCallback((key, params = {}) => {
    const template = translations[selectedLang.code]?.[key] ?? translations.en[key] ?? key
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template)
  }, [selectedLang.code])
  const showAuthView = useCallback(() => setView('auth'), [])
  const showMainView = useCallback(() => setView('main'), [])
  const {
    authForm,
    authMessage,
    authMode,
    authReady,
    currentUser,
    handleLogin,
    handlePasswordResetRequest,
    handlePasswordUpdate,
    handleSignup,
    logout,
    openAuth,
    resetAuthForm,
    setAuthForm,
    setAuthMessage,
    setAuthMode,
  } = useCustomerAuth({
    onAuthenticated: showMainView,
    onShowAuth: showAuthView,
    t,
  })

  useEffect(() => {
    if (!currentUser) return
    const displayName = getDisplayName(currentUser)
    const parts = displayName.split(' ').filter(Boolean)
    const first = parts[0] || currentUser.email?.split('@')[0] || ''
    const last = parts.slice(1).join(' ')
    const email = currentUser.email || ''
    const phone = currentUser.user_metadata?.phone || ''
    setContact((previous) => ({
      ...previous,
      first: previous.first || first,
      last: previous.last || last,
      email: previous.email || email,
      phone: previous.phone || phone,
    }))
  }, [currentUser])

  const localizedFaqItems = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((idx) => ({ q: t(`faq${idx}Q`), a: t(`faq${idx}A`) })),
    [t],
  )
  const localizedNewsItems = useMemo(
    () => newsItems.map((item, idx) => ({ ...item, title: t(`news${idx + 1}Title`), body: t(`news${idx + 1}Body`) })),
    [t],
  )
  const localizedExperiences = useMemo(() => allExperiences.map((exp) => {
    const prefix = EXPERIENCE_COPY_KEYS[exp.id]
    if (!prefix) return exp
    return { ...exp, title: t(`${prefix}Title`), subtitle: t(`${prefix}Sub`), tagline: t(`${prefix}Tagline`) }
  }), [t])
  const dateLocale = selectedLang.code === 'zh-Hans' ? 'zh-CN' : selectedLang.code === 'zh-Hant' ? 'zh-TW' : 'en-US'
  const monthDisplay = (date) => date.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
  const fullDateDisplay = (date) => date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  const weekdayLabels = selectedLang.code === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : selectedLang.code === 'zh-Hans'
      ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      : ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

  const isPeak = useMemo(() => {
    if (!selectedDate || !selectedTime) return false
    return isDateTimePeak(selectedDate.date, selectedTime.time)
  }, [selectedDate, selectedTime])

  const activePrices = isPeak ? bookingExperience.peakPrices : bookingExperience.offPeakPrices
  const perEach = selectedLang.code === 'zh-Hans' ? '/张' : selectedLang.code === 'zh-Hant' ? '/張' : '/each'
  const localizedTicketTypes = useMemo(() => ticketTypes.map((ticket) => ({
    ...ticket,
    price: activePrices[ticket.id],
    label: t(TICKET_COPY_KEYS[ticket.id][0]),
    description: currency(activePrices[ticket.id]) + perEach,
    info: TICKET_COPY_KEYS[ticket.id][1] ? t(TICKET_COPY_KEYS[ticket.id][1]) : undefined,
  })), [activePrices, perEach, t])

  const totals = useMemo(() => {
    const prices = isPeak ? bookingExperience.peakPrices : bookingExperience.offPeakPrices
    const numTickets = ticketTypes.reduce((sum, tk) => sum + counts[tk.id], 0)
    const ticketTotal = ticketTypes.reduce((sum, tk) => sum + counts[tk.id] * prices[tk.id], 0)
    const vipTotal = vipQty * 20
    const subtotal = ticketTotal + vipTotal
    const couponDiscount = Math.min(appliedCoupon?.discountAmount || 0, subtotal)
    const processingFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * ticketTotal : 0
    const tax = numTickets > 0 ? 0.05 * ticketTotal : 0
    const fees = processingFee + tax
    return { numTickets, ticketTotal, vipTotal, subtotal, couponDiscount, fees, processingFee, tax, grand: Math.max(0, subtotal - couponDiscount) + fees }
  }, [counts, vipQty, isPeak, bookingExperience, appliedCoupon])

  const contactErrors = useMemo(() => {
    const errors = {}
    if (!isReasonableName(contact.first)) errors.first = t('firstNameError')
    if (!isReasonableName(contact.last)) errors.last = t('lastNameError')
    if (!isStrictEmail(contact.email)) errors.email = t('emailError')
    if (!isReasonablePhone(contact.phone)) errors.phone = t('phoneError')
    return errors
  }, [contact, t])

  const visibleDateGrid = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = new Date(year, month, 1).getDay()
    const prices = bookingExperience?.offPeakPrices ?? { adult: 37.95 }
    const peakP = bookingExperience?.peakPrices ?? { adult: 45.95 }
    const dates = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1
      const date = new Date(year, month, day)
      const isPast = date < today
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      return {
        day,
        date,
        key: `${year}-${month}-${day}`,
        disabled: isPast,
        price: isPast ? undefined : (isWeekend ? peakP.adult : prices.adult),
        level: isPast ? undefined : (isWeekend ? 'peak' : 'normal'),
      }
    })
    return [
      ...Array.from({ length: leadingBlanks }, (_, idx) => ({ key: `blank-${year}-${month}-${idx}`, blank: true })),
      ...dates,
    ]
  }, [calendarMonth, bookingExperience])

  useEffect(() => {
    if (step !== 'payment') return undefined
    setTimeLeft(reservation?.expiresInSeconds || 300)
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(timer)
  }, [step, reservation?.id, reservation?.expiresInSeconds])

  useEffect(() => {
    setSelectedTime(null)
    if (!selectedDate || !bookingExperience?.id) {
      setAvailableSlots([])
      setAvailableSlotsLoaded(false)
      return undefined
    }
    const eventSlug = BACKEND_EVENT_SLUGS[bookingExperience.id]
    if (!eventSlug) {
      setAvailableSlots([])
      setAvailableSlotsLoaded(false)
      return undefined
    }
    const dateKey = isoDate(selectedDate.date)
    const cacheKey = `${eventSlug}:${dateKey}`
    const cached = availableSlotsCacheRef.current.get(cacheKey)
    if (cached && Date.now() - cached.cachedAt < AVAILABILITY_CACHE_MS) {
      setAvailableSlots(cached.slots)
      setAvailableSlotsLoaded(true)
      setAvailableSlotsLoading(false)
      return undefined
    }
    const controller = new AbortController()
    const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
    setAvailableSlotsLoading(true)
    setAvailableSlotsLoaded(false)
    fetch(`${backendBase}/api/v1/events/${eventSlug}/slots?date=${dateKey}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((slots) => {
        if (!controller.signal.aborted) {
          const nextSlots = Array.isArray(slots) ? slots : []
          availableSlotsCacheRef.current.set(cacheKey, { slots: nextSlots, cachedAt: Date.now() })
          setAvailableSlots(nextSlots)
          setAvailableSlotsLoaded(true)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err)
          setAvailableSlots([])
          setAvailableSlotsLoaded(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailableSlotsLoading(false)
      })
    return () => controller.abort()
  }, [selectedDate, bookingExperience])

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

  const openAuthScreen = (mode) => {
    setShowBooking(false)
    openAuth(mode)
  }

  const revealBooking = useCallback((experience = null) => {
    const nextExperience = experience && experience.id ? experience : null
    if (nextExperience) {
      setBookingExperience(nextExperience)
      setCounts(initialTicketCounts())
      setVipQty(0)
      setSelectedDate(null)
      setSelectedTime(null)
      setStep('date')
    }
    setView('main')
    setShowBooking(true)
    if (!selectedDate) setCalendarMonth(currentMonthStart())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [selectedDate])

  const startBookingWithAuth = (experience = null) => {
    revealBooking(experience)
  }

  const openBookingsPage = (section = 'bookings') => {
    if (!currentUser) {
      openAuthScreen('login')
      return
    }
    setBookingsInitialSection(section)
    setShowBooking(false)
    setSelectedExperience(null)
    setView('bookings')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const backToMain = () => {
    setShowBooking(false)
    setSelectedExperience(null)
    setView('main')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openExperience = (exp) => {
    setSelectedExperience(exp)
    setView('experience')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const backToExperienceSection = () => {
    const sectionId = selectedExperience?.category === 'arcade' ? 'games' : 'experiences'
    setSelectedExperience(null)
    setView('main')
    setShowBooking(false)
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const addExperienceTicketsToCart = ({
    experience,
    selectedDate,
    selectedTime,
    ticketOptions = [],
    tickets = [],
    openCart = false,
  }) => {
    if (!experience || !selectedDate || !selectedTime) return
    const sessionDateKey = isoDate(selectedDate)
    const sessionDate = selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const sessionTime = typeof selectedTime === 'string' ? selectedTime : selectedTime.label || selectedTime.time
    const nextItems = tickets.map((ticket) => {
      const option = ticketOptions.find((item) => item.id === ticket.id) || ticket
      return {
        id: [experience.id, sessionDateKey, sessionTime, ticket.id].join('__'),
        show_id: experience.id,
        show_title: experience.title,
        session_date_key: sessionDateKey,
        session_date: sessionDate,
        session_time: sessionTime,
        slot_id: typeof selectedTime === 'object' ? selectedTime.id : null,
        event_id: typeof selectedTime === 'object' ? selectedTime.eventId : null,
        ticket_type_id: ticket.id,
        ticket_type_label: ticket.label,
        ticket_options: ticketOptions,
        quantity: ticket.quantity,
        unit_price: option.price ?? ticket.price,
        experience_category: experience.category,
        experience_accent: experience.accent,
        experience_gradient: experience.cardGradient,
        experience_image: experience.heroImg,
      }
    })

    setCartItems((previous) => {
      const nextById = new Map(previous.map((item) => [item.id, item]))
      Array.from(nextById.values()).forEach((item) => {
        if (item.show_id === experience.id && item.session_date_key === sessionDateKey && item.session_time === sessionTime) {
          nextById.delete(item.id)
        }
      })
      nextItems.forEach((item) => {
        if (item.quantity <= 0) {
          return
        }
        nextById.set(item.id, item)
      })
      const updated = Array.from(nextById.values())
      localStorage.setItem('wearevr_cart', JSON.stringify(updated))
      return updated
    })
    if (openCart) setShowCart(true)
  }

  const switchBookingExperience = (experienceId) => {
    const nextExperience = allExperiences.find((experience) => experience.id === experienceId)
    if (!nextExperience || nextExperience.id === bookingExperience.id) return
    setBookingExperience(nextExperience)
    setSelectedDate(null)
    setSelectedTime(null)
    setCounts(initialTicketCounts())
    setRawCounts({})
    setVipQty(0)
    setCouponCode('')
    setCouponMessage('')
    setAppliedCoupon(null)
    setTimeLeft(300)
    setStep('date')
    setCalendarMonth(currentMonthStart())
  }

  const restartBooking = () => {
    setStep('date')
    setSelectedDate(null)
    setSelectedTime(null)
    setVipQty(0)
    setTimeLeft(300)
    setCalendarMonth(currentMonthStart())
  }

  const changeCount = (id, delta) => {
    setCounts((p) => {
      const cur = p[id]
      let next
      if (delta > 0 && cur === 0 && id === 'family') next = 3
      else if (delta > 0 && cur === 0 && id === 'group') next = 6
      else next = Math.max(0, cur + delta)
      return { ...p, [id]: next }
    })
    setRawCounts((p) => { const n = { ...p }; delete n[id]; return n })
  }
  const changeCalendarMonth = (delta) => {
    setCalendarMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
      const now = new Date()
      const minMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return next < minMonth ? current : next
    })
  }
  const markContactTouched = (field) => setContactTouched((prev) => ({ ...prev, [field]: true }))
  const updateContact = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }))
  }
  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) {
      setAppliedCoupon(null)
      setCouponMessage(t('couponFirst'))
      return
    }
    try {
      const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
      const res = await fetch(`${backendBase}/api/v1/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: totals.subtotal }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null)
        setCouponMessage(data.detail || 'Invalid coupon code.')
        return
      }
      setAppliedCoupon({
        code: data.code,
        discountAmount: Number(data.discountAmount || 0),
        discountType: data.discountType,
        discountValue: Number(data.discountValue || 0),
      })
      setCouponMessage(data.message || `Coupon ${data.code} applied.`)
    } catch (error) {
      console.error(error)
      setAppliedCoupon(null)
      setCouponMessage('Unable to validate coupon. Please try again.')
    }
  }
  const cancelQrPayment = () => {
    if (window.confirm(t('cancelConfirm'))) {
      alphapayEventSourceRef.current?.close()
      alphapayEventSourceRef.current = null
      setAlphapayQrImage(null)
      setShowQr(null)
    }
  }
  const submitNewsletter = () => {
    setNewsletterMessage(isStrictEmail(newsletterEmail) ? t('footerThanks') : t('footerEmailInvalid'))
  }
  const navigateToMainSection = (id) => {
    setView('main')
    setShowBooking(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const releaseReservation = useCallback((reservationId = reservation?.id, options = {}) => {
    if (!reservationId || releasedReservationRef.current === reservationId) return
    releasedReservationRef.current = reservationId

    const eventSlug = BACKEND_EVENT_SLUGS[bookingExperience.id]
    if (eventSlug && selectedDate) {
      availableSlotsCacheRef.current.delete(`${eventSlug}:${isoDate(selectedDate.date)}`)
    }
    alphapayEventSourceRef.current?.close()
    alphapayEventSourceRef.current = null

    const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
    const url = `${backendBase}/api/v1/reservations/${reservationId}/expire`
    if (options.beacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([], { type: 'text/plain' }))
    } else {
      fetch(url, { method: 'POST', keepalive: Boolean(options.beacon) }).catch(console.error)
    }

    if (reservation?.id === reservationId) {
      setReservation(null)
      setPaymentReservationId(null)
      setShowQr(null)
      setAlphapayQrImage(null)
    }
  }, [bookingExperience.id, reservation?.id, selectedDate])

  const canProceedDate = Boolean(selectedDate)
  const canProceedTime = Boolean(selectedTime)
  const effectiveCount = (id) => rawCounts[id] !== undefined ? Math.max(0, parseInt(rawCounts[id]) || 0) : counts[id]
  const effectiveSubtotal = ticketTypes.reduce((sum, tk) => sum + effectiveCount(tk.id) * activePrices[tk.id], 0)
  const hasInvalidBundleCount = (effectiveCount('group') > 0 && effectiveCount('group') < 6)
    || (effectiveCount('family') > 0 && effectiveCount('family') < 3)
  const canProceedTickets = effectiveSubtotal > 0 && !hasInvalidBundleCount
  const canProceedContact = Object.keys(contactErrors).length === 0
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const paymentExpired = step === 'payment' && timeLeft === 0

  useEffect(() => {
    if (!paymentReservationId) return
    if (step === 'payment' && view === 'main' && showBooking) return
    if (showStripeCheckout || showQr || checkoutOpening) return
    releaseReservation(paymentReservationId)
  }, [paymentReservationId, step, view, showBooking, showStripeCheckout, showQr, checkoutOpening, releaseReservation])

  useEffect(() => {
    if (!paymentReservationId) return undefined
    const releaseOnLeave = () => releaseReservation(paymentReservationId, { beacon: true })
    window.addEventListener('pagehide', releaseOnLeave)
    window.addEventListener('beforeunload', releaseOnLeave)
    return () => {
      window.removeEventListener('pagehide', releaseOnLeave)
      window.removeEventListener('beforeunload', releaseOnLeave)
    }
  }, [paymentReservationId, releaseReservation])

  useEffect(() => {
    if (!paymentExpired || !paymentReservationId) return
    releaseReservation(paymentReservationId)
  }, [paymentExpired, paymentReservationId, releaseReservation])

  const bookingSteps = [
    { id: 'date', label: t('date') },
    { id: 'time', label: t('time') },
    { id: 'tickets', label: t('tickets') },
    { id: 'contact', label: t('contact') },
    { id: 'payment', label: t('payment') },
  ]
  const currentStepIndex = bookingSteps.findIndex((item) => item.id === step)

  const buildCheckoutOrder = () => {
    if (!selectedTime?.slotId || !selectedDate) return undefined
    return {
      customer: {
        name: [contact.first, contact.last].filter(Boolean).join(' '),
        email: contact.email,
        phone: contact.phone,
      },
      items: localizedTicketTypes
        .filter((ticket) => counts[ticket.id] > 0)
        .map((ticket) => ({
          eventId: selectedTime.eventId,
          slotId: selectedTime.slotId,
          ticketTypeId: null,
          eventName: bookingExperience.title,
          slotDate: isoDate(selectedDate.date),
          slotTime: selectedTime.label || selectedTime.time,
          ticketType: ticket.label,
          quantity: counts[ticket.id],
          unitPrice: ticket.price,
        })),
      paymentFee: totals.processingFee,
      gst: totals.tax,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: totals.couponDiscount,
      totalAmount: totals.grand,
    }
  }

  const createCheckoutReservation = async () => {
    if (reservation?.id && timeLeft > 0) return reservation
    const order = buildCheckoutOrder()
    if (!order) {
      alert('Unable to reserve this session because the selected time is missing a live booking slot. Please choose a date and time again.')
      return null
    }
    setReservationLoading(true)
    try {
      const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
      const res = await fetch(`${backendBase}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(totals.grand * 100),
          order,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.detail || 'Unable to reserve this time. Please choose another time.')
        return null
      }
      setReservation(data)
      setTimeLeft(data.expiresInSeconds || 300)
      const eventSlug = BACKEND_EVENT_SLUGS[bookingExperience.id]
      if (eventSlug && selectedDate) {
        availableSlotsCacheRef.current.delete(`${eventSlug}:${isoDate(selectedDate.date)}`)
      }
      return data
    } catch (error) {
      console.error(error)
      alert('Unable to reserve this time. Please try again.')
      return null
    } finally {
      setReservationLoading(false)
    }
  }

  const goToStep = async (nextStep) => {
    if (nextStep === 'payment') {
      setCheckoutOpening(true)
      const nextReservation = await createCheckoutReservation()
      setCheckoutOpening(false)
      if (!nextReservation) return
      setPaymentReservationId(nextReservation.id)
    }
    setStep(nextStep)
  }

  const startStripeCheckout = async () => {
    if (paymentExpired) return
    if (!reservation?.id) {
      alert('Unable to start checkout because the reservation is missing. Please choose a date and time again.')
      return
    }
    setShowStripeCheckout(true)
  }

  const startAlphapayCheckout = async (method) => {
    if (paymentExpired) return
    try {
      setAlphapayLoading(true)
      if (!reservation?.id) {
        alert('Unable to start checkout because the reservation is missing. Please choose a date and time again.')
        return
      }
      const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
      const totalCents = Math.round(totals.grand * 100)
      const payload = {
        method,
        amount: totalCents,
        description: bookingExperience.title,
        reservationId: reservation.id,
        payment_request_id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
      const res = await fetch(`${backendBase}/api/v1/alphapay/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create QR')
      const data = await res.json()
      const paymentRequestId = data.paymentRequestId || payload.payment_request_id
      setAlphapayQrImage(data.qrImage)
      setShowQr(method)
      const es = new EventSource(`${backendBase}/api/v1/alphapay/events/${paymentRequestId}`)
      alphapayEventSourceRef.current = es
      es.onmessage = (e) => {
        const payload = JSON.parse(e.data)
        if (payload.paid) {
          es.close()
          alphapayEventSourceRef.current = null
          setPaymentReservationId(null)
          setReservation(null)
          setShowQr(null)
          setAlphapayQrImage(null)
          window.location.href = `${import.meta.env.VITE_BASE_URL || ''}/success`
        }
      }
      es.onerror = () => es.close()
    } catch (err) {
      console.error(err)
      alert(t('unableCheckout'))
    } finally {
      setAlphapayLoading(false)
    }
  }

  const renderLangSelect = () => (
    <LanguageSelect
      selectedLang={selectedLang}
      setSelectedLang={setSelectedLang}
    />
  )

  return (
    <div className={`page lang-${selectedLang.code}`}>
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
            <span>{t('mainPage')}</span>
          </button>
          <HeaderActions
            authReady={authReady}
            cartCount={cartCount}
            currentUser={currentUser}
            onLogout={logout}
            onOpenAuth={() => openAuthScreen('login')}
            onOpenBookings={openBookingsPage}
            onOpenCart={() => setShowCart(true)}
            onOpenNav={() => setShowNavMenu(true)}
            renderLangSelect={renderLangSelect}
            t={t}
          />
        </header>
      )}

      {/* ── Auth ── */}
      {view === 'auth' && (
        <AuthPage
          authForm={authForm}
          authMessage={authMessage}
          authMode={authMode}
          handleLogin={handleLogin}
          handlePasswordResetRequest={handlePasswordResetRequest}
          handlePasswordUpdate={handlePasswordUpdate}
          handleSignup={handleSignup}
          onClose={() => setView('main')}
          resetAuthForm={resetAuthForm}
          setAuthForm={setAuthForm}
          setAuthMessage={setAuthMessage}
          setAuthMode={setAuthMode}
          t={t}
        />
      )}

      {/* ── Experience Detail ── */}
      {view === 'experience' && selectedExperience && (
        <ExperienceDetailPage
          authReady={authReady}
          cartCount={cartCount}
          cartItems={cartItems}
          currentUser={currentUser}
          experience={selectedExperience}
          onBack={backToExperienceSection}
          onBuyTicket={addExperienceTicketsToCart}
          onLogout={logout}
          onOpenAuth={() => openAuthScreen('login')}
          onOpenBookings={openBookingsPage}
          onOpenCart={() => setShowCart(true)}
          onOpenNav={() => setShowNavMenu(true)}
          onSelectExperience={openExperience}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      )}

      {view === 'bookings' && (
        <MyBookingsPage
          authReady={authReady}
          cartCount={cartCount}
          currentUser={currentUser}
          experiences={localizedExperiences}
          initialSection={bookingsInitialSection}
          onGoHome={() => { setView('main'); setShowBooking(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onLogout={logout}
          onOpenAuth={() => openAuthScreen('login')}
          onOpenCart={() => setShowCart(true)}
          onOpenNav={() => setShowNavMenu(true)}
          onVisitContact={() => navigateToMainSection('contact')}
          onVisitFaq={() => navigateToMainSection('faq')}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      )}

      {/* ── Main ── */}
      {view !== 'auth' && view !== 'experience' && view !== 'bookings' && (
        <>
          {!showBooking && (
            <MarketingPage
              authReady={authReady}
              cartCount={cartCount}
              currentUser={currentUser}
              faqOpen={faqOpen}
              localizedExperiences={localizedExperiences}
              localizedFaqItems={localizedFaqItems}
              localizedNewsItems={localizedNewsItems}
              newsletterEmail={newsletterEmail}
              newsletterMessage={newsletterMessage}
              onBuyTicket={startBookingWithAuth}
              onGoHome={() => { setView('main'); setShowBooking(false) }}
              onLogout={logout}
              onOpenAuth={() => openAuthScreen('login')}
              onOpenBookings={openBookingsPage}
              onOpenCart={() => setShowCart(true)}
              onOpenMap={() => setShowMapModal(true)}
              onOpenNav={() => setShowNavMenu(true)}
              onSelectExperience={openExperience}
              renderLangSelect={renderLangSelect}
              setFaqOpen={setFaqOpen}
              setNewsletterEmail={setNewsletterEmail}
              setNewsletterMessage={setNewsletterMessage}
              submitNewsletter={submitNewsletter}
              t={t}
            />
          )}

          {showBooking && (
            <BookingPage
              alphapayLoading={alphapayLoading}
              applyCoupon={applyCoupon}
              appliedCoupon={appliedCoupon}
              availableSlots={availableSlots}
              availableSlotsLoaded={availableSlotsLoaded}
              availableSlotsLoading={availableSlotsLoading}
              bookingExperience={bookingExperience}
              bookingExperiences={allExperiences}
              bookingRef={bookingRef}
              bookingSteps={bookingSteps}
              calendarMonth={calendarMonth}
              cartCount={cartCount}
              cartItems={cartItems}
              canProceedContact={canProceedContact}
              canProceedDate={canProceedDate}
              canProceedTickets={canProceedTickets}
              canProceedTime={canProceedTime}
              changeCalendarMonth={changeCalendarMonth}
              changeCount={changeCount}
              contact={contact}
              contactErrors={contactErrors}
              contactTouched={contactTouched}
              counts={counts}
              couponCode={couponCode}
              couponMessage={couponMessage}
              currentStepIndex={currentStepIndex}
              fullDateDisplay={fullDateDisplay}
              localizedTicketTypes={localizedTicketTypes}
              markContactTouched={markContactTouched}
              minutes={minutes}
              monthDisplay={monthDisplay}
              onAddToCart={addExperienceTicketsToCart}
              onBookingExperienceChange={switchBookingExperience}
              onClose={backToMain}
              onOpenCart={() => setShowCart(true)}
              paymentExpired={paymentExpired}
              rawCounts={rawCounts}
              restartBooking={restartBooking}
              seconds={seconds}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              setContact={setContact}
              setCounts={setCounts}
              setCouponCode={setCouponCode}
              setCouponMessage={setCouponMessage}
              setAppliedCoupon={setAppliedCoupon}
              setRawCounts={setRawCounts}
              setSelectedDate={setSelectedDate}
              setSelectedTime={setSelectedTime}
              setStep={goToStep}
              setVipModal={setVipModal}
              reservationLoading={reservationLoading}
              startAlphapayCheckout={startAlphapayCheckout}
              startStripeCheckout={startStripeCheckout}
              step={step}
              t={t}
              totals={totals}
              updateContact={updateContact}
              vipQty={vipQty}
              visibleDateGrid={visibleDateGrid}
              weekdayLabels={weekdayLabels}
            />
          )}
        </>
      )}

      {/* ── Modals ── */}
      {vipModal && (
        <VipModal
          onClose={() => setVipModal(false)}
          onContinue={() => { setVipModal(false); setStep('contact') }}
          setVipQty={setVipQty}
          t={t}
          vipQty={vipQty}
        />
      )}

      {showQr && (
        <PaymentQrModal
          alphapayQrImage={alphapayQrImage}
          onCancel={cancelQrPayment}
          showQr={showQr}
          t={t}
        />
      )}

      {showMapModal && <MapModal onClose={() => setShowMapModal(false)} />}
      {showNavMenu && <NavMenu onClose={() => setShowNavMenu(false)} onBuyTicket={startBookingWithAuth} onNavigateToSection={navigateToMainSection} t={t} />}

      {showStripeCheckout && (
        <StripeCheckout
          orderData={{
            orderId: reservation?.orderNumber || reservation?.id || 'WEAREVR',
            amount: totals.grand,
            description: `Tickets for ${bookingExperience.title}`,
            date: selectedDate ? fullDateDisplay(selectedDate.date) : null,
            time: selectedTime?.time || null,
            email: contact.email,
            reservationId: reservation?.id,
          }}
          onClose={() => setShowStripeCheckout(false)}
          onPaid={() => { setPaymentReservationId(null); setReservation(null) }}
          onSuccess={() => { setShowStripeCheckout(false); setPaymentReservationId(null); setReservation(null); backToMain(); }}
        />
      )}

      {showCart && (
        <Cart
          authForm={authForm}
          authMessage={authMessage}
          authMode={authMode}
          authReady={authReady}
          currentUser={currentUser}
          getDisplayName={getDisplayName}
          handleLogin={handleLogin}
          handleSignup={handleSignup}
          items={cartItems}
          onUpdateQty={(id, qty) => setCartItems(prev => {
            const updated = qty <= 0
              ? prev.filter(i => i.id !== id)
              : prev.map(i => i.id === id ? { ...i, quantity: qty } : i)
            localStorage.setItem('wearevr_cart', JSON.stringify(updated))
            return updated
          })}
          onUpdateTicketType={(id, ticketTypeId) => setCartItems(prev => {
            const source = prev.find(item => item.id === id)
            const option = source?.ticket_options?.find(item => item.id === ticketTypeId)
            if (!source || !option) return prev
            const nextId = [
              source.show_id,
              source.session_date_key || source.session_date || '',
              source.session_time || '',
              option.id,
            ].join('__')
            const updatedItem = {
              ...source,
              id: nextId,
              ticket_type_id: option.id,
              ticket_type_label: option.label,
              unit_price: option.price,
            }
            const withoutSource = prev.filter(item => item.id !== id)
            const existing = withoutSource.find(item => item.id === nextId)
            const updated = existing
              ? withoutSource.map(item => item.id === nextId
                ? { ...item, quantity: item.quantity + source.quantity }
                : item)
              : [...withoutSource, updatedItem]
            localStorage.setItem('wearevr_cart', JSON.stringify(updated))
            return updated
          })}
          onRemove={(id) => setCartItems(prev => {
            const updated = prev.filter(i => i.id !== id)
            localStorage.setItem('wearevr_cart', JSON.stringify(updated))
            return updated
          })}
          onClose={() => setShowCart(false)}
          onPaymentSuccess={() => {
            setCartItems([])
            localStorage.removeItem('wearevr_cart')
          }}
          onManageBooking={() => {
            setShowCart(false)
            openBookingsPage()
          }}
          resetAuthForm={resetAuthForm}
          setAuthForm={setAuthForm}
          setAuthMode={setAuthMode}
        />
      )}

      {view === 'main' && !showBooking && (
        <div className="floating-cta">
          <button className="cta-pill" onClick={startBookingWithAuth} type="button">{t('buyTicket')}</button>
        </div>
      )}

      {showBackTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">↑</button>
      )}
    </div>
  )
}

export default App
