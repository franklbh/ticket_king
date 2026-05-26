import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import BrandLogo from './BrandLogo'
import { qrPlaceholder } from '../data/showData'
import { allExperiences } from '../data/experiences'
import { formatNorthAmericanPhone } from '../utils/validation'

const BACKEND = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const experienceById = new Map(allExperiences.map((experience) => [experience.id, experience]))

function fmt(n) { return `CA$${Number(n || 0).toFixed(2)}` }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) }
function validPhone(value) { return value.replace(/[^\d]/g, '').length >= 10 }
function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function gfMul(a, b) {
  let result = 0
  let left = a
  let right = b
  while (right > 0) {
    if (right & 1) result ^= left
    left <<= 1
    if (left & 0x100) left ^= 0x11d
    right >>= 1
  }
  return result
}

function qrBitsForNumeric(value) {
  const bits = []
  const append = (number, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((number >> i) & 1)
  }
  append(0x1, 4)
  append(value.length, 10)
  for (let i = 0; i < value.length; i += 3) {
    const chunk = value.slice(i, i + 3)
    append(Number(chunk), chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4)
  }
  for (let i = 0; i < Math.min(4, 152 - bits.length); i += 1) bits.push(0)
  while (bits.length < 152 && bits.length % 8 !== 0 && bits.length < 148) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  const codewords = []
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  let pad = 0
  while (codewords.length < 19) {
    codewords.push(pad % 2 === 0 ? 0xec : 0x11)
    pad += 1
  }
  return codewords
}

function ticketQrDataUri(rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '').slice(0, 41) || '0'
  const size = 21
  const quiet = 4
  const matrix = Array.from({ length: size }, () => Array(size).fill(null))
  const set = (x, y, dark) => {
    if (x >= 0 && y >= 0 && x < size && y < size) matrix[y][x] = Boolean(dark)
  }

  const finder = (x, y) => {
    for (let yy = -1; yy <= 7; yy += 1) {
      for (let xx = -1; xx <= 7; xx += 1) {
        const edge = xx === -1 || xx === 7 || yy === -1 || yy === 7
        const dark = !edge && (xx === 0 || xx === 6 || yy === 0 || yy === 6 || (xx >= 2 && xx <= 4 && yy >= 2 && yy <= 4))
        set(x + xx, y + yy, dark)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  for (let i = 8; i < size - 8; i += 1) {
    set(i, 6, i % 2 === 0)
    set(6, i, i % 2 === 0)
  }
  set(8, size - 8, true)

  const format = 0b111011111000100
  const bit = (i) => ((format >> i) & 1) === 1
  for (let i = 0; i <= 5; i += 1) set(8, i, bit(i))
  set(8, 7, bit(6))
  set(8, 8, bit(7))
  set(7, 8, bit(8))
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i))
  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(i))
  for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(i))

  const data = qrBitsForNumeric(code)
  const generator = [87, 229, 146, 149, 238, 102, 21]
  const ecc = Array(7).fill(0)
  data.forEach((word) => {
    const factor = word ^ ecc.shift()
    ecc.push(0)
    generator.forEach((coef, index) => { ecc[index] ^= gfMul(coef, factor) })
  })
  const stream = [...data, ...ecc].flatMap((word) => Array.from({ length: 8 }, (_, i) => (word >> (7 - i)) & 1))
  let index = 0
  let upward = true
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x -= 1
    for (let offset = 0; offset < size; offset += 1) {
      const y = upward ? size - 1 - offset : offset
      for (let dx = 0; dx < 2; dx += 1) {
        const xx = x - dx
        if (matrix[y][xx] !== null) continue
        const masked = Boolean(stream[index] || 0) !== ((xx + y) % 2 === 0)
        set(xx, y, masked)
        index += 1
      }
    }
    upward = !upward
  }

  const modules = []
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) modules.push(`<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`)
  }))
  const viewBox = size + quiet * 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" shape-rendering="crispEdges"><rect width="${viewBox}" height="${viewBox}" fill="#fff"/><g fill="#111827">${modules.join('')}</g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function fallbackTickets(order) {
  const orderDigits = String(order.orderNumber || Date.now()).replace(/\D/g, '').slice(-10) || String(Date.now()).slice(-10)
  let counter = 0
  return order.items.flatMap((item) => Array.from({ length: item.quantity }, () => {
    counter += 1
    const code = `${orderDigits}${String(counter).padStart(3, '0')}`
    return {
      id: `${item.id}__ticket_${counter}`,
      code,
      qrCode: `ticket:${code}`,
      ticketNumber: `T-${code}`,
      ticketType: item.ticket_type_label,
      showTitle: itemShowTitle(item),
      slotDate: item.session_date,
      slotTime: item.session_time,
    }
  }))
}

function expandedTicketItems(order) {
  return (order.items || []).flatMap((item) => Array.from({ length: item.quantity }, () => item))
}

function normalizeBackendTickets(tickets, order) {
  const expandedItems = expandedTicketItems(order)
  return (tickets || []).map((ticket, index) => {
    const code = String(ticket.verification_code || ticket.code || ticket.qrCode || ticket.qr_payload || `${Date.now()}${index}`).replace(/\D/g, '')
    const item = expandedItems[index] || order.items.find((entry) => entry.ticket_type_label === ticket.ticket_type) || order.items[0] || {}
    const slotStart = ticket.slot_start || ticket.slotStart || ''
    const slotEnd = ticket.slot_end || ticket.slotEnd || ''
    return {
      id: String(ticket.id || ticket.ticket_id || `${order.orderNumber}-ticket-${index + 1}`),
      code,
      qrCode: ticket.qr_payload || ticket.qrCode || `ticket:${code}`,
      ticketNumber: ticket.ticket_number || ticket.ticketNumber || `T-${code}`,
      ticketType: ticket.ticket_type || ticket.ticketType || item.ticket_type_label || 'Ticket',
      showTitle: itemShowTitle(item) || ticket.event_name || ticket.eventName || ticket.show_title || ticket.showTitle || 'WE ARE VR',
      slotDate: ticket.slot_date || ticket.slotDate || item.session_date || '',
      slotTime: ticket.slot_time || ticket.slotTime || (slotStart && slotEnd ? `${slotStart}-${slotEnd}` : slotStart) || item.session_time || '',
    }
  })
}

function CartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  )
}

function CreditCardLogo() {
  return (
    <span className="crt-credit-card-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    </span>
  )
}

function WeChatLogo() {
  return (
    <span className="crt-method-logo wechat" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M13.2 7.2C6.9 7.2 2 11.1 2 16.1c0 2.8 1.6 5.2 4 6.8l-.8 3 3.5-1.7c1.3.5 2.8.8 4.5.8.8 0 1.6-.1 2.4-.2-.4-1-.6-2-.6-3.1 0-4.4 4.2-8 9.6-8.5-1.5-3.5-5.9-6-11.4-6z" />
        <path d="M25 15.1c-4.2 0-7.6 2.8-7.6 6.3s3.4 6.3 7.6 6.3c1 0 2-.2 2.9-.5l2.5 1.2-.6-2.1c1.4-1.1 2.2-2.8 2.2-4.8 0-3.6-3.4-6.4-7-6.4z" />
      </svg>
    </span>
  )
}

function AlipayLogo() {
  return <span className="crt-method-logo alipay" aria-hidden="true">支</span>
}

function SummaryRow({ label, value, muted, bold }) {
  return (
    <div className={`crt-sum-row ${muted ? 'crt-sum-muted' : ''} ${bold ? 'crt-sum-bold' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProcessingFeeLabel({ open = false, onToggle }) {
  const tooltipId = 'cart-processing-fee-tooltip'
  return (
    <span className="processing-fee-label">
      Processing fee
      <span className={`processing-fee-help ${open ? 'is-open' : ''}`}>
        <button
          className="processing-fee-icon"
          type="button"
          aria-label="Processing fee details"
          aria-expanded={open}
          aria-describedby={tooltipId}
          onClick={(event) => {
            event.stopPropagation()
            onToggle?.()
          }}
        >
          !
        </button>
        <span className="processing-fee-tooltip" id={tooltipId} role="tooltip">
          Includes a $1.80 platform fee per ticket plus a 2.5% payment processing fee.
        </span>
      </span>
    </span>
  )
}

function ComboDealLabel({ open = false, onToggle }) {
  const tooltipId = 'cart-combo-deal-tooltip'
  return (
    <span className="combo-deal-label">
      Combo Deal (10% off)
      <span className={`combo-deal-help ${open ? 'is-open' : ''}`}>
        <button
          className="combo-deal-icon"
          type="button"
          aria-label="Combo deal details"
          aria-expanded={open}
          aria-describedby={tooltipId}
          onClick={(event) => {
            event.stopPropagation()
            onToggle?.()
          }}
        >
          !
        </button>
        <span className="combo-deal-tooltip" id={tooltipId} role="tooltip">
          Book Panda&apos;s World and/or Back to Jurassic with any game to unlock this combo discount.
        </span>
      </span>
    </span>
  )
}

function Stepper({ step }) {
  const steps = [
    ['review', 'Review', 'Review your cart'],
    ['contact', 'Contact', 'Enter your details'],
    ['payment', 'Payment', 'Secure checkout'],
    ['confirm', 'Confirm', 'Get your tickets'],
  ]
  const activeIndex = Math.max(0, steps.findIndex(([id]) => id === step))
  return (
    <div className="crt-flowbar">
      {steps.map(([id, title, sub], index) => (
        <div key={id} className={`crt-flow-node ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'done' : ''}`}>
          <span>{index + 1}</span>
          <div><strong>{title}</strong><small>{sub}</small></div>
        </div>
      ))}
    </div>
  )
}

function TrustList({ compact = false }) {
  return (
    <div className={`crt-trust-card ${compact ? 'compact' : ''}`}>
      <div><ShieldIcon /><span><strong>Secure & encrypted</strong><small>Your data is protected with industry-standard encryption.</small></span></div>
      <div><ShieldIcon /><span><strong>Flexible booking</strong><small>Easy to manage your bookings after purchase.</small></span></div>
      <div><ShieldIcon /><span><strong>Need help?</strong><small>Contact our support team anytime.</small></span></div>
    </div>
  )
}

function ItemImage({ item, className }) {
  const experience = experienceById.get(item.show_id)
  const image = experience?.heroImg || experience?.gallery?.[0] || item.experience_image
  const fallback = item.experience_gradient || experience?.cardGradient || item.experience_accent || experience?.accent || '#4f46e5'
  return (
    <div
      className={className}
      style={image ? { backgroundImage: `url(${image})` } : { background: fallback }}
      aria-hidden="true"
    />
  )
}

function itemShowTitle(item) {
  return experienceById.get(item.show_id)?.title || item.show_title
}

function contactFromUser(user, getDisplayName) {
  const name = getDisplayName?.(user) || ''
  const parts = name.split(' ').filter(Boolean)
  return {
    first: parts[0] || user?.email?.split('@')[0] || '',
    last: parts.slice(1).join(' '),
    email: user?.email || '',
    phone: formatNorthAmericanPhone(user?.user_metadata?.phone || ''),
  }
}

function InlineStripePayment({ clientSecret, amount, email, onPaid, onBusyChange }) {
  if (!clientSecret) return null
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#5b21d6',
            colorBackground: '#ffffff',
            colorText: '#111827',
            borderRadius: '8px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
      }}
    >
      <StripeForm amount={amount} email={email} onPaid={onPaid} onBusyChange={onBusyChange} />
    </Elements>
  )
}

function StripeForm({ amount, email, onPaid, onBusyChange }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    onBusyChange?.(true)
    setError('')
    const { error: payError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: email,
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })
    if (payError) {
      setError(payError.message || 'Unable to confirm payment.')
      setBusy(false)
      onBusyChange?.(false)
      return
    }
    if (paymentIntent?.status === 'succeeded') onPaid(paymentIntent)
    else {
      setError('Payment is still processing. Please wait a moment.')
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  return (
    <form className="crt-stripe-form" onSubmit={submit}>
      <PaymentElement options={{ layout: 'tabs', defaultValues: { billingDetails: { email } } }} />
      {error && <div className="crt-warning">{error}</div>}
      <button className="crt-primary" disabled={!stripe || busy} type="submit">
        {busy ? 'Processing...' : `Pay ${fmt(amount)}`}
      </button>
    </form>
  )
}

export default function Cart({
  authForm,
  authMessage,
  authMode,
  authReady,
  currentUser,
  getDisplayName,
  handleLogin,
  handleSignup,
  items,
  onUpdateQty,
  onUpdateTicketType,
  onRemove,
  onClose,
  onBrowseExperiences,
  onPaymentSuccess,
  onManageBooking,
  resetAuthForm,
  setAuthForm,
  setAuthMode,
}) {
  const [step, setStep] = useState('review')
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '', request: '', optIn: true })
  const [checkoutMode, setCheckoutMode] = useState(authMode === 'signup' ? 'signup' : 'login')
  const [touched, setTouched] = useState({})
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [paymentError, setPaymentError] = useState('')
  const [reservationConflictMessage, setReservationConflictMessage] = useState('')
  const [stripeClientSecret, setStripeClientSecret] = useState('')
  const [stripeOrder, setStripeOrder] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [qrOrder, setQrOrder] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [showAlipayNotice, setShowAlipayNotice] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [rawQtyById, setRawQtyById] = useState({})
  const [openSummaryTooltip, setOpenSummaryTooltip] = useState(null)
  const releasedReservationRef = useRef(null)
  const reservationCreatingRef = useRef(null)
  const ticketRailRef = useRef(null)

  useEffect(() => {
    if (!openSummaryTooltip) return undefined
    const closeTooltip = () => setOpenSummaryTooltip(null)
    document.addEventListener('click', closeTooltip)
    return () => document.removeEventListener('click', closeTooltip)
  }, [openSummaryTooltip])

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets = items.reduce((s, i) => s + i.quantity, 0)
  const discount = Math.min(appliedCoupon?.discountAmount || 0, subtotal)
  const procFee = numTickets > 0 ? 1.8 * numTickets + 0.025 * subtotal : 0
  const tax = numTickets > 0 ? 0.05 * subtotal : 0
  const grand = Math.max(0, subtotal - discount) + procFee + tax
  const contactReady = contact.first.trim().length > 1
    && contact.last.trim().length > 1
    && validEmail(contact.email)
    && (!contact.phone.trim() || validPhone(contact.phone))

  const orderItems = useMemo(() => items.map((item) => ({
    eventId: Number(item.event_id),
    slotId: item.slot_id,
    ticketTypeId: null,
    eventName: itemShowTitle(item),
    slotDate: item.session_date_key,
    slotTime: item.session_time,
    ticketType: item.ticket_type_label,
    quantity: item.quantity,
    unitPrice: item.unit_price,
  })), [items])

  const liveSlotReady = orderItems.length > 0 && orderItems.every((item) => Number.isFinite(item.eventId) && item.slotId && item.quantity > 0)
  const minQtyForTicketType = (ticketTypeId) => ticketTypeId === 'family' ? 3 : ticketTypeId === 'group' ? 6 : 1
  const zeroQtyItems = items.filter((item) => item.quantity <= 0)
  const invalidItems = items.filter((item) => item.quantity > 0 && item.quantity < minQtyForTicketType(item.ticket_type_id))
  const canContinueReview = liveSlotReady && zeroQtyItems.length === 0 && invalidItems.length === 0

  const checkoutOrder = useMemo(() => ({
    customer: {
      name: [contact.first, contact.last].filter(Boolean).join(' '),
      email: contact.email,
      phone: contact.phone,
      remarks: contact.request,
    },
    items: orderItems,
    paymentFee: procFee,
    gst: tax,
    couponCode: appliedCoupon?.code || null,
    couponDiscount: discount,
    totalAmount: grand,
  }), [appliedCoupon?.code, contact.email, contact.first, contact.last, contact.phone, contact.request, discount, grand, orderItems, procFee, tax])

  const releaseReservation = useCallback((reservationId = reservation?.id, options = {}) => {
    if (!reservationId || releasedReservationRef.current === reservationId) return
    releasedReservationRef.current = reservationId
    const url = `${BACKEND}/api/v1/reservations/${reservationId}/expire`
    if (options.beacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([], { type: 'application/json' }))
    } else {
      fetch(url, { method: 'POST' }).catch(() => {})
    }
    if (reservation?.id === reservationId) {
      setReservation(null)
      setTimeLeft(0)
      setStripeClientSecret('')
      setStripeOrder(null)
      setQrImage('')
      setQrOrder(null)
      setPaymentSubmitting(false)
    }
  }, [reservation?.id])

  const createCheckoutReservation = useCallback(async () => {
    if (reservation?.id && timeLeft > 0) return reservation
    if (reservationCreatingRef.current) return reservationCreatingRef.current
    setReservationLoading(true)
    setPaymentError('')
    const request = (async () => {
      const res = await fetch(`${BACKEND}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(grand * 100),
          order: checkoutOrder,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Unable to reserve these seats.')
      releasedReservationRef.current = null
      setReservation(data)
      setTimeLeft(data.expiresInSeconds || 300)
      return data
    })()
    reservationCreatingRef.current = request
    try {
      return await request
    } finally {
      reservationCreatingRef.current = null
      setReservationLoading(false)
    }
  }, [checkoutOrder, grand, reservation, timeLeft])

  const leavePaymentStep = useCallback((nextStep) => {
    releaseReservation()
    setStep(nextStep)
  }, [releaseReservation])

  const closeCart = useCallback(() => {
    releaseReservation()
    onClose?.()
  }, [onClose, releaseReservation])

  const browseExperiences = useCallback(() => {
    releaseReservation()
    onBrowseExperiences?.()
  }, [onBrowseExperiences, releaseReservation])

  useEffect(() => {
    if (!currentUser) return
    setContact((previous) => {
      const next = contactFromUser(currentUser, getDisplayName)
      return {
        ...previous,
        first: previous.first || next.first,
        last: previous.last || next.last,
        email: previous.email || next.email,
        phone: previous.phone || next.phone,
      }
    })
  }, [currentUser, getDisplayName])

  useEffect(() => {
    if (step !== 'payment' || paymentMethod !== 'card' || !contactReady || !liveSlotReady || !reservation?.id) return
    const controller = new AbortController()
    setStripeLoading(true)
    setStripeClientSecret('')
    setStripeOrder(null)
    setPaymentError('')
    fetch(`${BACKEND}/api/v1/stripe/payment-intent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(grand * 100),
        order_id: `WEAREVR-${Date.now()}`,
        reservationId: reservation.id,
        description: `${numTickets} ticket${numTickets !== 1 ? 's' : ''} · WE ARE VR`,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || 'Unable to initialize Stripe payment.')
        return data
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setStripeClientSecret(data.client_secret || '')
          setStripeOrder(data.order || null)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setPaymentError(err.message || 'Unable to initialize Stripe payment.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setStripeLoading(false)
      })
    return () => controller.abort()
  }, [contactReady, grand, liveSlotReady, numTickets, paymentMethod, reservation?.id, step])

  useEffect(() => {
    if (step !== 'payment' || !reservation?.id) return undefined
    const tick = () => {
      const expiresAt = reservation.expiresAt ? new Date(reservation.expiresAt).getTime() : Date.now() + 300000
      setTimeLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [reservation?.id, reservation?.expiresAt, step])

  useEffect(() => {
    if (step !== 'payment' || !reservation?.id || timeLeft !== 0 || confirmed || paymentSubmitting) return
    releaseReservation(reservation.id)
    setPaymentError('Your reservation expired. Please return to the cart and try again.')
  }, [confirmed, paymentSubmitting, releaseReservation, reservation?.id, step, timeLeft])

  useEffect(() => {
    if (step !== 'payment' || !reservation?.id) return undefined
    const releaseOnLeave = () => releaseReservation(reservation.id, { beacon: true })
    window.addEventListener('beforeunload', releaseOnLeave)
    return () => window.removeEventListener('beforeunload', releaseOnLeave)
  }, [releaseReservation, reservation?.id, step])

  useEffect(() => {
    setAppliedCoupon((prev) => (prev?.autoCombo ? null : prev))
    if (!items.length) return undefined
    const sub = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    let cancelled = false
    fetch(`${BACKEND}/api/v1/combos/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventIds: items.map((i) => Number(i.event_id)), subtotal: sub }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled || !data.eligible) return
        const res = await fetch(`${BACKEND}/api/v1/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.coupon_code, subtotal: sub }),
        })
        const coupon = await res.json().catch(() => ({}))
        if (!cancelled && coupon.valid) {
          setAppliedCoupon({
            code: coupon.code,
            discountAmount: Number(coupon.discountAmount || 0),
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue || 0),
            autoCombo: true,
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [items])

  async function loadIssuedTickets(order, providerReference, method, snapshot) {
    if (!order?.id || !providerReference) return fallbackTickets(snapshot)
    try {
      const res = await fetch(`${BACKEND}/api/v1/reservations/${order.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: method === 'card' ? 'stripe' : 'alphapay',
          providerReference,
          method,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Unable to issue tickets.')
      const issuedTickets = normalizeBackendTickets(data.tickets || [], snapshot)
      return issuedTickets.length ? issuedTickets : fallbackTickets(snapshot)
    } catch (err) {
      setPaymentError(err.message || 'Unable to load issued tickets. Showing temporary ticket codes.')
      return fallbackTickets(snapshot)
    }
  }

  async function finishPayment(order, providerReference, method) {
    const snapshot = {
      orderNumber: order?.orderNumber || `VRX-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-4)}`,
      providerReference,
      method,
      paidAt: new Date(),
      contact: { ...contact },
      items: items.map((item) => ({ ...item })),
      subtotal,
      discount,
      procFee,
      tax,
      grand,
      couponCode: appliedCoupon?.code || '',
      autoCombo: appliedCoupon?.autoCombo || false,
      tickets: [],
    }
    snapshot.tickets = await loadIssuedTickets(order, providerReference, method, snapshot)
    setConfirmed(snapshot)
    setReservation(null)
    setTimeLeft(0)
    setPaymentSubmitting(false)
    releasedReservationRef.current = null
    setStep('confirm')
    onPaymentSuccess?.(snapshot)
  }

  async function applyCoupon() {
    const code = couponCode.trim()
    if (!code) {
      setAppliedCoupon(null)
      setCouponMessage('Enter a coupon code first.')
      return
    }
    try {
      const res = await fetch(`${BACKEND}/api/v1/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.valid) throw new Error(data.detail || 'Invalid coupon code.')
      setAppliedCoupon({
        code: data.code,
        discountAmount: Number(data.discountAmount || 0),
        discountType: data.discountType,
        discountValue: Number(data.discountValue || 0),
      })
      setCouponMessage(data.message || `Coupon ${data.code} applied.`)
    } catch (err) {
      setAppliedCoupon(null)
      setCouponMessage(err.message || 'Unable to validate coupon.')
    }
  }

  async function startQrPayment(method) {
    if (!contactReady || !liveSlotReady || !reservation?.id || timeLeft <= 0) return
    setPaymentMethod(method)
    setShowAlipayNotice(method === 'alipay')
    setQrLoading(true)
    setPaymentError('')
    setQrImage('')
    setQrOrder(null)
    try {
      const paymentRequestId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const res = await fetch(`${BACKEND}/api/v1/alphapay/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          amount: Math.round(grand * 100),
          description: `${numTickets} ticket${numTickets !== 1 ? 's' : ''} · WE ARE VR`,
          payment_request_id: paymentRequestId,
          reservationId: reservation.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Unable to create ${method} payment.`)
      const requestId = data.paymentRequestId || paymentRequestId
      setQrImage(data.qrImage || '')
      setQrOrder(data.order || null)
      const es = new EventSource(`${BACKEND}/api/v1/alphapay/events/${requestId}`)
      es.onmessage = (event) => {
        const payload = JSON.parse(event.data)
        if (payload.paid) {
          es.close()
          finishPayment(data.order, requestId, method)
        }
        if (payload.timeout) setPaymentError('Payment confirmation timed out. Please try again.')
      }
      es.onerror = () => es.close()
    } catch (err) {
      setPaymentError(err.message || `Unable to create ${method} payment.`)
    } finally {
      setQrLoading(false)
    }
  }

  function continueToContact() {
    if (zeroQtyItems.length > 0) {
      setPaymentError('One or more cart items have 0 tickets. Increase the quantity or remove the item before checkout.')
      return
    }
    if (!liveSlotReady) {
      setPaymentError('One or more cart items are missing a live booking slot. Please add tickets again from the date/time picker.')
      return
    }
    if (invalidItems.length > 0) {
      setPaymentError('Family tickets require at least 3 people. Group tickets require at least 6 people.')
      return
    }
    setStep('contact')
  }

  function updateTicketTypeWithMinimum(item, ticketTypeId) {
    const minQty = minQtyForTicketType(ticketTypeId)
    if (item.quantity > 0 && item.quantity < minQty) onUpdateQty(item.id, minQty)
    onUpdateTicketType(item.id, ticketTypeId)
    setPaymentError('')
  }

  function updateQtyWithMinimum(item, nextQty) {
    onUpdateQty(item.id, Math.max(0, Math.min(999, Number(nextQty) || 0)))
    setPaymentError('')
  }

  function incrementCartQty(item) {
    const minQty = minQtyForTicketType(item.ticket_type_id)
    const nextQty = item.quantity <= 0 ? minQty : item.quantity + 1
    updateQtyWithMinimum(item, nextQty)
  }

  function changeCartQty(item, value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 3)
    setRawQtyById((values) => ({ ...values, [item.id]: digits }))
    if (digits === '') return
    updateQtyWithMinimum(item, Number(digits))
  }

  function commitCartQty(item) {
    const raw = rawQtyById[item.id]
    if (raw === undefined) return
    const nextQty = raw === '' ? 0 : Number(raw)
    updateQtyWithMinimum(item, nextQty)
    setRawQtyById((values) => {
      const next = { ...values }
      delete next[item.id]
      return next
    })
  }

  async function continueToPayment() {
    setTouched({ first: true, last: true, email: true, phone: true })
    if (!contactReady) return
    setReservationConflictMessage('')
    try {
      await createCheckoutReservation()
      setStep('payment')
    } catch (err) {
      setReservationConflictMessage(err.message || 'Unable to reserve these seats.')
    }
  }

  function downloadReceipt() {
    const order = confirmed
    if (!order) return
    const lines = [
      'WE ARE VR Receipt',
      `Order: ${order.orderNumber}`,
      `Paid: ${order.paidAt.toLocaleString()}`,
      `Customer: ${[order.contact.first, order.contact.last].filter(Boolean).join(' ')}`,
      `Email: ${order.contact.email}`,
      '',
      ...order.items.map((item) => `${itemShowTitle(item)} | ${item.session_date} ${item.session_time} | ${item.ticket_type_label} x${item.quantity} | ${fmt(item.unit_price * item.quantity)}`),
      '',
      'Tickets:',
      ...(order.tickets || []).map((ticket, index) => `${index + 1}. ${ticket.ticketNumber} | ${ticket.showTitle} | ${ticket.ticketType} | Code: ${ticket.code}`),
      '',
      `Subtotal: ${fmt(order.subtotal)}`,
      order.discount ? `Coupon ${order.couponCode}: -${fmt(order.discount)}` : '',
      `Processing fee: ${fmt(order.procFee)}`,
      `GST (5%): ${fmt(order.tax)}`,
      `Total paid: ${fmt(order.grand)}`,
    ].filter(Boolean)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${order.orderNumber}-receipt.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const switchAuthMode = (mode) => {
    setCheckoutMode(mode)
    if (mode !== 'guest') setAuthMode(mode)
    resetAuthForm()
  }

  const scrollTicketRail = (direction) => {
    const rail = ticketRailRef.current
    if (!rail) return
    const card = rail.querySelector('.crt-ticket-card')
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap || '16') || 16
    const stepSize = card ? card.getBoundingClientRect().width + gap : rail.clientWidth * 0.86
    rail.scrollBy({ left: direction * stepSize, behavior: 'smooth' })
  }

  const renderSummary = () => {
    const summaryItems = confirmed?.items || items
    const total = confirmed?.grand ?? grand
    const toggleSummaryTooltip = (key) => {
      setOpenSummaryTooltip((current) => current === key ? null : key)
    }
    return (
      <aside className="crt-side">
        <div className="crt-summary-card">
          <h3>Order Summary</h3>
          <div className="crt-side-count">
            <strong>{summaryItems.reduce((s, item) => s + item.quantity, 0)} items</strong>
          </div>
          {step !== 'review' && summaryItems.slice(0, 4).map((item) => (
            <div className="crt-side-item" key={item.id}>
              <ItemImage item={item} className="crt-side-thumb" />
              <div>
                <strong>{itemShowTitle(item)}</strong>
                <span>{item.session_date} · {item.session_time}</span>
              </div>
              <b>{fmt(item.unit_price * item.quantity)}</b>
            </div>
          ))}
          <SummaryRow label={`Subtotal`} value={fmt(confirmed?.subtotal ?? subtotal)} muted />
          {Boolean(confirmed?.discount ?? discount) && (
            <SummaryRow
              label={(confirmed?.autoCombo || appliedCoupon?.autoCombo)
                ? <ComboDealLabel open={openSummaryTooltip === 'combo'} onToggle={() => toggleSummaryTooltip('combo')} />
                : `Coupon${(confirmed?.couponCode || appliedCoupon?.code) ? ` (${confirmed?.couponCode || appliedCoupon?.code})` : ''}`}
              value={`-${fmt(confirmed?.discount ?? discount)}`}
              muted
            />
          )}
          <SummaryRow label={<ProcessingFeeLabel open={openSummaryTooltip === 'processing'} onToggle={() => toggleSummaryTooltip('processing')} />} value={fmt(confirmed?.procFee ?? procFee)} muted />
          <SummaryRow label="GST (5%)" value={fmt(confirmed?.tax ?? tax)} muted />
          <div className="crt-sum-divider" />
          <SummaryRow label={step === 'confirm' ? 'Total paid' : 'Total due'} value={`${fmt(total)} CAD`} bold />
          {step === 'review' && (
            <div className="crt-promo-card-inline">
              {appliedCoupon?.autoCombo ? (
                <div className="combo-banner">Combo deal applied 10% off</div>
              ) : (
                <>
                  <label htmlFor="cart-promo-code">Promo code</label>
                  <div>
                    <input id="cart-promo-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" />
                    <button onClick={applyCoupon} type="button">Apply</button>
                  </div>
                  {couponMessage && <span className={appliedCoupon ? 'ok' : ''}>{couponMessage}</span>}
                </>
              )}
            </div>
          )}
          {step === 'review' && (
            <button className="crt-primary" onClick={continueToContact} disabled={!canContinueReview} type="button">
              Continue to Contact →
            </button>
          )}
          {step === 'confirm' && (
            <div className="crt-confirm-actions">
              <button className="crt-outline" onClick={downloadReceipt} type="button">Download receipt</button>
              <button className="crt-primary" onClick={() => onManageBooking?.(confirmed)} type="button">Manage booking</button>
            </div>
          )}
        </div>
        {step !== 'confirm' ? <TrustList compact /> : (
          <div className="crt-trust-card compact">
            <h3>Need help?</h3>
            <div><ShieldIcon /><span><strong>Email us</strong><small>info@vrvr.show</small></span></div>
            <div><ShieldIcon /><span><strong>Call us</strong><small>+1(778) 805-4699</small></span></div>
          </div>
        )}
      </aside>
    )
  }

  return (
    <div className="crt-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="crt-panel">
        <div className="crt-shell-top">
          <div className="crt-title-row"><CartIcon /><h2>{step === 'confirm' ? 'Your Cart' : 'Your Cart'}</h2><span>{numTickets || confirmed?.items?.reduce((s, item) => s + item.quantity, 0)} items</span></div>
          <button className="crt-close" onClick={closeCart} aria-label="Close cart" type="button">×</button>
        </div>

        <Stepper step={step} />

        {items.length === 0 && !confirmed ? (
          <div className="crt-empty">
            <div className="crt-empty-icon"><CartIcon /></div>
            <p className="crt-empty-title">Your shopping cart is empty</p>
            <p className="crt-empty-sub">Add tickets from any show or game to get started.</p>
            <button className="crt-browse-btn" onClick={browseExperiences} type="button">Browse Experiences</button>
          </div>
        ) : (
          <div className="crt-workspace">
            {step === 'review' && (
              <main className="crt-main">
                <div className="crt-review-tools">
                  <button className="crt-outline" onClick={browseExperiences} type="button">+ Add another experience</button>
                </div>
                {paymentError && <div className="crt-warning">{paymentError}</div>}
                <div className="crt-table">
                  <div className="crt-table-head"><span>Experience</span><span>Date & Time</span><span>Ticket Type</span><span>Qty</span><span>Unit Price</span><span>Subtotal</span><span /></div>
                  {items.map((item) => (
                    <article className="crt-cart-row" key={item.id}>
                      <div className="crt-exp-cell"><ItemImage item={item} className="crt-cart-thumb" /><strong>{itemShowTitle(item)}</strong></div>
                      <div className="crt-date-cell"><span>{item.session_date}</span><span>{item.session_time}</span></div>
                      <div className="crt-ticket-type-field">
                        <span className="crt-ticket-type-label">Ticket type</span>
                        <select aria-label={`Ticket type for ${itemShowTitle(item)}`} value={item.ticket_type_id} onChange={(event) => updateTicketTypeWithMinimum(item, event.target.value)}>
                          {item.ticket_options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </div>
                      <div className="crt-inline-qty">
                        <button onClick={() => updateQtyWithMinimum(item, item.quantity - 1)} disabled={item.quantity <= 0} type="button">-</button>
                        <input
                          aria-label={`Quantity for ${itemShowTitle(item)}`}
                          inputMode="numeric"
                          min="0"
                          max="999"
                          pattern="[0-9]*"
                          type="text"
                          value={rawQtyById[item.id] ?? String(item.quantity)}
                          onBlur={() => commitCartQty(item)}
                          onChange={(event) => changeCartQty(item, event.target.value)}
                        />
                        <button onClick={() => incrementCartQty(item)} type="button">+</button>
                      </div>
                      <span>{fmt(item.unit_price)}</span>
                      <strong>{fmt(item.unit_price * item.quantity)}</strong>
                      <button className="crt-remove" onClick={() => onRemove(item.id)} type="button" aria-label={`Remove ${itemShowTitle(item)} from cart`}>
                        <span className="crt-remove-icon crt-remove-icon-desktop" aria-hidden="true">⌫</span>
                        <svg className="crt-remove-icon crt-remove-icon-mobile" viewBox="0 0 32 24" aria-hidden="true">
                          <path d="M12 3h15a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H12L3 12l9-9Z" />
                          <path d="m16.5 8.5 7 7M23.5 8.5l-7 7" />
                        </svg>
                        <span className="crt-remove-text">Remove</span>
                      </button>
                      {item.quantity > 0 && item.quantity < minQtyForTicketType(item.ticket_type_id) && (
                        <div className="crt-row-warning crt-cart-row-warning">
                          {item.ticket_type_id === 'group' ? 'Group tickets require at least 6 people.' : 'Family tickets require at least 3 people.'}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                <div className="crt-info-strip dashed"><span className="crt-info-icon"><TicketIcon /></span>You can add multiple experiences and different showtimes to your cart and pay in one secure checkout.</div>
              </main>
            )}

            {step === 'contact' && (
              <main className="crt-main">
                <button className="crt-step-back-top" onClick={() => setStep('review')} type="button">
                  ← Back to cart
                </button>
                {!currentUser && (
                  <div className="crt-account-box">
                    <div className="crt-tabs">
                      <button className={checkoutMode === 'login' ? 'active' : ''} onClick={() => switchAuthMode('login')} type="button">Log in</button>
                      <button className={checkoutMode === 'signup' ? 'active' : ''} onClick={() => switchAuthMode('signup')} type="button">Create account</button>
                      <button className={checkoutMode === 'guest' ? 'active' : ''} onClick={() => switchAuthMode('guest')} type="button">Continue as guest</button>
                    </div>
                    {checkoutMode === 'guest' ? (
                      <div className="crt-guest-note">
                        <strong>Continue as guest</strong>
                        <span>No account needed. Enter your contact details below to receive your booking confirmation and e-tickets.</span>
                      </div>
                    ) : (
                      <form className="crt-login-form" onSubmit={checkoutMode === 'signup' ? handleSignup : handleLogin}>
                        {checkoutMode === 'signup' && <label>Full name<input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} autoComplete="name" /></label>}
                        <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} autoComplete="email" /></label>
                        <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} autoComplete={checkoutMode === 'signup' ? 'new-password' : 'current-password'} /></label>
                        {authMessage && <div className="crt-warning">{authMessage}</div>}
                        <button className="crt-outline" disabled={!authReady} type="submit">{checkoutMode === 'signup' ? 'Create account' : 'Log in'}</button>
                      </form>
                    )}
                  </div>
                )}
                <div className={`crt-form-panel crt-contact-panel ${checkoutMode === 'guest' && !currentUser ? 'guest' : ''}`}>
                  <h3>Contact details</h3>
                  <p>{checkoutMode === 'guest' && !currentUser ? 'For guest checkout, enter only the details needed for your confirmation and e-tickets.' : "We'll use this information for your booking confirmation and e-tickets."}</p>
                  <div className="crt-form-grid">
                    <label className={touched.first && contact.first.trim().length <= 1 ? 'crt-field-error' : ''}>First name<input value={contact.first} onBlur={() => setTouched((p) => ({ ...p, first: true }))} onChange={(e) => setContact((p) => ({ ...p, first: e.target.value }))} /></label>
                    <label className={touched.last && contact.last.trim().length <= 1 ? 'crt-field-error' : ''}>Last name<input value={contact.last} onBlur={() => setTouched((p) => ({ ...p, last: true }))} onChange={(e) => setContact((p) => ({ ...p, last: e.target.value }))} /></label>
                    <label className={touched.email && !validEmail(contact.email) ? 'crt-field-error' : ''}>Email<input type="email" value={contact.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></label>
                    <label className={touched.phone && contact.phone.trim() && !validPhone(contact.phone) ? 'crt-field-error' : ''}>Phone (optional)<input type="tel" value={contact.phone} onBlur={() => setTouched((p) => ({ ...p, phone: true }))} onChange={(e) => setContact((p) => ({ ...p, phone: formatNorthAmericanPhone(e.target.value) }))} /></label>
                    {checkoutMode !== 'guest' && <label className="crt-field-wide"><span>Special requests (optional)</span><textarea value={contact.request} onChange={(e) => setContact((p) => ({ ...p, request: e.target.value }))} placeholder="Tell us anything we should know..." /></label>}
                  </div>
                  <div className="crt-contact-actions"><button className="crt-text-btn" onClick={() => setStep('review')} type="button">← Back to cart</button><button className="crt-primary" onClick={continueToPayment} disabled={!contactReady || reservationLoading} type="button">{reservationLoading ? 'Reserving seats...' : 'Continue to Payment →'}</button></div>
                </div>
              </main>
            )}

            {step === 'payment' && (
              <main className="crt-main">
                <div className="crt-info-strip">
                  Complete payment within <strong>{formatCountdown(timeLeft)}</strong> to keep these seats reserved.
                </div>
                <div className="crt-contact-card"><h3>Contact details</h3><button onClick={() => leavePaymentStep('contact')} type="button">Edit</button><strong>{[contact.first, contact.last].filter(Boolean).join(' ')}</strong><span>{contact.email} · {contact.phone}</span></div>
                <div className="crt-form-panel">
                  <h3>Payment method</h3>
                  <div className="crt-pay-tabs">
                    <button className={paymentMethod === 'card' ? 'active' : ''} onClick={() => { setShowAlipayNotice(false); setPaymentMethod('card') }} type="button"><CreditCardLogo />Credit card</button>
                    <button className={paymentMethod === 'wechat' ? 'active' : ''} onClick={() => startQrPayment('wechat')} type="button"><WeChatLogo />WeChat Pay</button>
                    <button className={paymentMethod === 'alipay' ? 'active' : ''} onClick={() => startQrPayment('alipay')} type="button"><AlipayLogo />Alipay</button>
                  </div>
                  {paymentError && <div className="crt-warning">{paymentError}</div>}
                  {paymentMethod === 'card' && (
                    reservationLoading ? <div className="crt-loading">Reserving your seats...</div> :
                    stripeLoading ? <div className="crt-loading">Initializing secure card payment...</div> :
                      <InlineStripePayment clientSecret={stripeClientSecret} amount={grand} email={contact.email} onPaid={(pi) => finishPayment(stripeOrder, pi.id, 'card')} onBusyChange={setPaymentSubmitting} />
                  )}
                  {(paymentMethod === 'wechat' || paymentMethod === 'alipay') && (
                    <div className="crt-qr-pay">
                      <div className="crt-qr-box">
                        <img src={qrImage || qrPlaceholder} alt={`${paymentMethod} QR code`} />
                        {(qrLoading || !qrImage) && <span>{qrLoading ? 'Generating QR code...' : 'Waiting for QR code...'}</span>}
                      </div>
                      <div>
                        <h4>{paymentMethod === 'wechat' ? 'WeChat Pay' : 'Alipay'}</h4>
                        <p>
                          {paymentMethod === 'alipay'
                            ? 'Scan this code with the camera inside Alipay. iPhone Camera and other QR code readers will not complete this payment.'
                            : 'Scan this code in WeChat Pay. This checkout updates automatically after payment is confirmed.'}
                        </p>
                        {qrOrder && <small>Order ID: {qrOrder.orderNumber}</small>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="crt-info-strip dashed"><ShieldIcon /> Your payment information is securely encrypted and never stored.</div>
              </main>
            )}

            {step === 'confirm' && confirmed && (
              <main className="crt-main">
                <div className="crt-confirm-hero">
                  <div className="crt-check">✓</div>
                  <div>
                    <h2>Booking confirmed!</h2>
                    <p>Thanks for booking with us. We can’t wait to see you.</p>
                    <div className="crt-confirm-meta">
                      <span><small>Order number</small><strong>{confirmed.orderNumber}</strong></span>
                      <span><small>Confirmation email</small><strong>{confirmed.contact.email}</strong></span>
                      <span><small>Payment status</small><strong className="paid">Paid</strong></span>
                    </div>
                  </div>
                </div>
                <div className="crt-booked-list">
                  <h3>Your booked experiences ({confirmed.items.length} items)</h3>
                  {confirmed.items.map((item) => (
                    <article className="crt-booked-row" key={item.id}>
                      <ItemImage item={item} className="crt-side-thumb" />
                      <div><strong>{itemShowTitle(item)}</strong><span>{item.session_date} · {item.session_time}</span></div>
                      <span>Qty <b>{item.quantity}</b></span>
                      <button className="crt-outline" type="button">View ticket →</button>
                    </article>
                  ))}
                </div>
                <div className="crt-issued-tickets">
                  <div className="crt-issued-head">
                    <div><strong>Your tickets are ready</strong><span>Each ticket has its own QR code. Show the matching code at check-in.</span></div>
                    <button className="crt-primary" onClick={downloadReceipt} type="button">Download receipt</button>
                  </div>
                  <div className="crt-ticket-rail-wrap">
                    <button className="crt-ticket-arrow prev" onClick={() => scrollTicketRail(-1)} type="button" aria-label="Previous ticket">‹</button>
                    <div className="crt-ticket-grid" ref={ticketRailRef}>
                      {confirmed.tickets.map((ticket, index) => (
                        <article className="crt-ticket-card" key={ticket.id || `${ticket.code}-${index}`}>
                          <img src={ticketQrDataUri(ticket.code)} alt={`QR code for ticket ${ticket.ticketNumber}`} />
                          <div>
                            <strong>Ticket {index + 1}</strong>
                            <span className="crt-ticket-number">{ticket.ticketNumber}</span>
                            <span>{ticket.showTitle}</span>
                            <small>{ticket.slotDate} {ticket.slotTime}</small>
                            <small>{ticket.ticketType}</small>
                            <code>{ticket.code}</code>
                          </div>
                        </article>
                      ))}
                    </div>
                    <button className="crt-ticket-arrow next" onClick={() => scrollTicketRail(1)} type="button" aria-label="Next ticket">›</button>
                  </div>
                </div>
              </main>
            )}

            {renderSummary()}
          </div>
        )}
        {reservationConflictMessage && (
          <div className="btk-added-overlay" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reservation unavailable">
            <div className="btk-added-modal">
              <button className="btk-added-close" onClick={() => setReservationConflictMessage('')} type="button" aria-label="Close">×</button>
              <div className="btk-added-icon"><TicketIcon /></div>
              <h3>Seats no longer available</h3>
              <p>{reservationConflictMessage}</p>
              <div className="btk-added-actions">
                <button className="btk-secondary" onClick={() => setReservationConflictMessage('')} type="button">Close</button>
                <button className="btk-primary" onClick={() => { setReservationConflictMessage(''); setStep('review') }} type="button">Update cart</button>
              </div>
            </div>
          </div>
        )}
        {showAlipayNotice && step === 'payment' && paymentMethod === 'alipay' && (
          <div className="crt-alipay-notice-overlay" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Alipay scan instructions">
            <div className="crt-alipay-notice">
              <button className="crt-alipay-notice-cancel" onClick={() => setShowAlipayNotice(false)} type="button" aria-label="Cancel Alipay notice">Cancel</button>
              <span className="crt-method-logo alipay" aria-hidden="true">支</span>
              <h3>Use the Alipay app camera</h3>
              <p>Scan the QR code with the camera inside Alipay. The iPhone Camera app and other QR code readers will not complete this payment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
