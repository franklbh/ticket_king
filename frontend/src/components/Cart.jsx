import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import BrandLogo from './BrandLogo'
import { qrPlaceholder } from '../data/showData'

const BACKEND = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

function fmt(n) { return `CA$${Number(n || 0).toFixed(2)}` }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) }
function validPhone(value) { return value.replace(/[^\d]/g, '').length >= 10 }
function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
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

function StripeLogo() {
  return <span className="crt-stripe-logo" aria-hidden="true">stripe</span>
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
  return (
    <div
      className={className}
      style={item.experience_image ? { backgroundImage: `url(${item.experience_image})` } : { background: item.experience_gradient || item.experience_accent || '#4f46e5' }}
      aria-hidden="true"
    />
  )
}

function contactFromUser(user, getDisplayName) {
  const name = getDisplayName?.(user) || ''
  const parts = name.split(' ').filter(Boolean)
  return {
    first: parts[0] || user?.email?.split('@')[0] || '',
    last: parts.slice(1).join(' '),
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
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
  const [confirmed, setConfirmed] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const releasedReservationRef = useRef(null)
  const reservationCreatingRef = useRef(null)

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets = items.reduce((s, i) => s + i.quantity, 0)
  const discount = Math.min(appliedCoupon?.discountAmount || 0, subtotal)
  const procFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
  const tax = numTickets > 0 ? 0.05 * subtotal : 0
  const grand = Math.max(0, subtotal - discount) + procFee + tax
  const contactReady = contact.first.trim().length > 1
    && contact.last.trim().length > 1
    && validEmail(contact.email)
    && validPhone(contact.phone)

  const orderItems = useMemo(() => items.map((item) => ({
    eventId: Number(item.event_id),
    slotId: item.slot_id,
    ticketTypeId: null,
    eventName: item.show_title,
    slotDate: item.session_date_key,
    slotTime: item.session_time,
    ticketType: item.ticket_type_label,
    quantity: item.quantity,
    unitPrice: item.unit_price,
  })), [items])

  const liveSlotReady = orderItems.length > 0 && orderItems.every((item) => Number.isFinite(item.eventId) && item.slotId && item.quantity > 0)
  const minQtyForTicketType = (ticketTypeId) => ticketTypeId === 'family' ? 3 : ticketTypeId === 'group' ? 6 : 1
  const invalidItems = items.filter((item) => item.quantity > 0 && item.quantity < minQtyForTicketType(item.ticket_type_id))
  const canContinueReview = liveSlotReady && invalidItems.length === 0

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

  function finishPayment(order, providerReference, method) {
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
    }
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
    if (item.quantity < minQty) onUpdateQty(item.id, minQty)
    onUpdateTicketType(item.id, ticketTypeId)
    setPaymentError('')
  }

  function updateQtyWithMinimum(item, nextQty) {
    const minQty = minQtyForTicketType(item.ticket_type_id)
    if (nextQty <= 0) {
      onUpdateQty(item.id, 0)
      return
    }
    onUpdateQty(item.id, Math.max(nextQty, minQty))
    setPaymentError('')
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
      ...order.items.map((item) => `${item.show_title} | ${item.session_date} ${item.session_time} | ${item.ticket_type_label} x${item.quantity} | ${fmt(item.unit_price * item.quantity)}`),
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
    setAuthMode(mode)
    resetAuthForm()
  }

  const renderSummary = () => {
    const summaryItems = confirmed?.items || items
    const total = confirmed?.grand ?? grand
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
                <strong>{item.show_title}</strong>
                <span>{item.session_date} · {item.session_time}</span>
              </div>
              <b>{fmt(item.unit_price * item.quantity)}</b>
            </div>
          ))}
          <SummaryRow label={`Subtotal`} value={fmt(confirmed?.subtotal ?? subtotal)} muted />
          {Boolean(confirmed?.discount ?? discount) && <SummaryRow label={`Coupon${(confirmed?.couponCode || appliedCoupon?.code) ? ` (${confirmed?.couponCode || appliedCoupon?.code})` : ''}`} value={`-${fmt(confirmed?.discount ?? discount)}`} muted />}
          <SummaryRow label="Processing fee" value={fmt(confirmed?.procFee ?? procFee)} muted />
          <SummaryRow label="GST (5%)" value={fmt(confirmed?.tax ?? tax)} muted />
          <div className="crt-sum-divider" />
          <SummaryRow label={step === 'confirm' ? 'Total paid' : 'Total due'} value={`${fmt(total)} CAD`} bold />
          {step === 'review' && (
            <div className="crt-promo-card-inline">
              <label htmlFor="cart-promo-code">Promo code</label>
              <div>
                <input id="cart-promo-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" />
                <button onClick={applyCoupon} type="button">Apply</button>
              </div>
              {couponMessage && <span className={appliedCoupon ? 'ok' : ''}>{couponMessage}</span>}
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
            <div><ShieldIcon /><span><strong>Live chat</strong><small>Available 9am - 9pm</small></span></div>
            <div><ShieldIcon /><span><strong>Email us</strong><small>support@vrworld.com</small></span></div>
            <div><ShieldIcon /><span><strong>Call us</strong><small>1-800-VR-WORLD</small></span></div>
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
                      <div className="crt-exp-cell"><ItemImage item={item} className="crt-cart-thumb" /><strong>{item.show_title}</strong></div>
                      <div className="crt-date-cell"><span>{item.session_date}</span><span>{item.session_time}</span></div>
                      <select value={item.ticket_type_id} onChange={(event) => updateTicketTypeWithMinimum(item, event.target.value)}>
                        {item.ticket_options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                      <div className="crt-inline-qty">
                        <button onClick={() => updateQtyWithMinimum(item, item.quantity - 1)} disabled={item.quantity <= minQtyForTicketType(item.ticket_type_id)} type="button">-</button>
                        <strong>{item.quantity}</strong>
                        <button onClick={() => updateQtyWithMinimum(item, item.quantity + 1)} type="button">+</button>
                      </div>
                      <span>{fmt(item.unit_price)}</span>
                      <strong>{fmt(item.unit_price * item.quantity)}</strong>
                      <button className="crt-remove" onClick={() => onRemove(item.id)} type="button">⌫</button>
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
                {!currentUser && (
                  <div className="crt-account-box">
                    <div className="crt-tabs">
                      <button className={authMode !== 'signup' ? 'active' : ''} onClick={() => switchAuthMode('login')} type="button">Log in</button>
                      <button className={authMode === 'signup' ? 'active' : ''} onClick={() => switchAuthMode('signup')} type="button">Create account</button>
                    </div>
                    <form className="crt-login-form" onSubmit={authMode === 'signup' ? handleSignup : handleLogin}>
                      {authMode === 'signup' && <label>Full name<input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} autoComplete="name" /></label>}
                      <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} autoComplete="email" /></label>
                      <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} /></label>
                      {authMessage && <div className="crt-warning">{authMessage}</div>}
                      <button className="crt-outline" disabled={!authReady} type="submit">{authMode === 'signup' ? 'Create account' : 'Log in'}</button>
                    </form>
                  </div>
                )}
                <div className="crt-form-panel crt-contact-panel">
                  <h3>Contact details</h3>
                  <p>We'll use this information for your booking confirmation and e-tickets.</p>
                  <div className="crt-form-grid">
                    <label className={touched.first && contact.first.trim().length <= 1 ? 'crt-field-error' : ''}>First name<input value={contact.first} onBlur={() => setTouched((p) => ({ ...p, first: true }))} onChange={(e) => setContact((p) => ({ ...p, first: e.target.value }))} /></label>
                    <label className={touched.last && contact.last.trim().length <= 1 ? 'crt-field-error' : ''}>Last name<input value={contact.last} onBlur={() => setTouched((p) => ({ ...p, last: true }))} onChange={(e) => setContact((p) => ({ ...p, last: e.target.value }))} /></label>
                    <label className={touched.email && !validEmail(contact.email) ? 'crt-field-error' : ''}>Email<input type="email" value={contact.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></label>
                    <label className={touched.phone && !validPhone(contact.phone) ? 'crt-field-error' : ''}>Phone<input type="tel" value={contact.phone} onBlur={() => setTouched((p) => ({ ...p, phone: true }))} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label className="crt-field-wide"><span>Special requests (optional)</span><textarea value={contact.request} onChange={(e) => setContact((p) => ({ ...p, request: e.target.value }))} placeholder="Tell us anything we should know..." /></label>
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
                    <button className={paymentMethod === 'card' ? 'active' : ''} onClick={() => setPaymentMethod('card')} type="button"><StripeLogo />Credit card</button>
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
                        <p>Scan this code in your mobile wallet. This checkout updates automatically after payment is confirmed.</p>
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
                      <div><strong>{item.show_title}</strong><span>{item.session_date} · {item.session_time}</span></div>
                      <span>Qty <b>{item.quantity}</b></span>
                      <button className="crt-outline" type="button">View ticket →</button>
                    </article>
                  ))}
                </div>
                <div className="crt-ticket-ready">
                  <img src={qrPlaceholder} alt="Ticket QR code" />
                  <div><strong>Your tickets are ready!</strong><span>Show your QR code at the venue or download your tickets to your device.</span></div>
                  <button className="crt-primary" onClick={downloadReceipt} type="button">Download all tickets</button>
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
      </div>
    </div>
  )
}
