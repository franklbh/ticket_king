import { useEffect, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { can } from '../auth/permissions'
import { createWalkInOrder, validateCoupon } from '../api/adminApi'
import { useAdminMutation } from '../hooks/useAdminApi'
import { useEventsQuery, useSlotsQuery, useTicketTypesQuery } from '../hooks/catalog'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, AdminCard, PageHeader } from '../components/AdminUI'
import { dedupeBy } from '../utils/collections'
import { currentAdminMinutes, todayIso } from '../utils/date'
import { formatNorthAmericanPhone } from '../utils/phone'
import { localizeCatalogName, localizeTicketTypeName } from '../utils/localization'

const PAYMENT_METHODS = [
  { id: 'Cash', labelKey: 'paymentCash', icon: 'fa-money-bill-wave' },
  { id: 'Credit Card', labelKey: 'paymentCreditCard', icon: 'fa-credit-card' },
  { id: 'WeChat Pay', labelKey: 'paymentWechatPay', icon: 'fa-comments' },
  { id: 'Alipay', labelKey: 'paymentAlipay', icon: 'fa-wallet' },
  { id: 'Other', labelKey: 'other', icon: 'fa-ellipsis-h' },
]
const GST_RATE = 0.05
const PLATFORM_FEE_PER_TICKET = 1.8
const PAYMENT_PROCESSING_RATE = 0.025
const FINAL_STEP_REMINDER_MS = 5 * 60 * 1000

function buildThemeOptions(events, availableSlots, lang = 'en') {
  const slotCountByEvent = availableSlots.reduce((counts, slot) => {
    const eventId = String(slot.event)
    counts.set(eventId, (counts.get(eventId) || 0) + 1)
    return counts
  }, new Map())

  const activeEventsWithSlots = events
    .filter(event => String(event.status || 'active').toLowerCase() === 'active')
    .filter(event => slotCountByEvent.has(String(event.id)))

  return activeEventsWithSlots.map(event => {
    const eventId = String(event.id)
    return {
      key: `event-${eventId}`,
      eventId,
      name: localizeCatalogName(event.name, lang),
      count: slotCountByEvent.get(eventId) || 0,
    }
  })
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function minutesFromTime(value) {
  const [hours = '0', minutes = '0'] = String(value || '').slice(0, 5).split(':')
  return Number(hours) * 60 + Number(minutes)
}

function weekdayForDate(dateKey) {
  return DAY_LABELS[new Date(`${dateKey}T12:00:00`).getDay()]
}

function ticketTypeMatchesSlot(ticketType, slot) {
  if (!slot) return false
  if (String(ticketType.status || '').toLowerCase() !== 'enabled') return false
  if (String(ticketType.event) !== String(slot.event)) return false
  if (ticketType.validFrom && slot.date < ticketType.validFrom) return false
  if (ticketType.validTo && slot.date > ticketType.validTo) return false

  const weekday = weekdayForDate(slot.date)
  if (Array.isArray(ticketType.weekdays) && ticketType.weekdays.length && !ticketType.weekdays.includes(weekday)) return false

  const slotStart = minutesFromTime(slot.startTime)
  const typeStart = minutesFromTime(ticketType.timeStart)
  const typeEnd = minutesFromTime(ticketType.timeEnd)
  return slotStart >= typeStart && slotStart <= typeEnd
}

function dateKeyFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthStartFromDateKey(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function localeForLang(lang) {
  if (lang === 'zh-Hans') return 'zh-CN'
  if (lang === 'zh-Hant') return 'zh-TW'
  return 'en-US'
}

function monthTitle(date, lang = 'en') {
  return date.toLocaleDateString(localeForLang(lang), { month: 'long', year: 'numeric' })
}

function isPastDateKey(dateKey) {
  return dateKey < todayIso()
}

function isPastSlot(slot) {
  if (!slot || slot.date !== todayIso()) return false
  return minutesFromTime(slot.startTime) < currentAdminMinutes()
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function moneyFromInput(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return money(amount)
}

function calculateFeeValues(draft, ticketCount = 0) {
  const ticketTotal = moneyFromInput(draft.ticketTotal)
  const addonTotal = moneyFromInput(draft.addonTotal)
  const discountBase = Math.max(0, ticketTotal + addonTotal)
  const couponDiscount = Math.min(moneyFromInput(draft.couponDiscount), discountBase)
  const taxableBase = Math.max(0, ticketTotal + addonTotal - couponDiscount)
  return {
    ticketTotal,
    addonTotal,
    couponDiscount,
    platformFee: draft.platformFee == null ? money(PLATFORM_FEE_PER_TICKET * ticketCount) : moneyFromInput(draft.platformFee),
    paymentFee: draft.paymentFee == null ? money(taxableBase * PAYMENT_PROCESSING_RATE) : moneyFromInput(draft.paymentFee),
    gstTax: money(taxableBase * GST_RATE),
    pstTax: 0,
  }
}

function feeDraftFromValues(values) {
  return {
    ticketTotal: values.ticketTotal.toFixed(2),
    addonTotal: values.addonTotal.toFixed(2),
    couponDiscount: values.couponDiscount.toFixed(2),
    platformFee: values.platformFee.toFixed(2),
    paymentFee: values.paymentFee.toFixed(2),
    gstTax: values.gstTax.toFixed(2),
  }
}

function createFeeDraft(totalAmount, fees = null, ticketCount = 0) {
  return feeDraftFromValues(calculateFeeValues({
    ticketTotal: fees?.ticketTotal ?? totalAmount,
    addonTotal: fees?.addonTotal ?? 0,
    couponDiscount: fees?.couponDiscount ?? 0,
    platformFee: fees?.platformFee,
    paymentFee: fees?.paymentFee,
  }, ticketCount))
}

function normalizeFeeDraft(draft, ticketCount = 0) {
  return calculateFeeValues(draft, ticketCount)
}

function StepIndicator({ step }) {
  const steps = [1, 2, 3, 4]
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, flexShrink: 0,
            background: s <= step ? '#6366f1' : '#e5e7eb',
            color: s <= step ? '#fff' : '#9ca3af',
          }}>{s <= step && s < step ? <i className="fa fa-check" /> : s}</div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: s < step ? '#6366f1' : '#e5e7eb', margin: '0 8px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateOrder() {
  const navigate = useNavigate()
  const { admin } = useAuth()
  const { lang } = useLang()
  const t = useT(lang)
  const canModifyFees = can(admin, 'orders:modify_fees')
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState(() => todayIso())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [datePickerMonth, setDatePickerMonth] = useState(() => monthStartFromDateKey(todayIso()))
  const [selectedTheme, setSelectedTheme] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', phone: '', email: '', remarks: '' })
  const [payment, setPayment] = useState('')
  const [markUsed, setMarkUsed] = useState(false)
  const [manualFees, setManualFees] = useState(null)
  const [feeDraft, setFeeDraft] = useState(() => createFeeDraft(0))
  const [feeConfirmOpen, setFeeConfirmOpen] = useState(false)
  const [feeEditorOpen, setFeeEditorOpen] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponMessage, setCouponMessage] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [lastOrderId, setLastOrderId] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [completionReminderOpen, setCompletionReminderOpen] = useState(false)
  const [completionReminderDismissed, setCompletionReminderDismissed] = useState(false)
  const timeSlotsRef = useRef(null)
  const scrollToTimeSlotsRef = useRef(false)
  const stepOneActionRef = useRef(null)
  const scrollToStepOneActionRef = useRef(false)
  const { data: slots = [], error: slotsError, loading: loadingSlots } = useSlotsQuery(
    selectedDate ? { dateFrom: selectedDate, dateTo: selectedDate } : {},
    { initialData: [], enabled: Boolean(selectedDate) }
  )
  const { data: ticketTypes = [], error: typesError, loading: loadingTypes } = useTicketTypesQuery(
    true,
    { initialData: [] }
  )
  const { data: events = [], error: eventsError, loading: loadingEvents } = useEventsQuery({ initialData: [] })
  const { mutate: createOrderMutation, loading: creatingOrder } = useAdminMutation(createWalkInOrder, {
    successMessage: 'Order created.',
  })

  const availableSlots = selectedDate ? slots.filter(s => s.date === selectedDate && s.status === 'active') : []
  const themeOptions = buildThemeOptions(events, availableSlots, lang)
  const selectedThemeOption = themeOptions.find(option => option.key === selectedTheme)
  const selectedEventId = selectedThemeOption?.eventId || ''
  const selectedThemeSlots = selectedTheme
    ? availableSlots.filter(slot => String(slot.event) === String(selectedEventId))
    : []
  const themeNameByKey = new Map(themeOptions.map(option => [option.key, option.name]))
  const eventNameById = new Map(events.map(event => [String(event.id), localizeCatalogName(event.name, lang)]))
  const matchingTypeRows = selectedTheme
    ? ticketTypes.filter(tp => String(tp.event) === String(selectedEventId))
    : ticketTypes
  const enabledTypes = dedupeBy(
    (selectedSlot ? matchingTypeRows.filter(tp => ticketTypeMatchesSlot(tp, selectedSlot)) : [])
      .sort((a, b) => Number(a.id) - Number(b.id)),
    tp => tp.name
  )
  const selectedLocale = localeForLang(lang)
  const localizedPaymentMethod = PAYMENT_METHODS.find(pm => pm.id === payment)
  const paymentLabel = localizedPaymentMethod ? t[localizedPaymentMethod.labelKey] : payment
  const dateWeekdays = lang === 'zh-Hant'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : lang === 'zh-Hans'
      ? ['日', '一', '二', '三', '四', '五', '六']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  function slotCountText(count) {
    return lang === 'en'
      ? `${count} ${count === 1 ? t.timeSlotLabel : t.timeSlotsLabel}`
      : `${count}${t.timeSlotsLabel}`
  }

  function ticketCountText(count) {
    return lang === 'en'
      ? `${count} ticket${count === 1 ? '' : 's'}`
      : `${count}张票`
  }

  function cartLineCountText(count) {
    return lang === 'en'
      ? `${count} ${count === 1 ? t.cartLineLabel : t.cartLinesLabel}`
      : `${count}${t.cartLinesLabel}`
  }

  function slotLabel(slot) {
    if (!slot) return ''
    return `${slot.date} ${slot.startTime}-${slot.endTime}`
  }

  function cartLineKey(slot, ticketTypeId) {
    return `${slot.id}:${ticketTypeId}`
  }

  function ticketUnitPrice(ticketType, slot) {
    return ticketType.priceType === 'fixed'
      ? (ticketType.price || 0)
      : (slot?.price || 37.95) + (ticketType.priceAdj || 0)
  }

  function slotRemaining(slot) {
    if (!slot) return 0
    const sold = Number(slot.websiteSeats || 0) + Number(slot.inStoreSeats || 0)
    return Math.max(0, Number(slot.totalSeats || 0) - sold)
  }

  function selectedSlotCount(ticketTypeId) {
    if (!selectedSlot) return 0
    return cartItems.find(item => item.key === cartLineKey(selectedSlot, ticketTypeId))?.quantity || 0
  }

  function handleThemeSelect(themeKey) {
    if (String(themeKey) === String(selectedTheme)) return
    scrollToTimeSlotsRef.current = window.matchMedia?.('(max-width: 760px)').matches || window.innerWidth <= 760
    setSelectedTheme(String(themeKey))
    setSelectedSlot(null)
  }

  function handleSlotSelect(slot) {
    if (isPastSlot(slot)) return
    scrollToStepOneActionRef.current = window.matchMedia?.('(max-width: 760px)').matches || window.innerWidth <= 760
    setSelectedSlot(slot)
    const themeForSlot = themeOptions.find(option => option.eventId === String(slot.event))
    setSelectedTheme(themeForSlot?.key || selectedTheme)
  }

  function updateTicketCount(typeId, delta) {
    if (!selectedSlot) return
    const type = enabledTypes.find(t => String(t.id) === String(typeId))
    if (!type) return
    clearCheckoutAdjustments()
    setCartItems(prev => {
      const key = cartLineKey(selectedSlot, typeId)
      const current = prev.find(item => item.key === key)?.quantity || 0
      const next = Math.max(0, current + delta)
      const otherQtyInSlot = prev
        .filter(item => String(item.slotId) === String(selectedSlot.id) && item.key !== key)
        .reduce((sum, item) => sum + item.quantity, 0)
      const cappedNext = Math.min(next, Math.max(0, slotRemaining(selectedSlot) - otherQtyInSlot))
      if (cappedNext === 0) {
        return prev.filter(item => item.key !== key)
      }
      const unitPrice = ticketUnitPrice(type, selectedSlot)
      const line = {
        key,
        eventId: selectedSlot.event,
        eventName: eventNameById.get(String(selectedSlot.event)) || selectedThemeOption?.name || 'Event',
        slotId: selectedSlot.id,
        slotDate: selectedSlot.date,
        slotStartTime: selectedSlot.startTime,
        slotEndTime: selectedSlot.endTime,
        ticketTypeId: type.id,
        ticketTypeSource: type.name,
        ticketType: localizeTicketTypeName(type.name, lang),
        quantity: cappedNext,
        unitPrice: Number(unitPrice.toFixed(2)),
      }
      return prev.some(item => item.key === key)
        ? prev.map(item => item.key === key ? line : item)
        : [...prev, line]
    })
  }

  function removeCartItem(key) {
    clearCheckoutAdjustments()
    setCartItems(prev => prev.filter(item => item.key !== key))
  }

  function clearCheckoutAdjustments() {
    setManualFees(null)
    setFeeDraft(createFeeDraft(0))
    setFeeConfirmOpen(false)
    setFeeEditorOpen(false)
    setAppliedCoupon(null)
    setCouponMessage('')
  }

  function handleDateChange(value) {
    if (!value || isPastDateKey(value)) return
    setSelectedDate(value)
    setDatePickerMonth(monthStartFromDateKey(value))
    setSelectedTheme('')
    setSelectedSlot(null)
  }

  function openDatePicker() {
    setDatePickerMonth(monthStartFromDateKey(selectedDate || todayIso()))
    setDatePickerOpen(open => !open)
  }

  const datePickerCells = (() => {
    const leadingBlanks = datePickerMonth.getDay()
    const daysInMonth = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 0).getDate()
    return [
      ...Array.from({ length: leadingBlanks }, (_, idx) => ({ key: `blank-${idx}`, blank: true })),
      ...Array.from({ length: daysInMonth }, (_, idx) => {
        const date = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), idx + 1)
        const key = dateKeyFromDate(date)
        return { key, day: idx + 1, past: isPastDateKey(key) }
      }),
    ]
  })()

  function selectPickerDate(value) {
    handleDateChange(value)
    setDatePickerOpen(false)
  }

  const totalTickets = cartItems.reduce((s, item) => s + item.quantity, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const defaultFees = calculateFeeValues({
    ticketTotal: totalAmount,
    addonTotal: 0,
    couponDiscount: appliedCoupon?.discount || 0,
  }, totalTickets)
  const adjustedTicketAmount = manualFees ? manualFees.ticketTotal : defaultFees.ticketTotal
  const addonAmount = manualFees ? manualFees.addonTotal : defaultFees.addonTotal
  const platformFee = manualFees ? manualFees.platformFee : defaultFees.platformFee
  const paymentFee = manualFees ? manualFees.paymentFee : defaultFees.paymentFee
  const adminAdjustment = money(adjustedTicketAmount - totalAmount)
  const discountBase = Math.max(0, adjustedTicketAmount + addonAmount)
  const couponDiscount = Math.min(manualFees ? manualFees.couponDiscount : defaultFees.couponDiscount, discountBase)
  const taxableAmount = Math.max(0, adjustedTicketAmount + addonAmount - couponDiscount)
  const gstAmount = manualFees ? manualFees.gstTax : defaultFees.gstTax
  const pstAmount = manualFees ? manualFees.pstTax : 0
  const totalDue = taxableAmount + platformFee + paymentFee + gstAmount + pstAmount
  const feeDraftTotal = (() => {
    const values = normalizeFeeDraft(feeDraft, totalTickets)
    return money(
      Math.max(0, values.ticketTotal + values.addonTotal + values.platformFee + values.paymentFee - values.couponDiscount) +
      values.gstTax
    )
  })()
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  const ticketValidationError = cartItems.reduce((message, item) => {
    if (message) return message
    if (!item.slotId || !item.slotDate || !item.slotStartTime || !item.ticketTypeId) {
      return 'Each ticket line must have a date, time slot, and ticket type.'
    }
    if (/group/i.test(item.ticketTypeSource || item.ticketType) && item.quantity < 6) {
      return lang === 'en'
        ? `${item.ticketType} requires at least 6 tickets.`
        : `${item.ticketType}至少需要6张票。`
    }
    return ''
  }, '')

  useEffect(() => {
    if (step !== 4 || orderComplete || creatingOrder || completionReminderOpen || completionReminderDismissed) {
      return undefined
    }

    const reminderTimer = window.setTimeout(() => {
      setCompletionReminderOpen(true)
      setCompletionReminderDismissed(true)
    }, FINAL_STEP_REMINDER_MS)

    return () => window.clearTimeout(reminderTimer)
  }, [completionReminderDismissed, completionReminderOpen, creatingOrder, orderComplete, step])

  useEffect(() => {
    if (step !== 4) {
      setCompletionReminderOpen(false)
      setCompletionReminderDismissed(false)
    }
  }, [step])

  useEffect(() => {
    if (!selectedSlot || !scrollToStepOneActionRef.current) return
    scrollToStepOneActionRef.current = false
    window.requestAnimationFrame(() => {
      stepOneActionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [selectedSlot])

  useEffect(() => {
    if (!selectedTheme || !selectedThemeSlots.length || !scrollToTimeSlotsRef.current) return
    scrollToTimeSlotsRef.current = false
    window.requestAnimationFrame(() => {
      timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [selectedTheme, selectedThemeSlots.length])

  async function handleConfirm() {
    setSubmitError(null)
    setCompletionReminderOpen(false)
    setCompletionReminderDismissed(true)
    if (totalTickets === 0) {
      setSubmitError('Select a date, time slot, and ticket type before creating an order.')
      setStep(1)
      return
    }
    if (ticketValidationError) {
      setSubmitError(ticketValidationError)
      setStep(1)
      return
    }
    const tickets = cartItems.map(item => ({
      event_id: item.eventId,
      event_name: item.eventName,
      slot_id: item.slotId,
      slot_date: item.slotDate,
      slot_start_time: item.slotStartTime,
      slot_end_time: item.slotEndTime,
      ticket_type_id: item.ticketTypeId,
      ticket_type: item.ticketTypeSource || item.ticketType,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }))
    const firstItem = cartItems[0]

    try {
      const created = await createOrderMutation({
        slot_id: cartItems.length === 1 ? firstItem.slotId : null,
        slot_date: firstItem?.slotDate || selectedDate,
        slot_start_time: firstItem?.slotStartTime || null,
        slot_end_time: firstItem?.slotEndTime || null,
        tickets,
        customer: {
          name: customerName || null,
          email: customer.email || null,
          phone: customer.phone || null,
          remarks: customer.remarks || null,
        },
        payment_method: payment,
        mark_used_immediately: markUsed,
        admin_adjustment: adminAdjustment,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: Number(couponDiscount.toFixed(2)),
        addon_amount: Number(addonAmount.toFixed(2)),
        platform_fee: Number(platformFee.toFixed(2)),
        payment_fee: Number(paymentFee.toFixed(2)),
        gst: Number(gstAmount.toFixed(2)),
        pst: Number(pstAmount.toFixed(2)),
      })
      setLastOrderId(created?.order?.id || created?.order?.orderNumber || created?.order?.order_number)
      setOrderComplete(true)
    } catch (err) {
      setSubmitError(err.message)
    }
  }

  function resetOrder() {
    setStep(1)
    setCompletionReminderOpen(false)
    setCompletionReminderDismissed(false)
    setSelectedTheme('')
    setSelectedSlot(null)
    setCartItems([])
    setCustomer({ firstName: '', lastName: '', phone: '', email: '', remarks: '' })
    setPayment('')
    setMarkUsed(false)
    clearCheckoutAdjustments()
    setOrderComplete(false)
    setLastOrderId(null)
  }

  function changePrice() {
    if (!canModifyFees) return
    setFeeDraft(createFeeDraft(totalAmount, manualFees, totalTickets))
    setFeeConfirmOpen(true)
  }

  function confirmFeeModification() {
    setAppliedCoupon(null)
    setCouponMessage('')
    setFeeConfirmOpen(false)
    setFeeEditorOpen(true)
    setManualFees(normalizeFeeDraft(feeDraft, totalTickets))
  }

  function updateFeeDraft(field, value) {
    setFeeDraft(prev => {
      const next = { ...prev, [field]: value }
      const calculated = feeDraftFromValues(normalizeFeeDraft(next, totalTickets))
      setManualFees(normalizeFeeDraft(calculated, totalTickets))
      return { ...calculated, [field]: value }
    })
  }

  function cancelFeeModification() {
    setManualFees(null)
    setFeeDraft(createFeeDraft(totalAmount, null, totalTickets))
    setFeeEditorOpen(false)
    setCouponMessage(t.customFeeRemoved)
  }

  function formatMoneyInput(field) {
    setFeeDraft(prev => {
      const next = { ...prev, [field]: moneyFromInput(prev[field]).toFixed(2) }
      const calculated = feeDraftFromValues(normalizeFeeDraft(next, totalTickets))
      setManualFees(normalizeFeeDraft(calculated, totalTickets))
      return calculated
    })
  }

  async function applyCoupon() {
    if (manualFees) {
      setCouponMessage(t.useCouponDiscountInFees)
      return
    }
    if (appliedCoupon) {
      setAppliedCoupon(null)
      setCouponMessage(t.couponRemoved)
      return
    }
    const code = window.prompt(t.couponCodePrompt)
    if (!code?.trim()) return
    setApplyingCoupon(true)
    setCouponMessage('')
    try {
      const result = await validateCoupon({ code: code.trim(), amount: adjustedTicketAmount })
      if (!result.valid) {
        setCouponMessage(result.reason || t.couponInvalid)
        return
      }
      setAppliedCoupon({
        code: result.code,
        discount: Number(result.discount || 0),
      })
      setCouponMessage(lang === 'en' ? `Coupon ${result.code} applied.` : `优惠券 ${result.code} 已使用。`)
    } catch (err) {
      setCouponMessage(err.message || t.unableValidateCoupon)
    } finally {
      setApplyingCoupon(false)
    }
  }

  if (orderComplete) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>
          <i className="fa fa-check-circle" style={{ color: '#10b981' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{t.orderCreated}</h2>
        <p style={{ color: '#6b7280', marginBottom: 8 }}>{t.orderID}: <strong style={{ color: '#6366f1', fontFamily: 'monospace' }}>#{lastOrderId}</strong></p>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          {ticketCountText(totalTickets)} · ${totalDue.toFixed(2)} · {paymentLabel}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={resetOrder} startIcon={<i className="fa fa-plus" />}>{t.createAnotherOrder}</Button>
          <Button variant="contained" startIcon={<i className="fa fa-print" />}>{t.printTickets}</Button>
          <Button variant="contained" onClick={() => navigate(`/orders?orderId=${encodeURIComponent(lastOrderId)}`)} startIcon={<i className="fa fa-external-link-alt" />}>{t.viewInOrders}</Button>
        </div>
      </div>
    )
  }

  if ((selectedDate && loadingSlots) || loadingTypes || loadingEvents) {
    return <LoadingIndicator label={t.loadingLiveCatalog} />
  }

  return (
    <div>
      <PageHeader
        icon="fa-cash-register"
        title={t.createOrderTitle}
        subtitle={t.createOrderSub}
      />
      {(slotsError || typesError || eventsError || submitError) && (
        <AdminAlert tone="warning">
          {submitError || `${t.catalogLoadError}: ${(slotsError || typesError || eventsError)?.message}`}
        </AdminAlert>
      )}
      <StepIndicator step={step} />

      {/* Step 1: Select Time Slot */}
      {step === 1 && (
        <AdminCard>
          <div className="create-order-step-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
              <i className="fa fa-clock" />
              {t.step1}
            </h2>
            <span className="create-order-date-picker-wrap">
              <Button
                className="create-order-date-trigger"
                variant="outlined"
                size="small"
                onClick={openDatePicker}
                startIcon={<i className="fa fa-calendar" />}
                aria-expanded={datePickerOpen}
                type="button"
              >
                {t.selectOtherDate}
              </Button>
              {datePickerOpen && (
                <div className="create-order-date-popover" role="dialog" aria-label={t.selectOtherDate}>
                  <div className="create-order-date-popover-head">
                    <strong>{monthTitle(datePickerMonth, lang)}</strong>
                    <div>
                      <button
                        type="button"
                        onClick={() => setDatePickerMonth(month => shiftMonth(month, -1))}
                        aria-label={t.back}
                      >
                        <i className="fa fa-chevron-left" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePickerMonth(month => shiftMonth(month, 1))}
                        aria-label={t.next}
                      >
                        <i className="fa fa-chevron-right" />
                      </button>
                    </div>
                  </div>
                  <div className="create-order-date-weekdays" aria-hidden="true">
                    {dateWeekdays.map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="create-order-date-grid">
                    {datePickerCells.map(cell => cell.blank ? (
                      <span key={cell.key} />
                    ) : (
                      <button
                        key={cell.key}
                        type="button"
                        className={`${cell.key === selectedDate ? 'selected' : ''} ${cell.past ? 'past' : ''}`.trim()}
                        onClick={() => selectPickerDate(cell.key)}
                        disabled={cell.past}
                        aria-disabled={cell.past}
                      >
                        {cell.day}
                      </button>
                    ))}
                  </div>
                  <div className="create-order-date-actions">
                    <button type="button" onClick={() => setDatePickerOpen(false)}>
                      {t.close}
                    </button>
                  </div>
                </div>
              )}
            </span>
          </div>

          <div className="create-order-current-date" style={{ background: '#dbeafe', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 4, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <i className="fa fa-calendar-day" style={{ color: '#3b82f6' }} />
            <strong>{t.currentDate}:</strong>
            <span style={{ fontWeight: 600, color: '#6366f1' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(selectedLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {availableSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <i className="fa fa-calendar-times" style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
              {t.noSlotsAvailable}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  {t.selectThemeFirst}
                </div>
                <div className="create-order-theme-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {themeOptions.map(option => {
                    const isSelected = selectedTheme === option.key
                    return (
                      <button
                        key={option.key}
                        onClick={() => handleThemeSelect(option.key)}
                        type="button"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          textAlign: 'left',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                          background: isSelected ? '#eef2ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#111827' }}>{option.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                          {slotCountText(option.count)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {!selectedTheme ? (
                <div style={{ textAlign: 'center', padding: 28, color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  {t.selectThemeEmpty}
                </div>
              ) : selectedThemeSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 28, color: '#9ca3af' }}>
                  {t.noThemeSlots}
                </div>
              ) : (
                <>
                  <div ref={timeSlotsRef} style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                    {t.timeSlotsFor} {themeNameByKey.get(selectedTheme) || selectedTheme}
                  </div>
                  <div className="create-order-slot-grid">
                    {selectedThemeSlots.map(slot => {
                const sold = slot.websiteSeats + slot.inStoreSeats
                const remaining = Math.max(0, slot.totalSeats - sold)
                const isSelected = selectedSlot?.id === slot.id
                const pastSlot = isPastSlot(slot)
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={pastSlot}
                    aria-disabled={pastSlot}
                    className="create-order-slot-card"
                    style={{
                      borderRadius: 8, textAlign: 'left',
                      border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      background: pastSlot ? '#f3f4f6' : isSelected ? '#fef2f2' : '#fff',
                      cursor: pastSlot ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                      opacity: pastSlot ? 0.55 : 1,
                    }}
                  >
                    <div className="create-order-slot-time" style={{ color: pastSlot ? '#9ca3af' : '#111827' }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div className="create-order-slot-seats">
                      <span style={{ color: pastSlot ? '#9ca3af' : remaining > 5 ? '#10b981' : remaining > 0 ? '#f59e0b' : '#ef4444', fontWeight: 500 }}>
                        {lang === 'en' ? `${remaining} ${t.seatsLeft}` : `${remaining}${t.seatsLeft}`}
                      </span>
                    </div>
                  </button>
                )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {(selectedSlot || totalTickets > 0) && (
            <div ref={stepOneActionRef} style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>
                {t.cartTotal}: {ticketCountText(totalTickets)} · ${totalAmount.toFixed(2)}
              </div>
              <Button
                variant="contained"
                onClick={() => selectedSlot ? setStep(2) : setStep(3)}
                endIcon={<i className="fa fa-arrow-right" />}
              >
                {selectedSlot ? t.step2.replace(/^Step 2: |^第2步：/, '') : t.checkout}
              </Button>
            </div>
          )}
        </AdminCard>
      )}

      {/* Step 2: Select Tickets */}
      {step === 2 && (
        <AdminCard>
          <div className="create-order-ticket-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa fa-ticket" style={{ color: '#6366f1' }} />
              {t.step2}
            </h2>
            <div className="create-order-ticket-selected" style={{ fontSize: 13, color: '#6b7280' }}>
              {t.selected}: {slotLabel(selectedSlot)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enabledTypes.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                {t.noTicketTypesForSlot}
              </div>
            )}
            {enabledTypes.map(tp => {
              const count = selectedSlotCount(tp.id)
              const price = ticketUnitPrice(tp, selectedSlot)
              return (
                <div className="create-order-ticket-row" key={tp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: count > 0 ? '#fef2f2' : '#fff' }}>
                  <div className="create-order-ticket-info">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{localizeTicketTypeName(tp.name, lang)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      ${price?.toFixed(2)} · 1 {t.seatUnit}{tp.name.includes('Family Bundle') ? ` · ${t.minLabel}: 3` : tp.name.includes('Group Ticket') ? ` · ${t.minLabel}: 6` : ''}
                    </div>
                  </div>
                  <div className="create-order-ticket-controls" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => updateTicketCount(tp.id, -1)}
                      disabled={count === 0}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: count > 0 ? 'pointer' : 'not-allowed', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >-</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{count}</span>
                    <button
                      onClick={() => updateTicketCount(tp.id, 1)}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #6366f1', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalTickets > 0 && (
            <div className="create-order-cart-summary" style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div className="create-order-cart-total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>{t.cartTotal}: {ticketCountText(totalTickets)}</span>
                <span className="create-order-cart-total-amount" style={{ color: '#6366f1' }}>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="create-order-cart-lines" style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {cartItems.map(item => (
                  <div className="create-order-cart-line" key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: '#475569' }}>
                    <span className="create-order-cart-line-text" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.eventName} · {item.slotDate} {item.slotStartTime}-{item.slotEndTime} · {item.ticketType} × {item.quantity}
                    </span>
                    <button
                      className="create-order-cart-remove"
                      type="button"
                      onClick={() => removeCartItem(item.key)}
                      aria-label={`${t.removeCoupon} ${item.ticketType}`}
                      title={t.removeCoupon}
                      style={{ border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 800, cursor: 'pointer', flexShrink: 0, width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fa fa-times" />
                    </button>
                  </div>
                ))}
              </div>
              {ticketValidationError && (
                <div style={{ marginTop: 8, color: '#b45309', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-exclamation-triangle" />
                  {ticketValidationError}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button variant="outlined" onClick={() => setStep(1)} startIcon={<i className="fa fa-plus" />}>{t.addMore}</Button>
            <Button variant="contained" onClick={() => setStep(3)} disabled={totalTickets === 0 || Boolean(ticketValidationError)} endIcon={<i className="fa fa-arrow-right" />}>{t.checkout}</Button>
          </div>
        </AdminCard>
      )}

      {/* Step 3: Customer Information */}
      {step === 3 && (
        <AdminCard>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-user" style={{ color: '#6366f1' }} /> {t.step3Optional}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <TextField fullWidth size="small" label={t.firstName} value={customer.firstName} onChange={e => setCustomer(c => ({ ...c, firstName: e.target.value }))} />
              </div>
              <div>
                <TextField fullWidth size="small" label={t.lastName} value={customer.lastName} onChange={e => setCustomer(c => ({ ...c, lastName: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <TextField fullWidth size="small" label={t.phone} value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: formatNorthAmericanPhone(e.target.value) }))} />
              </div>
              <div>
                <TextField fullWidth size="small" label={t.email} type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <TextField fullWidth size="small" label={t.remarksAdminOnly} value={customer.remarks} onChange={e => setCustomer(c => ({ ...c, remarks: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <Button variant="outlined" onClick={() => setStep(2)} startIcon={<i className="fa fa-arrow-left" />}>{t.back}</Button>
            <Button variant="contained" onClick={() => setStep(4)} endIcon={<i className="fa fa-arrow-right" />}>{t.next}</Button>
          </div>
        </AdminCard>
      )}

      {/* Step 4: Payment Method & Summary */}
      {step === 4 && (
        <AdminCard>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-credit-card" style={{ color: '#6366f1' }} /> {t.step4PaymentSummary}
          </h2>

          <div className="create-order-payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
            {PAYMENT_METHODS.map(pm => (
              <Button
                className="create-order-payment-button"
                key={pm.id}
                onClick={() => setPayment(pm.id)}
                variant={payment === pm.id ? 'contained' : 'outlined'}
                style={{
                  minHeight: 72,
                  padding: '12px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: payment === pm.id ? '2px solid #6366f1' : '1px solid #e5e7eb',
                  background: payment === pm.id ? '#eef2ff' : '#fff',
                  color: payment === pm.id ? '#4f46e5' : '#374151',
                  fontWeight: payment === pm.id ? 700 : 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <i className={`fa ${pm.icon}`} style={{ fontSize: 22 }} />
                {t[pm.labelKey]}
              </Button>
            ))}
          </div>

          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 18, border: '1px solid #eef2f7' }}>
            <div className="create-order-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{t.orderDetails}</div>
                <div style={{ display: 'grid', gap: 7, fontSize: 13, color: '#4b5563' }}>
                  <div><strong style={{ color: '#111827' }}>{t.itemsLabel}:</strong> {cartLineCountText(cartItems.length)}</div>
                  <div><strong style={{ color: '#111827' }}>{t.customerLabel}:</strong> {customerName || t.walkInCustomer}</div>
                  <div><strong style={{ color: '#111827' }}>{t.email}:</strong> {customer.email || '-'}</div>
                  <div><strong style={{ color: '#111827' }}>{t.phone}:</strong> {customer.phone || '-'}</div>
                  <div><strong style={{ color: '#111827' }}>{t.remarks}:</strong> {customer.remarks || '-'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{t.amountSummary}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {cartItems.map(item => {
                    return (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#4b5563' }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.eventName} · {item.slotDate} {item.slotStartTime}-{item.slotEndTime}<br />
                          {item.ticketType} × {item.quantity}
                        </span>
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    )
                  })}
                  <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                    <span>{t.ticketTotalLabel}</span>
                    <span>${adjustedTicketAmount.toFixed(2)}</span>
                  </div>
                  {adminAdjustment !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: adminAdjustment < 0 ? '#dc2626' : '#047857' }}>
                      <span>{t.priceAdjustment}</span>
                      <span>{adminAdjustment < 0 ? '-' : '+'}${Math.abs(adminAdjustment).toFixed(2)}</span>
                    </div>
                  )}
                  {(manualFees || addonAmount > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>{t.addonTotalLabel}</span>
                      <span>${addonAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(manualFees || platformFee > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>{t.platformProcessingFee}</span>
                      <span>${platformFee.toFixed(2)}</span>
                    </div>
                  )}
                  {(manualFees || paymentFee > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>{t.paymentProcessingFee}</span>
                      <span>${paymentFee.toFixed(2)}</span>
                    </div>
                  )}
                  {(appliedCoupon || manualFees) && couponDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#dc2626' }}>
                      <span>{appliedCoupon ? `${t.coupon} (${appliedCoupon.code})` : t.couponDiscountLabel}</span>
                      <span>-${couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                    <span>{t.gstLabel}</span>
                    <span>${gstAmount.toFixed(2)}</span>
                  </div>
                  {pstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>{t.pstTax}</span>
                      <span>${pstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: '#d1d5db', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: '#111827' }}>
                    <span>{t.total}</span>
                    <span style={{ color: '#4f46e5' }}>${totalDue.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    {canModifyFees && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={changePrice}
                        startIcon={<i className="fa fa-sliders-h" />}
                        sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
                      >
                        {t.changePrice}
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      onClick={applyCoupon}
                      disabled={applyingCoupon}
                      startIcon={<i className={`fa ${appliedCoupon ? 'fa-times' : 'fa-tag'}`} />}
                      sx={{ bgcolor: '#6b7280', '&:hover': { bgcolor: '#4b5563' } }}
                    >
                      {appliedCoupon ? t.removeCoupon : t.applyCoupon}
                    </Button>
                  </div>
                  {couponMessage && (
                    <div style={{ fontSize: 12, color: appliedCoupon || manualFees ? '#047857' : '#b45309', textAlign: 'right' }}>
                      {couponMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {feeEditorOpen && (
            <div className="fee-modifier-panel">
              <div className="fee-modifier-warning">
                <i className="fa fa-exclamation-triangle" />
                <span>{t.feeWarning}</span>
              </div>

              <div className="fee-modifier-grid">
                {[
                  ['ticketTotal', t.ticketTotalLabel, false],
                  ['addonTotal', t.addonTotalVipLabel, false],
                  ['couponDiscount', t.couponDiscountLabel, false],
                  ['platformFee', t.platformProcessingFee, false],
                  ['paymentFee', t.paymentProcessingFeeCardLabel, false],
                  ['gstTax', t.gstTax, true],
                ].map(([field, label, calculated]) => (
                  <label
                    key={field}
                    className={`${field === 'couponDiscount' ? 'fee-modifier-field wide' : 'fee-modifier-field'} ${calculated ? 'calculated' : ''}`.trim()}
                  >
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeDraft[field]}
                      onChange={calculated ? undefined : e => updateFeeDraft(field, e.target.value)}
                      onBlur={calculated ? undefined : () => formatMoneyInput(field)}
                      inputMode="decimal"
                      readOnly={calculated}
                    />
                    {field === 'couponDiscount' && (
                      <small>{t.feeCouponExample}</small>
                    )}
                  </label>
                ))}
              </div>

              <div className="fee-modifier-total">
                <span>{t.total}</span>
                <strong>${feeDraftTotal.toFixed(2)}</strong>
              </div>

              <div className="fee-modifier-footer">
                <Button
                  variant="contained"
                  onClick={cancelFeeModification}
                  startIcon={<i className="fa fa-times" />}
                  sx={{ bgcolor: '#6b7280', '&:hover': { bgcolor: '#4b5563' } }}
                >
                  {t.cancel}
                </Button>
                <p>{t.modifiedPricesNote}</p>
              </div>
            </div>
          )}

          <FormControlLabel
            sx={{ display: 'flex', justifyContent: 'center', mb: 1.5, mx: 0 }}
            control={<Checkbox checked={markUsed} onChange={e => setMarkUsed(e.target.checked)} />}
            label={t.markOrderUsedImmediately}
          />

          <div style={{ maxWidth: 780, margin: '0 auto 22px', background: '#f3f4f6', borderLeft: '3px solid #3b82f6', borderRadius: 6, padding: '10px 12px', color: '#6b7280', fontSize: 12, lineHeight: 1.4 }}>
            {t.uncheckedOrderNotice}<br />
            {t.checkedOrderNotice}
          </div>

          <div className="create-order-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <Button variant="outlined" onClick={() => setStep(3)} startIcon={<i className="fa fa-arrow-left" />}>{t.back}</Button>
            <Button variant="contained" onClick={handleConfirm} disabled={!payment || creatingOrder || totalTickets === 0 || Boolean(ticketValidationError)} size="large" startIcon={<i className="fa fa-check-circle" />}>
              {t.createOrderCompletePayment}
            </Button>
          </div>
        </AdminCard>
      )}

      {feeConfirmOpen && (
        <div className="fee-confirm-overlay" role="presentation">
          <div className="fee-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="fee-confirm-title">
            <div className="fee-confirm-header">
              <h2 id="fee-confirm-title">
                <i className="fa fa-exclamation-triangle" />
                {t.confirmModifyFees}
              </h2>
              <button type="button" onClick={() => setFeeConfirmOpen(false)} aria-label="Close">
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="fee-confirm-body">
              <div className="fee-confirm-warning">
                <i className="fa fa-exclamation-circle" />
                <span>
                  {t.feeConfirmText}
                </span>
              </div>
            </div>
            <div className="fee-confirm-actions">
              <Button
                variant="contained"
                onClick={() => setFeeConfirmOpen(false)}
                startIcon={<i className="fa fa-times" />}
                sx={{ bgcolor: '#6b7280', '&:hover': { bgcolor: '#4b5563' } }}
              >
                {t.cancel}
              </Button>
              <Button
                variant="contained"
                onClick={confirmFeeModification}
                startIcon={<i className="fa fa-check" />}
                sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
              >
                {t.yesModifyFees}
              </Button>
            </div>
          </div>
        </div>
      )}

      {completionReminderOpen && (
        <div className="create-order-reminder-overlay" role="presentation">
          <div className="create-order-reminder-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-reminder-title">
            <div className="create-order-reminder-header">
              <h2 id="create-order-reminder-title">
                <i className="fa fa-bell" />
                {t.completeThisOrder}
              </h2>
              <button type="button" onClick={() => setCompletionReminderOpen(false)} aria-label={t.closeReminder}>
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="create-order-reminder-body">
              <div className="create-order-reminder-warning">
                <i className="fa fa-exclamation-circle" />
                <span>
                  {t.completionReminderText}
                </span>
              </div>
            </div>
            <div className="create-order-reminder-actions">
              <Button
                variant="contained"
                onClick={() => setCompletionReminderOpen(false)}
                startIcon={<i className="fa fa-check" />}
              >
                {t.gotIt}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
