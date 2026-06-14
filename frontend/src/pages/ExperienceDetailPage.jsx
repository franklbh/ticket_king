import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import HeaderActions from '../components/HeaderActions'
import { allExperiences } from '../data/experiences'
import { getExperiencePriceFrom, getPricesForSlot, getSlotPricePeriod, hasSeniorTicket } from '../utils/pricing'
import { formatSlotTicketTypes, ticketKeyFromLabel } from '../utils/tickets'
import { businessTodayDate, isoDate } from '../utils/businessDate'

/* ── Helpers ── */
function Stars({ rating, size = 14 }) {
  return (
    <span className="exp2-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24"
          fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

function CartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

/* ── Video Modal ── */
function VideoModal({ src, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="exp2-modal-overlay" onClick={onClose}>
      <div className="exp2-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="exp2-modal-close" onClick={onClose} type="button" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <video controls autoPlay className="exp2-modal-video">
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

/* ── Lightbox ── */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [images.length, onClose])
  return (
    <div className="exp2-lightbox-overlay" onClick={onClose}>
      <div className="exp2-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="exp2-lb-close" onClick={onClose} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button className="exp2-lb-nav exp2-lb-prev" onClick={prev} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <img src={images[idx]} alt="" className="exp2-lb-img" />
        <button className="exp2-lb-nav exp2-lb-next" onClick={next} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div className="exp2-lb-counter">{idx + 1} / {images.length}</div>
      </div>
    </div>
  )
}

/* ── Booking Widget ── */
const BACKEND_EVENT_SLUGS = {
  'terracotta-warriors': 'terracotta-warriors',
  panda: 'panda-vr',
  dragon: 'dino-vr',
  'cyber-arena': 'game-a',
  'space-odyssey': 'game-b',
  'ocean-quest': 'game-c',
}

const DISPLAY_TICKET_LABELS = {
  adult: 'Adult',
  child: 'Child',
  senior: 'Senior',
  group: 'Group',
  family: 'Family',
}

const TICKET_LABEL_KEYS = {
  adult: 'ticketTypeRegular',
  child: 'ticketTypeChild',
  senior: 'ticketTypeSenior',
  group: 'ticketTypeGroup',
  family: 'ticketTypeFamily',
}

const TICKET_DESC_KEYS = {
  adult: 'age18Plus',
  child: 'ages7To15',
  senior: 'senior65Plus',
  group: 'guests6Plus',
  family: 'familyBundle3Plus',
}

function BookingWidget({ experience, cartItems, onAddToCart, t = (key, params = {}) => Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), key) }) {
  const today = businessTodayDate()
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateKey = isoDate
  const monthOptions = Array.from({ length: 6 }, (_, i) => new Date(today.getFullYear(), today.getMonth() + i, 1))
  const [selMonthKey, setSelMonthKey] = useState(`${today.getFullYear()}-${today.getMonth()}`)
  const [selDateKey, setSelDateKey] = useState(() => dateKey(today))
  const [selTime, setSelTime] = useState(null)
  const [qty, setQty] = useState(() => ['adult', 'child', 'senior', 'group', 'family'].reduce((acc, id) => ({ ...acc, [id]: 0 }), {}))
  const [rawQty, setRawQty] = useState({})
  const [showAddedNotice, setShowAddedNotice] = useState(false)
  const [backendSlots, setBackendSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [showAllTimeSlots, setShowAllTimeSlots] = useState(false)
  const cartSyncedSessionRef = useRef(null)

  const selectedMonth = monthOptions.find((month) => `${month.getFullYear()}-${month.getMonth()}` === selMonthKey) || monthOptions[0]
  const monthStartDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay()
  const days = Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate() }, (_, i) => {
    const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1)
    return d >= today ? d : null
  }).filter(Boolean)
  const selectedDate = days.find((d) => dateKey(d) === selDateKey) || days[0]
  const selectedDateKey = selectedDate ? dateKey(selectedDate) : ''
  const prices = getPricesForSlot(experience, selectedDate)
  const fallbackTicketTypes = useMemo(() => [
    { id: 'adult',  label: 'Adult',  desc: 'Ages 18+', price: prices.adult ?? 37.95 },
    { id: 'child',  label: 'Child',  desc: 'Ages 7–15', price: prices.child ?? 27.95 },
    ...(hasSeniorTicket(experience)
      ? [{ id: 'senior', label: 'Senior', desc: '65+ years', price: prices.senior ?? prices.adult ?? 37.95 }]
      : []),
    { id: 'group',  label: 'Group',  desc: '6+ guests', price: prices.group ?? 32.95, minQty: 6, notice: 'min. 6 people required.' },
    { id: 'family', label: 'Family', desc: '3+ family bundle', price: prices.family ?? 31.95, minQty: 3, notice: 'Ticket for min. 3 people, max. 2 adults.' },
  ], [experience, prices.adult, prices.child, prices.family, prices.group, prices.senior])
  const TICKET_TYPES = useMemo(() => {
    const selectedSlotHasTicketTypes = selTime && ('ticketTypes' in selTime || 'ticket_types' in selTime)
    return formatSlotTicketTypes(selTime?.ticketTypes || selTime?.ticket_types || [], { fallback: selectedSlotHasTicketTypes ? [] : fallbackTicketTypes })
    .map((ticket) => {
      const key = ticket.key || ticketKeyFromLabel(ticket.label)
      const desc = TICKET_DESC_KEYS[key] ? t(TICKET_DESC_KEYS[key]) : ticket.desc
      const notice = ticket.notice || (
        key === 'group' ? t('minPeopleRequired', { count: 6 })
          : key === 'family' ? t('familyMinRequired')
            : undefined
      )
      return { ...ticket, key, label: TICKET_LABEL_KEYS[key] ? t(TICKET_LABEL_KEYS[key]) : (DISPLAY_TICKET_LABELS[key] || ticket.label), desc, notice }
    })
  }, [fallbackTicketTypes, selTime, t])
  const calendarCells = [
    ...Array.from({ length: monthStartDay }, (_, idx) => ({ key: `blank-${idx}`, blank: true })),
    ...Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate() }, (_, i) => {
      const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1)
      const disabled = d < today
      const weekend = getSlotPricePeriod(experience, d) === 'weekend'
      return {
        key: dateKey(d),
        date: d,
        day: i + 1,
        disabled,
        price: getPricesForSlot(experience, d).adult ?? 37.95,
        best: !weekend,
      }
    }),
  ]
  const totalQty = Object.values(qty).reduce((s, n) => s + n, 0)
  const totalPrice = TICKET_TYPES.reduce((s, t) => s + (qty[t.id] || 0) * t.price, 0)
  const invalidTicketSelections = TICKET_TYPES.filter((ticket) => ticket.minQty && (qty[ticket.id] || 0) > 0 && (qty[ticket.id] || 0) < ticket.minQty)
  const canAddToCart = Boolean(selectedDate && selTime && totalQty > 0 && invalidTicketSelections.length === 0)
  const visibleBackendSlots = showAllTimeSlots ? backendSlots : backendSlots.slice(0, 8)
  const ticketOptions = TICKET_TYPES.map((ticket) => ({ id: ticket.id, label: ticket.label, price: ticket.price, minQty: ticket.minQty }))
  const ticketsFromQuantities = (quantities) => TICKET_TYPES
    .filter((ticket) => quantities[ticket.id] > 0)
    .map((ticket) => ({ ...ticket, quantity: quantities[ticket.id] }))

  useEffect(() => {
    setQty((previous) => TICKET_TYPES.reduce((acc, ticket) => ({ ...acc, [ticket.id]: previous[ticket.id] || 0 }), {}))
    setRawQty((previous) => TICKET_TYPES.reduce((acc, ticket) => (
      previous[ticket.id] === undefined ? acc : { ...acc, [ticket.id]: previous[ticket.id] }
    ), {}))
  }, [TICKET_TYPES])
  const getCartQuantitiesForSession = useCallback((sessionDateKey, slot) => {
    const nextQty = TICKET_TYPES.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
    if (!sessionDateKey || !slot) return { nextQty, hasItems: false }
    const slotId = slot.id || slot.slot_id || slot.slotId
    const slotLabel = slot.label || slot.time || slot.startTime
    let hasItems = false
    cartItems.forEach((item) => {
      const itemDateKey = item.session_date_key || item.id?.split('__')?.[1]
      const itemSlotId = item.slot_id || item.slotId
      const sameSlot = itemSlotId && slotId ? itemSlotId === slotId : item.session_time === slotLabel
      if (item.show_id !== experience.id || itemDateKey !== sessionDateKey || !sameSlot) return
      if (nextQty[item.ticket_type_id] === undefined) return
      nextQty[item.ticket_type_id] += item.quantity
      hasItems = true
    })
    return { nextQty, hasItems }
  }, [TICKET_TYPES, cartItems, experience.id])

  const changeQty = (ticket, delta) => {
    const current = qty[ticket.id] || 0
    let nextValue
    if (delta > 0 && current === 0 && ticket.minQty) nextValue = ticket.minQty
    else if (delta < 0 && ticket.minQty && current <= ticket.minQty) nextValue = 0
    else nextValue = Math.max(0, current + delta)
    const nextQty = { ...qty, [ticket.id]: nextValue }
    setQty(nextQty)
    setRawQty((previous) => {
      const nextRawQty = { ...previous }
      delete nextRawQty[ticket.id]
      return nextRawQty
    })
    setShowAddedNotice(false)
  }

  const setTicketQty = (ticket, value) => {
    if (!/^\d*$/.test(value)) return
    const normalizedValue = value.replace(/^0+(?=\d)/, '')
    const parsed = normalizedValue === '' ? 0 : Math.max(0, parseInt(normalizedValue, 10) || 0)
    const nextQty = { ...qty, [ticket.id]: parsed }
    setRawQty((previous) => ({ ...previous, [ticket.id]: normalizedValue }))
    setQty(nextQty)
    setShowAddedNotice(false)
  }

  const commitTicketQty = (ticket) => {
    setRawQty((previous) => {
      const nextRawQty = { ...previous }
      delete nextRawQty[ticket.id]
      return nextRawQty
    })
  }

  const addSelectionToCart = () => {
    if (!canAddToCart) return
    onAddToCart({
      experience,
      selectedDate,
      selectedTime: selTime,
      ticketOptions,
      tickets: ticketsFromQuantities(qty),
      openCart: false,
    })
    setShowAddedNotice(true)
  }

  useEffect(() => {
    if (selectedDate) setSelDateKey(dateKey(selectedDate))
  }, [selMonthKey, selectedDate])

  useEffect(() => {
    if (!selectedDateKey || !selTime) return
    const { nextQty, hasItems } = getCartQuantitiesForSession(selectedDateKey, selTime)
    const sessionKey = `${experience.id}__${selectedDateKey}__${selTime.id || selTime.label || selTime.time || ''}`
    setQty(nextQty)
    setRawQty({})
    cartSyncedSessionRef.current = hasItems ? sessionKey : null
  }, [selectedDateKey, selTime, experience.id, getCartQuantitiesForSession])

  useEffect(() => {
    if (!selectedDateKey || !selTime) return
    const sessionKey = `${experience.id}__${selectedDateKey}__${selTime.id || selTime.label || selTime.time || ''}`
    const { nextQty, hasItems } = getCartQuantitiesForSession(selectedDateKey, selTime)
    if (!hasItems && cartSyncedSessionRef.current !== sessionKey) return
    setQty(nextQty)
    setRawQty({})
    cartSyncedSessionRef.current = hasItems ? sessionKey : null
  }, [cartItems, selectedDateKey, selTime, experience.id, getCartQuantitiesForSession])

  useEffect(() => {
    const slug = BACKEND_EVENT_SLUGS[experience.id]
    if (!slug || !selectedDateKey) {
      setBackendSlots([])
      return
    }
    const controller = new AbortController()
    const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
    setSlotsLoading(true)
    setSelTime(null)
    setShowAllTimeSlots(false)
    fetch(`${backendBase}/api/v1/events/${slug}/slots?date=${selectedDateKey}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((slots) => {
        if (!controller.signal.aborted) setBackendSlots(Array.isArray(slots) ? slots : [])
      })
      .catch((err) => { if (err.name !== 'AbortError') setBackendSlots([]) })
      .finally(() => { if (!controller.signal.aborted) setSlotsLoading(false) })
    return () => controller.abort()
  }, [selectedDateKey, experience.id])

  return (
    <div className="bw-widget">
      <div className="bw-inner">
        <div className="bw-head">{t('selectDateSession')}</div>

        <div className="bw-month-row" aria-label="Select month">
          {monthOptions.map((month) => {
            const key = `${month.getFullYear()}-${month.getMonth()}`
            return (
              <button
                key={key}
                className={`bw-month-btn ${selMonthKey === key ? 'bw-month-sel' : ''}`}
                onClick={() => setSelMonthKey(key)}
                type="button"
              >
                {MONTH_LABELS[month.getMonth()]} {month.getFullYear()}
              </button>
            )
          })}
        </div>

        <div className="bw-calendar" aria-label="Select date">
          <div className="bw-weekdays" aria-hidden="true">
            {DAY_LABELS.map((label) => <span key={label}>{label.slice(0, 1)}</span>)}
          </div>
          <div className="bw-month-grid">
            {calendarCells.map((cell) => {
              if (cell.blank) return <span key={cell.key} className="bw-cal-blank" aria-hidden="true" />
              const selected = selDateKey === cell.key
              return (
                <button
                  key={cell.key}
                  className={`bw-cal-day ${selected ? 'bw-cal-sel' : ''} ${cell.disabled ? 'bw-cal-disabled' : ''}`}
                  onClick={() => !cell.disabled && setSelDateKey(cell.key)}
                  disabled={cell.disabled}
                  type="button"
                >
                  <span className="bw-cal-num">{cell.day}</span>
                  {!cell.disabled && <span className="bw-cal-price">${Math.round(cell.price)}</span>}
                  {!cell.disabled && <span className={`bw-cal-line ${cell.best ? 'best' : 'low'}`} />}
                </button>
              )
            })}
          </div>
          <div className="bw-calendar-legend">
            <span><i className="best" />{t('bestPrice')}</span>
            <span><i className="low" />{t('lowAvailability')}</span>
          </div>
        </div>

        {/* Time slots */}
        <div className="bw-time-grid">
          {slotsLoading && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: '8px 0' }}>{t('loadingSessions')}</div>}
          {!slotsLoading && backendSlots.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: '8px 0' }}>{t('noSessionsForDate')}</div>}
          {visibleBackendSlots.map((slot) => (
            <button
              key={slot.id || slot.label}
              className={`bw-time-btn ${selTime?.id === slot.id ? 'bw-time-sel' : ''}`}
              onClick={() => setSelTime((prev) => (prev?.id === slot.id ? null : slot))}
              type="button"
            >
              {slot.label}
              {slot.availableSeats != null && slot.availableSeats <= 5 && <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>{t('onlyLeft', { count: slot.availableSeats })}</span>}
            </button>
          ))}
          {!slotsLoading && backendSlots.length > 8 && (
            <button className="bw-expand-slots" onClick={() => setShowAllTimeSlots((open) => !open)} type="button">
              {showAllTimeSlots ? t('showFewerTimeSlots') : t('expandOtherTimeSlots', { count: backendSlots.length - 8 })}
            </button>
          )}
        </div>

        {/* Ticket types */}
        <div className="bw-tickets">
          {TICKET_TYPES.map((ticket) => {
            const quantity = qty[ticket.id] || 0
            const isInvalid = ticket.minQty && quantity > 0 && quantity < ticket.minQty
            return (
              <div key={ticket.id} className={`bw-ticket-row ${isInvalid ? 'bw-ticket-row-invalid' : ''}`}>
                <div className="bw-ticket-info">
                  <span className="bw-ticket-title-line">
                    <span className="bw-ticket-label">{ticket.label}</span>
                    {ticket.notice && (
                      <span className="bw-ticket-notice-wrap">
                        <button className="bw-ticket-notice-icon" type="button" aria-label={ticket.notice}>!</button>
                        <span className="bw-ticket-notice" role="tooltip">{ticket.notice}</span>
                      </span>
                    )}
                  </span>
                  <span className="bw-ticket-desc">{ticket.desc}</span>
                </div>
                <div className="bw-ticket-right">
                  <span className="bw-ticket-price">${ticket.price.toFixed(2)}</span>
                  <div className="bw-qty">
                    <button className="bw-qty-btn" onClick={() => changeQty(ticket, -1)} disabled={quantity === 0} type="button">−</button>
                    <input
                      className="bw-qty-num"
                      type="text"
                      min="0"
                      inputMode="numeric"
                      value={rawQty[ticket.id] !== undefined ? rawQty[ticket.id] : quantity}
                      onChange={(event) => setTicketQty(ticket, event.target.value)}
                      onBlur={() => commitTicketQty(ticket)}
                      aria-label={`${ticket.label} quantity`}
                    />
                    <button className="bw-qty-btn" onClick={() => changeQty(ticket, 1)} type="button">+</button>
                  </div>
                </div>
                {isInvalid && (
                  <div className="ticket-validation-warning bw-ticket-warning">
                    {t('ticketRequiresMin', { label: ticket.label, count: ticket.minQty })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Total */}
        {totalQty > 0 && (
          <div className="bw-total">
            <span>{totalQty} ticket{totalQty !== 1 ? 's' : ''}</span>
            <span className="bw-total-price">${totalPrice.toFixed(2)}</span>
          </div>
        )}

        {/* CTA */}
        <button
          className="bw-cta"
          onClick={addSelectionToCart}
          disabled={!canAddToCart}
          type="button"
        >
          {totalQty > 0
            ? `$${totalPrice.toFixed(2)} - ${t('addToCart')}`
            : t('addToCart')}
        </button>
        {showAddedNotice && (
          <div className="bw-added-notice-overlay" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('cartUpdated')}>
            <div className="bw-added-notice">
              <button className="bw-added-notice-close" onClick={() => setShowAddedNotice(false)} type="button" aria-label={t('close')}>{t('close')}</button>
              <div className="bw-added-notice-icon"><CartIcon /></div>
              <h3>{t('addedToCart')}</h3>
              <p>{t('addedToCartCopy')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Mini Experience Card (for Similar Experiences) ── */
function MiniExpCard({ exp, onSelect, t }) {
  return (
    <div className="exp2-mini-card" onClick={() => onSelect(exp)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(exp) }}>
      <div className="exp2-mini-img-wrap">
        {exp.heroImg
          ? <div className="exp2-mini-img" style={{ backgroundImage: `url(${exp.heroImg})` }} />
          : <div className="exp2-mini-img" style={{ background: exp.cardGradient }} />}
      </div>
      <div className="exp2-mini-body">
        <div className="exp2-mini-meta">⏱ {exp.duration} {t('minuteShort')} · {t('agesMin', { min: exp.minAge })}</div>
        <div className="exp2-mini-title">{exp.title}</div>
        <div className="exp2-mini-price">{t('from')} <strong>${getExperiencePriceFrom(exp).toFixed(2)}</strong></div>
      </div>
    </div>
  )
}

/* ── Main Component ── */
function ExperienceDetailPage({
  experience,
  onBack,
  onBuyTicket,
  onSelectExperience,
  authReady,
  cartCount,
  cartItems,
  currentUser,
  experiences = allExperiences,
  onLogout,
  onOpenAuth,
  onOpenBookings,
  onOpenCart,
  onOpenNav,
  renderLangSelect,
  selectedLang,
  t,
}) {
  const [showVideo, setShowVideo] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [showAllGallery, setShowAllGallery] = useState(false)
  const [bookingBeforeDetails, setBookingBeforeDetails] = useState(false)

  const similar = experiences.filter((e) => e.id !== experience.id)
  const videoLanguage = selectedLang?.code === 'zh-Hans' || selectedLang?.code === 'zh-Hant' ? 'zh' : 'en'
  const demoVideo = experience.demoVideos?.[videoLanguage] || experience.demoVideo

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [experience.id])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const updateLayout = () => setBookingBeforeDetails(query.matches)
    updateLayout()
    query.addEventListener('change', updateLayout)
    return () => query.removeEventListener('change', updateLayout)
  }, [])

  const gallery = experience.gallery
  const mainImg = experience.heroImg || null
  const gridImgs = gallery.slice(0, 4)

  return (
    <div className="exp2-page">
      {/* ── Topbar ── */}
      <header className="exp2-topbar">
        <button className="exp2-back-btn" onClick={onBack} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          All Experiences
        </button>
        <button className="exp2-logo-btn" onClick={onBack} type="button">
          <BrandLogo height={44} />
        </button>
        <HeaderActions
          authReady={authReady}
          cartCount={cartCount}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenAuth={onOpenAuth}
          onOpenBookings={onOpenBookings}
          onOpenCart={onOpenCart}
          onOpenNav={onOpenNav}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      </header>

      {/* ── Photo Grid ── */}
      <div className="exp2-photo-grid">
        {/* Main image */}
        <button
          className="exp2-photo-main"
          onClick={() => demoVideo ? setShowVideo(true) : setLightboxIdx(0)}
          type="button"
          aria-label={t('playDemoVideo')}
        >
          {mainImg
            ? <div className="exp2-photo-fill" style={{ backgroundImage: `url(${mainImg})` }} />
            : <div className="exp2-photo-fill exp2-photo-gradient" style={{ background: experience.cardGradient }} />}
          <div className="exp2-photo-overlay" />
          {demoVideo && (
            <div className="exp2-play-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          )}
        </button>

        {/* Mini grid */}
        <div className="exp2-photo-mini-grid">
          {gridImgs.map((src, i) => (
            <button
              key={i}
              className="exp2-photo-mini"
              onClick={() => setLightboxIdx(i)}
              type="button"
              aria-label={t('photoLabel', { count: i + 1 })}
            >
              <div className="exp2-photo-fill" style={{ backgroundImage: `url(${src})` }} />
              {i === 3 && gallery.length > 4 && (
                <div className="exp2-photo-more-overlay">
                  +{t('photoCount', { count: gallery.length - 4 })}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Gallery button */}
        <button className="exp2-gallery-btn" onClick={() => setLightboxIdx(0)} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          {t('galleryTitle')}
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="exp2-layout">
        {/* ── LEFT: Main content ── */}
        <div className="exp2-main-col">

          {/* Title section */}
          <div className="exp2-title-section exp2-reveal">
            <div className="exp2-badges-row">
              {experience.featured && <span className="exp2-badge-pill exp2-badge-featured">Featured</span>}
              <span className="exp2-badge-pill" style={{ color: experience.accent, background: `${experience.accent}14`, borderColor: `${experience.accent}30` }}>
                {experience.badge}
              </span>
            </div>
            <h1 className="exp2-title">{experience.title}</h1>
            <p className="exp2-subtitle">{experience.subtitle}</p>
            <div className="exp2-rating-row">
              <Stars rating={experience.rating} size={16} />
              <strong>{experience.rating}</strong>
              <span className="exp2-review-count">({experience.reviewCount} reviews)</span>
              <span className="exp2-dot">·</span>
              <span className="exp2-tagline">{experience.tagline}</span>
            </div>
          </div>

          {bookingBeforeDetails && (
            <div className="exp2-mobile-booking">
              <BookingWidget experience={experience} cartItems={cartItems} onAddToCart={onBuyTicket} t={t} />
            </div>
          )}

          {/* About */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('aboutExperience')}</h2>
            <p className="exp2-description">{experience.description}</p>
            <p className="exp2-description exp2-desc-long">{experience.longDescription}</p>
          </section>

          {/* General Info */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('generalInfo')}</h2>
            <ul className="exp2-info-list">
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <strong>{t('durationLabel')}:</strong> {experience.duration} {t('minuteShort')} — {experience.difficulty === 'Easy' ? t('easyIntensity') : experience.difficulty}
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <strong>{t('minimumAge')}:</strong> {experience.minAge}+
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <strong>{t('groupSizeLabel')}:</strong> {experience.groupSize} {t('people')}
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <strong>{t('languageLabel')}:</strong> {experience.languages.join(' · ')}
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <strong>{t('venueLabel')}:</strong> Lansdowne Centre · Unit 210-5300 No.3 Rd, Richmond BC
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <strong>{t('hoursLabel')}:</strong> Sun–Thu 10 AM–7 PM · Fri–Sat 10 AM–8 PM
              </li>
            </ul>
          </section>

          {/* Highlights */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('highlightsTitle')}</h2>
            <div className="exp2-highlights-grid">
              {experience.highlights.map((h) => (
                <div key={h} className="exp2-highlight-card">
                  <div className="exp2-highlight-dot" style={{ background: experience.accent }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </section>

          {/* What to expect */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('whatToExpectTitle')}</h2>
            <div className="exp2-expect-grid">
              {experience.whatToExpect.map((item) => (
                <div key={item.label} className="exp2-expect-card">
                  <span className="exp2-expect-icon">{item.icon}</span>
                  <div>
                    <div className="exp2-expect-label">{item.label}</div>
                    <div className="exp2-expect-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Your journey timeline */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('yourJourney')}</h2>
            <div className="exp2-timeline">
              {[
                { step: '01', title: t('journeyArriveTitle'), desc: t('journeyArriveDesc') },
                { step: '02', title: t('journeyBriefingTitle'), desc: t('journeyBriefingDesc') },
                { step: '03', title: t('journeyDiveTitle', { title: experience.title }), desc: t('journeyDiveDesc', { duration: experience.duration, tagline: experience.tagline }) },
                { step: '04', title: t('journeyDebriefTitle'), desc: t('journeyDebriefDesc') },
              ].map((item) => (
                <div key={item.step} className="exp2-timeline-row">
                  <div className="exp2-timeline-step" style={{ color: experience.accent, borderColor: `${experience.accent}30` }}>{item.step}</div>
                  <div>
                    <div className="exp2-timeline-title">{item.title}</div>
                    <div className="exp2-timeline-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery strip */}
          <section className="exp2-section exp2-reveal">
            <div className="exp2-section-head-row">
              <h2 className="exp2-section-h">{t('galleryTitle')}</h2>
              <button className="exp2-see-all-btn" onClick={() => setShowAllGallery((value) => !value)} type="button">
                {showAllGallery ? t('showFewer') : t('seeAllPhotos')}
              </button>
            </div>
            <div className="exp2-gallery-strip">
              {(showAllGallery ? gallery : gallery.slice(0, 4)).map((src, i) => (
                <button key={i} className="exp2-gallery-thumb" onClick={() => setLightboxIdx(i)} type="button">
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('userReviews')}</h2>
            <div className="exp2-rating-summary">
              <span className="exp2-big-rating">{experience.rating}</span>
              <div>
                <Stars rating={experience.rating} size={18} />
                <div className="exp2-rating-based">{t('basedOnReviews', { count: experience.reviewCount })}</div>
              </div>
            </div>
            <div className="exp2-review-scroll">
              {experience.reviews.map((r) => (
                <div key={r.name} className="exp2-review-card">
                  <div className="exp2-review-head">
                    <img src={r.img} alt={r.name} className="exp2-review-avatar" />
                    <div>
                      <div className="exp2-review-name">{r.name}</div>
                      <Stars rating={r.rating} size={13} />
                    </div>
                  </div>
                  <p className="exp2-review-text">"{r.quote}"</p>
                </div>
              ))}
            </div>
          </section>

          {/* Need help */}
          <section className="exp2-section exp2-reveal exp2-help-section">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <div className="exp2-help-title">{t('needHelp')}</div>
              <div className="exp2-help-desc">{t('contactTeamAt')} <a href="mailto:info@vrvr.show">info@vrvr.show</a> {t('orCall')} <a href="tel:+17788054699">(778) 805-4699</a></div>
            </div>
          </section>

          {/* Similar experiences */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">{t('similarExperiences')}</h2>
            <div className="exp2-similar-grid">
              {similar.map((exp) => (
                <MiniExpCard key={exp.id} exp={exp} onSelect={onSelectExperience ?? onBack} t={t} />
              ))}
            </div>
          </section>
        </div>

        {/* ── RIGHT: Booking Widget ── */}
        {!bookingBeforeDetails && (
          <div className="exp2-sidebar-col">
            <div className="exp2-widget-sticky">
              <BookingWidget experience={experience} cartItems={cartItems} onAddToCart={onBuyTicket} t={t} />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showVideo && <VideoModal src={demoVideo} onClose={() => setShowVideo(false)} />}
      {lightboxIdx !== null && <Lightbox images={gallery} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
    </div>
  )
}

export default ExperienceDetailPage
