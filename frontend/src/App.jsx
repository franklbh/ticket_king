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
import { useCustomerAuth } from './hooks/useCustomerAuth'
import { currency } from './utils/format'
import { isReasonableName, isReasonablePhone, isStrictEmail } from './utils/validation'

const couponDiscountFor = (subtotal, coupon) => {
  if (!coupon || subtotal <= 0) return 0
  if (coupon.minPurchase && subtotal < coupon.minPurchase) return 0
  const value = Number(coupon.discountValue) || 0
  const discount = coupon.discountType === 'percent' ? subtotal * value / 100 : value
  return Math.round(Math.max(0, Math.min(discount, subtotal)) * 100) / 100
}

const contactFromUser = (user, currentContact = {}) => {
  if (!user) return currentContact
  const metadata = user.user_metadata || {}
  const fullName = (metadata.name || metadata.full_name || '').trim()
  const parts = fullName.split(/\s+/).filter(Boolean)
  const currentFirst = isReasonableName(currentContact.first || '') ? currentContact.first : ''
  const currentLast = isReasonableName(currentContact.last || '') ? currentContact.last : ''
  const first = metadata.first_name || parts[0] || currentFirst || 'Guest'
  const last = metadata.last_name || parts.slice(1).join(' ') || currentLast || 'Customer'
  return {
    ...currentContact,
    first,
    last,
    email: user.email || currentContact.email || '',
    phone: metadata.phone || currentContact.phone || '',
  }
}

const contactIsValid = (value) => (
  isReasonableName(value.first || '') &&
  isReasonableName(value.last || '') &&
  isStrictEmail(value.email || '') &&
  Boolean((value.phone || '').trim()) &&
  isReasonablePhone(value.phone || '')
)

// ── Main App ─────────────────────────────────────────────────────────────
function App() {
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const [langOpen, setLangOpen] = useState(false)
  const [view, setView] = useState('main')
  const [showBooking, setShowBooking] = useState(false)
  const [step, setStep] = useState('date')
  const [calendarMonth, setCalendarMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [counts, setCounts] = useState(() => ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
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
  const [resumeCartAfterAuth, setResumeCartAfterAuth] = useState(false)
  const [resumeBookingAfterAuth, setResumeBookingAfterAuth] = useState(false)
  const [pendingBookingExperience, setPendingBookingExperience] = useState(null)
  const [cartCheckoutMode, setCartCheckoutMode] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
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
  const ticketCopyKeys = {
    adult:  ['ticketTypeRegular', null, null],
    child:  ['ticketTypeChild',   null, 'childInfo'],
    senior: ['ticketTypeSenior',  null, null],
    family: ['ticketTypeFamily',  null, 'familyInfo'],
    group:  ['ticketTypeGroup',   null, 'groupInfo'],
  }
  const localizedFaqItems = [1, 2, 3, 4, 5, 6].map((idx) => ({ q: t(`faq${idx}Q`), a: t(`faq${idx}A`) }))
  const localizedNewsItems = newsItems.map((item, idx) => ({ ...item, title: t(`news${idx + 1}Title`), body: t(`news${idx + 1}Body`) }))
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
  const localizedTicketTypes = ticketTypes.map((ticket) => ({
    ...ticket,
    price: activePrices[ticket.id],
    label: t(ticketCopyKeys[ticket.id][0]),
    description: currency(activePrices[ticket.id]) + perEach,
    info: ticketCopyKeys[ticket.id][2] ? t(ticketCopyKeys[ticket.id][2]) : undefined,
  }))

  const totals = useMemo(() => {
    const prices = isPeak ? bookingExperience.peakPrices : bookingExperience.offPeakPrices
    const numTickets = ticketTypes.reduce((sum, tk) => sum + counts[tk.id], 0)
    const ticketTotal = ticketTypes.reduce((sum, tk) => sum + counts[tk.id] * prices[tk.id], 0)
    const vipTotal = vipQty * 20
    const subtotal = ticketTotal + vipTotal
    const processingFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * ticketTotal : 0
    const tax = numTickets > 0 ? 0.05 * ticketTotal : 0
    const fees = processingFee + tax
    const discountAmount = couponDiscountFor(subtotal, appliedCoupon)
    return {
      numTickets,
      ticketTotal,
      vipTotal,
      subtotal,
      fees,
      processingFee,
      tax,
      discountAmount,
      couponCode: discountAmount > 0 ? appliedCoupon?.code : null,
      grand: Math.max(0, subtotal - discountAmount + fees),
    }
  }, [counts, vipQty, isPeak, bookingExperience, appliedCoupon])

  const cartCheckoutTotals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    const numTickets = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const processingFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
    const tax = numTickets > 0 ? 0.05 * subtotal : 0
    const discountAmount = couponDiscountFor(subtotal, appliedCoupon)
    return {
      numTickets,
      ticketTotal: subtotal,
      subtotal,
      fees: processingFee + tax,
      processingFee,
      tax,
      discountAmount,
      couponCode: discountAmount > 0 ? appliedCoupon?.code : null,
      grand: Math.max(0, subtotal - discountAmount + processingFee + tax),
    }
  }, [cartItems, appliedCoupon])

  const contactErrors = useMemo(() => {
    const errors = {}
    if (!isReasonableName(contact.first)) errors.first = t('firstNameError')
    if (!isReasonableName(contact.last)) errors.last = t('lastNameError')
    if (!isStrictEmail(contact.email)) errors.email = t('emailError')
    if (!contact.phone.trim() || !isReasonablePhone(contact.phone)) errors.phone = t('phoneError')
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
    if (!currentUser || !resumeCartAfterAuth) return
    const nextContact = contactFromUser(currentUser, contact)
    setContact(nextContact)
    setResumeCartAfterAuth(false)
    setCartCheckoutMode(true)
    setView('main')
    setShowBooking(true)
    setStep(contactIsValid(nextContact) ? 'payment' : 'contact')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [contact, currentUser, resumeCartAfterAuth])

  useEffect(() => {
    if (!currentUser || !resumeBookingAfterAuth) return
    const nextExperience = pendingBookingExperience
    setContact((previous) => contactFromUser(currentUser, previous))
    setResumeBookingAfterAuth(false)
    setPendingBookingExperience(null)
    if (nextExperience) {
      setBookingExperience(nextExperience)
      setCounts(ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
      setVipQty(0)
      setSelectedDate(null)
      setSelectedTime(null)
    }
    setStep('date')
    setView('main')
    setShowBooking(true)
    const n = new Date()
    setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentUser, pendingBookingExperience, resumeBookingAfterAuth])

  useEffect(() => {
    if (!currentUser) return
    setContact((previous) => {
      const nextContact = contactFromUser(currentUser, previous)
      if (
        previous.first === nextContact.first &&
        previous.last === nextContact.last &&
        previous.email === nextContact.email &&
        previous.phone === nextContact.phone
      ) return previous
      return nextContact
    })
  }, [currentUser])

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

  const revealBooking = (experience = null) => {
    const nextExperience = experience && experience.id ? experience : null
    setCartCheckoutMode(false)
    if (!currentUser) {
      setPendingBookingExperience(nextExperience)
      setResumeBookingAfterAuth(true)
      openAuthScreen('login')
      return
    }
    if (nextExperience) {
      setBookingExperience(nextExperience)
      setCounts(ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
      setVipQty(0)
      setSelectedDate(null)
      setSelectedTime(null)
      setStep('date')
    }
    setView('main')
    setShowBooking(true)
    if (!selectedDate) { const n = new Date(); setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1)) }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const backToMain = () => { setCartCheckoutMode(false); setShowBooking(false); setSelectedExperience(null); setView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const backToExperienceSection = () => {
    const sectionId = selectedExperience?.category === 'arcade' ? 'games' : 'experiences'
    setShowBooking(false)
    setSelectedExperience(null)
    setView('main')
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }
  const openExperience = (exp) => { setSelectedExperience(exp); setView('experience'); window.scrollTo({ top: 0, behavior: 'instant' }) }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const switchBookingExperience = (experienceId) => {
    const nextExperience = allExperiences.find((experience) => experience.id === experienceId)
    if (!nextExperience || nextExperience.id === bookingExperience.id) return
    setBookingExperience(nextExperience)
    setSelectedDate(null)
    setSelectedTime(null)
    setCounts(ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
    setRawCounts({})
    setVipQty(0)
    setCouponCode('')
    setCouponMessage('')
    setAppliedCoupon(null)
    setTimeLeft(300)
    setStep('date')
    const n = new Date(); setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  const addExperienceTicketsToCart = ({ experience, selectedDate: date, selectedTime: time, ticketOptions = [], tickets = [], openCart = true }) => {
    if (!experience || !date || !time) return
    const image = experience.heroImg || experience.gallery?.[0]
    const sessionDateKey = date.toISOString().slice(0, 10)
    const sessionDate = date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })
    const cartTicketOptions = (ticketOptions.length ? ticketOptions : tickets).map((ticket) => ({
      id: ticket.id,
      label: ticket.label,
      price: ticket.price,
    }))
    setCartItems((prev) => {
      const sessionMatches = (item) => {
        const itemDateKey = item.session_date_key || item.id?.split('__')?.[1]
        return item.show_id === experience.id && itemDateKey === sessionDateKey && item.session_time === time
      }
      const nextItems = prev.filter((item) => !sessionMatches(item))
      tickets.filter((ticket) => ticket.quantity > 0).forEach((ticket) => {
        const itemId = [experience.id, sessionDateKey, time, ticket.id].join('__')
        const existingIndex = nextItems.findIndex((item) => item.id === itemId)
        if (existingIndex >= 0) {
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            quantity: nextItems[existingIndex].quantity + ticket.quantity,
          }
          return
        }
        nextItems.push({
          id: itemId,
          show_id: experience.id,
          show_title: experience.title,
          session_date_key: sessionDateKey,
          session_date: sessionDate,
          session_time: time,
          ticket_type_id: ticket.id,
          ticket_type_label: ticket.label,
          ticket_options: cartTicketOptions,
          unit_price: ticket.price,
          quantity: ticket.quantity,
          experience_accent: experience.accent,
          experience_category: experience.category,
          experience_gradient: experience.cardGradient,
          experience_image: image,
        })
      })
      localStorage.setItem('wearevr_cart', JSON.stringify(nextItems))
      return nextItems
    })
    if (openCart) setShowCart(true)
  }

  const addBookingSelectionToCart = () => {
    if (!selectedDate || !selectedTime || !bookingExperience) return
    const tickets = localizedTicketTypes
      .filter((ticket) => counts[ticket.id] > 0)
      .map((ticket) => ({
        id: ticket.id,
        label: ticket.label,
        price: ticket.price,
        quantity: counts[ticket.id],
      }))
    addExperienceTicketsToCart({
      experience: bookingExperience,
      selectedDate: selectedDate.date,
      selectedTime: selectedTime.time,
      ticketOptions: localizedTicketTypes.map((ticket) => ({ id: ticket.id, label: ticket.label, price: ticket.price })),
      tickets,
      openCart: true,
    })
  }

  const goToCheckoutReview = () => {
    const nextContact = contactFromUser(currentUser, contact)
    if (currentUser) setContact(nextContact)
    setStep(currentUser && contactIsValid(nextContact) ? 'payment' : 'contact')
  }

  const beginCartCheckout = () => {
    if (!cartItems.length) return
    if (!currentUser) {
      setResumeCartAfterAuth(true)
      setShowCart(false)
      openAuthScreen('login')
      return
    }
    const nextContact = contactFromUser(currentUser, contact)
    setContact(nextContact)
    setShowCart(false)
    setCartCheckoutMode(true)
    setView('main')
    setShowBooking(true)
    setStep(contactIsValid(nextContact) ? 'payment' : 'contact')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const restartBooking = () => {
    setStep('date')
    setSelectedDate(null)
    setSelectedTime(null)
    setVipQty(0)
    setCouponCode('')
    setCouponMessage('')
    setAppliedCoupon(null)
    setTimeLeft(300)
    const n = new Date(); setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  const changeCount = (id, delta) => {
    setCounts((p) => {
      const cur = p[id]
      let next
      if (delta > 0 && cur === 0 && id === 'family') next = 3
      else if (delta > 0 && cur === 0 && id === 'group') next = 6
      else if (delta < 0 && id === 'family' && cur <= 3) next = 0
      else if (delta < 0 && id === 'group' && cur <= 6) next = 0
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
      setCouponLoading(true)
      const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
      const amount = cartCheckoutMode ? cartCheckoutTotals.subtotal : totals.subtotal
      const res = await fetch(`${backendBase}/api/v1/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || data.message || 'Unable to validate coupon.')
      if (!data.valid) {
        setAppliedCoupon(null)
        setCouponMessage(data.message || 'Invalid coupon code.')
        return
      }
      setAppliedCoupon({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase,
      })
      setCouponCode(data.code)
      setCouponMessage(`Coupon applied: ${data.code}`)
    } catch (err) {
      console.error(err)
      setAppliedCoupon(null)
      setCouponMessage('Unable to validate coupon. Please try again.')
    } finally {
      setCouponLoading(false)
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

  const canProceedDate = Boolean(selectedDate)
  const canProceedTime = Boolean(selectedTime)
  const effectiveCount = (id) => rawCounts[id] !== undefined ? Math.max(0, parseInt(rawCounts[id]) || 0) : counts[id]
  const effectiveSubtotal = ticketTypes.reduce((sum, tk) => sum + effectiveCount(tk.id) * activePrices[tk.id], 0)
  const ticketValidationErrors = {
    group: effectiveCount('group') > 0 && effectiveCount('group') < 6 ? 'Group Ticket requires min. 6 people.' : '',
    family: effectiveCount('family') > 0 && effectiveCount('family') < 3 ? 'Family Bundle requires min. 3 people.' : '',
  }
  const hasTicketValidationErrors = Object.values(ticketValidationErrors).some(Boolean)
  const canProceedTickets = effectiveSubtotal > 0 && !hasTicketValidationErrors
  const canProceedContact = Object.keys(contactErrors).length === 0
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const paymentExpired = step === 'payment' && timeLeft === 0
  const bookingSteps = [
    { id: 'date', label: t('date') },
    { id: 'time', label: t('time') },
    { id: 'tickets', label: t('tickets') },
    { id: 'contact', label: t('contact') },
    { id: 'payment', label: t('payment') },
  ]
  const currentStepIndex = bookingSteps.findIndex((item) => item.id === step)

  const startStripeCheckout = () => {
    if (paymentExpired) return
    setShowStripeCheckout(true)
  }

  const startAlphapayCheckout = async (method) => {
    if (paymentExpired) return
    try {
      setAlphapayLoading(true)
      const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
      const paymentRequestId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const checkoutTotals = cartCheckoutMode ? cartCheckoutTotals : totals
      const totalCents = Math.round(checkoutTotals.grand * 100)
      const res = await fetch(`${backendBase}/api/v1/alphapay/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          amount: totalCents,
          payment_request_id: paymentRequestId,
          description: cartCheckoutMode
            ? `${checkoutTotals.numTickets} ticket${checkoutTotals.numTickets !== 1 ? 's' : ''} - WE ARE VR`
            : bookingExperience.title,
        }),
      })
      if (!res.ok) throw new Error('Failed to create QR')
      const data = await res.json()
      setAlphapayQrImage(data.qrImage)
      setShowQr(method)
      const es = new EventSource(`${backendBase}/api/v1/alphapay/events/${paymentRequestId}`)
      alphapayEventSourceRef.current = es
      es.onmessage = (e) => {
        const payload = JSON.parse(e.data)
        if (payload.paid) {
          es.close()
          alphapayEventSourceRef.current = null
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
      langOpen={langOpen}
      selectedLang={selectedLang}
      setLangOpen={setLangOpen}
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
          onOpenCart={() => setShowCart(true)}
          onOpenNav={() => setShowNavMenu(true)}
          onSelectExperience={openExperience}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      )}

      {/* ── Main ── */}
      {view !== 'auth' && view !== 'experience' && (
        <>
          {!showBooking && (
            <MarketingPage
              authReady={authReady}
              cartCount={cartCount}
              currentUser={currentUser}
              faqOpen={faqOpen}
              localizedFaqItems={localizedFaqItems}
              localizedNewsItems={localizedNewsItems}
              newsletterEmail={newsletterEmail}
              newsletterMessage={newsletterMessage}
              onBuyTicket={openExperience}
              onGoHome={() => { setView('main'); setShowBooking(false) }}
              onLogout={logout}
              onOpenAuth={() => openAuthScreen('login')}
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
              bookingExperience={bookingExperience}
              bookingExperiences={allExperiences}
              bookingRef={bookingRef}
              bookingSteps={bookingSteps}
              calendarMonth={calendarMonth}
              canProceedContact={canProceedContact}
              canProceedDate={canProceedDate}
              canProceedTickets={canProceedTickets}
              canProceedTime={canProceedTime}
              cartCheckoutItems={cartItems}
              cartCheckoutMode={cartCheckoutMode}
              cartCheckoutTotals={cartCheckoutTotals}
              changeCalendarMonth={changeCalendarMonth}
              changeCount={changeCount}
              contact={contact}
              contactErrors={contactErrors}
              contactTouched={contactTouched}
              counts={counts}
              appliedCoupon={appliedCoupon}
              couponCode={couponCode}
              couponLoading={couponLoading}
              couponMessage={couponMessage}
              currentStepIndex={currentStepIndex}
              fullDateDisplay={fullDateDisplay}
              localizedTicketTypes={localizedTicketTypes}
              markContactTouched={markContactTouched}
              minutes={minutes}
              monthDisplay={monthDisplay}
              onAddSelectionToCart={addBookingSelectionToCart}
              onBackToCart={() => { setShowBooking(false); setShowCart(true); setCartCheckoutMode(false) }}
              onBookingExperienceChange={switchBookingExperience}
              paymentExpired={paymentExpired}
              rawCounts={rawCounts}
              restartBooking={restartBooking}
              seconds={seconds}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              setContact={setContact}
              setCounts={setCounts}
              setAppliedCoupon={setAppliedCoupon}
              setCouponCode={setCouponCode}
              setCouponMessage={setCouponMessage}
              setRawCounts={setRawCounts}
              setSelectedDate={setSelectedDate}
              setSelectedTime={setSelectedTime}
              setStep={setStep}
              setVipModal={setVipModal}
              startAlphapayCheckout={startAlphapayCheckout}
              startStripeCheckout={startStripeCheckout}
              step={step}
              t={t}
              ticketValidationErrors={ticketValidationErrors}
              totals={cartCheckoutMode ? cartCheckoutTotals : totals}
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
          onContinue={() => { setVipModal(false); goToCheckoutReview() }}
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
      {showNavMenu && <NavMenu onClose={() => setShowNavMenu(false)} onBuyTicket={revealBooking} onNavigateToSection={navigateToMainSection} t={t} />}

      {showStripeCheckout && (
        <StripeCheckout
          orderData={{
            orderId: `WEAREVR-${Date.now().toString().slice(-12)}`,
            amount: cartCheckoutMode ? cartCheckoutTotals.grand : totals.grand,
            description: cartCheckoutMode
              ? `${cartCheckoutTotals.numTickets} ticket${cartCheckoutTotals.numTickets !== 1 ? 's' : ''} - WE ARE VR`
              : `Tickets for ${bookingExperience.title}`,
            date: cartCheckoutMode ? null : selectedDate ? fullDateDisplay(selectedDate.date) : null,
            time: cartCheckoutMode ? null : selectedTime?.time || null,
            email: contact.email,
          }}
          onClose={() => setShowStripeCheckout(false)}
          onSuccess={() => {
            setShowStripeCheckout(false)
            if (cartCheckoutMode) {
              setCartItems([])
              localStorage.removeItem('wearevr_cart')
            }
            setAppliedCoupon(null)
            setCouponCode('')
            setCouponMessage('')
            backToMain()
          }}
        />
      )}

      {showCart && (
        <Cart
          items={cartItems}
          allExperiences={allExperiences}
          onAddItem={addExperienceTicketsToCart}
          onUpdateQty={(id, qty) => setCartItems(prev => {
            const source = prev.find(i => i.id === id)
            const minQty = source?.ticket_type_id === 'group' ? 6 : source?.ticket_type_id === 'family' ? 3 : 0
            const nextQty = minQty && qty > 0 && qty < minQty ? minQty : qty
            const updated = nextQty <= 0
              ? prev.filter(i => i.id !== id)
              : prev.map(i => i.id === id ? { ...i, quantity: nextQty } : i)
            localStorage.setItem('wearevr_cart', JSON.stringify(updated))
            return updated
          })}
          onUpdateTicketType={(id, ticketTypeId) => setCartItems(prev => {
            const source = prev.find(item => item.id === id)
            const option = source?.ticket_options?.find(item => item.id === ticketTypeId)
            if (!source || !option) return prev
            const sessionDateKey = source.session_date_key || source.id?.split('__')?.[1] || ''
            const nextId = [
              source.show_id,
              sessionDateKey,
              source.session_time || '',
              option.id,
            ].join('__')
            const minQty = option.id === 'group' ? 6 : option.id === 'family' ? 3 : 0
            const updatedItem = {
              ...source,
              id: nextId,
              session_date_key: sessionDateKey,
              ticket_type_id: option.id,
              ticket_type_label: option.label,
              unit_price: option.price,
              quantity: minQty ? Math.max(source.quantity, minQty) : source.quantity,
            }
            const withoutSource = prev.filter(item => item.id !== id)
            const existing = withoutSource.find(item => item.id === nextId)
            const updated = existing
              ? withoutSource.map(item => item.id === nextId
                ? { ...item, quantity: item.quantity + updatedItem.quantity }
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
          onCheckout={beginCartCheckout}
        />
      )}

      {view === 'main' && !showBooking && (
        <div className="floating-cta">
          <button className="cta-pill" onClick={revealBooking} type="button">{t('buyTicket')}</button>
        </div>
      )}

      {showBackTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">↑</button>
      )}
    </div>
  )
}

export default App
