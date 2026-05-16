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
import { vrExperiences } from './data/experiences'
import AuthPage from './pages/AuthPage'
import BookingPage from './pages/BookingPage'
import ExperienceDetailPage from './pages/ExperienceDetailPage'
import MarketingPage from './pages/MarketingPage'
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

function isoDate(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  const [availableSlots, setAvailableSlots] = useState([])
  const [availableSlotsLoading, setAvailableSlotsLoading] = useState(false)
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
  const [showCartCheckout, setShowCartCheckout] = useState(false)
  const [cartCheckoutContact, setCartCheckoutContact] = useState({ first: '', last: '', email: '', phone: '' })
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
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
    return { numTickets, ticketTotal, vipTotal, subtotal, fees, processingFee, tax, grand: subtotal + fees }
  }, [counts, vipQty, isPeak, bookingExperience])

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
    setTimeLeft(300)
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    if (!selectedDate || !bookingExperience?.id) {
      setAvailableSlots([])
      return undefined
    }
    const eventSlug = BACKEND_EVENT_SLUGS[bookingExperience.id]
    if (!eventSlug) {
      setAvailableSlots([])
      return undefined
    }
    const controller = new AbortController()
    const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
    setAvailableSlotsLoading(true)
    fetch(`${backendBase}/api/v1/events/${eventSlug}/slots?date=${isoDate(selectedDate.date)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((slots) => {
        if (!controller.signal.aborted) {
          setAvailableSlots(Array.isArray(slots) ? slots : [])
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err)
          setAvailableSlots([])
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

  const revealBooking = (experience = null) => {
    const nextExperience = experience && experience.id ? experience : null
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

  const backToMain = () => { setShowBooking(false); setSelectedExperience(null); setView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openExperience = (exp) => { setSelectedExperience(exp); setView('experience'); window.scrollTo({ top: 0, behavior: 'instant' }) }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const switchBookingExperience = (experienceId) => {
    const nextExperience = vrExperiences.find((experience) => experience.id === experienceId)
    if (!nextExperience || nextExperience.id === bookingExperience.id) return
    setBookingExperience(nextExperience)
    setSelectedDate(null)
    setSelectedTime(null)
    setCounts(ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
    setRawCounts({})
    setVipQty(0)
    setCouponCode('')
    setCouponMessage('')
    setTimeLeft(300)
    setStep('date')
    const n = new Date(); setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  const restartBooking = () => {
    setStep('date')
    setSelectedDate(null)
    setSelectedTime(null)
    setVipQty(0)
    setTimeLeft(300)
    const n = new Date(); setCalendarMonth(new Date(n.getFullYear(), n.getMonth(), 1))
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
  const applyCoupon = () => {
    const code = couponCode.trim()
    setCouponMessage(code ? t('couponUnavailable', { code }) : t('couponFirst'))
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
  const canProceedTickets = effectiveSubtotal > 0
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
      const totalCents = Math.round(totals.grand * 100)
      const order = selectedTime?.slotId ? {
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
        totalAmount: totals.grand,
      } : undefined
      const payload = {
        method,
        amount: totalCents,
        description: bookingExperience.title,
        ...(order ? { order } : { payment_request_id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }),
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
          currentUser={currentUser}
          experience={selectedExperience}
          onBack={backToMain}
          onBuyTicket={revealBooking}
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
              onBuyTicket={revealBooking}
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
              availableSlots={availableSlots}
              availableSlotsLoading={availableSlotsLoading}
              bookingExperience={bookingExperience}
              bookingExperiences={vrExperiences}
              bookingRef={bookingRef}
              bookingSteps={bookingSteps}
              calendarMonth={calendarMonth}
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
              onBookingExperienceChange={switchBookingExperience}
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
              setRawCounts={setRawCounts}
              setSelectedDate={setSelectedDate}
              setSelectedTime={setSelectedTime}
              setStep={setStep}
              setVipModal={setVipModal}
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
      {showNavMenu && <NavMenu onClose={() => setShowNavMenu(false)} onBuyTicket={revealBooking} onNavigateToSection={navigateToMainSection} t={t} />}

      {showStripeCheckout && (
        <StripeCheckout
          orderData={{
            orderId: `WEAREVR-${Date.now().toString().slice(-12)}`,
            amount: totals.grand,
            description: `Tickets for ${bookingExperience.title}`,
            date: selectedDate ? fullDateDisplay(selectedDate.date) : null,
            time: selectedTime?.time || null,
            email: contact.email,
          }}
          onClose={() => setShowStripeCheckout(false)}
          onSuccess={() => { setShowStripeCheckout(false); backToMain(); }}
        />
      )}

      {showCart && (
        <Cart
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
              source.session_date || '',
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
          onCheckout={(checkoutContact) => {
            setCartCheckoutContact(checkoutContact)
            setShowCart(false)
            setShowCartCheckout(true)
          }}
        />
      )}

      {showCartCheckout && (() => {
        const sub = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
        const n   = cartItems.reduce((s, i) => s + i.quantity, 0)
        const grand = sub + (n > 0 ? 1.8 * n + 0.04 * sub + 0.05 * sub : 0)
        return (
          <StripeCheckout
            orderData={{
              orderId: `WEAREVR-${Date.now().toString().slice(-12)}`,
              amount: grand,
              description: `${n} ticket${n !== 1 ? 's' : ''} · WE ARE VR`,
              email: cartCheckoutContact.email || contact.email,
              customerName: [cartCheckoutContact.first, cartCheckoutContact.last].filter(Boolean).join(' '),
            }}
            onClose={() => setShowCartCheckout(false)}
            onSuccess={() => {
              setShowCartCheckout(false)
              setCartItems([])
              localStorage.removeItem('wearevr_cart')
              backToMain()
            }}
          />
        )
      })()}

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
