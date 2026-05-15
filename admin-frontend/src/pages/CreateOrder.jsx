import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { SLOTS_DATA, TICKET_TYPES_DATA } from '../data/mockData'

const TODAY = '2026-05-14'
const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: 'fa-money-bill-wave' },
  { id: 'Credit Card', label: 'Credit Card', icon: 'fa-credit-card' },
  { id: 'WeChat Pay', label: 'WeChat Pay', icon: 'fa-comments' },
  { id: 'Alipay', label: 'Alipay', icon: 'fa-wallet' },
  { id: 'Other', label: 'Other', icon: 'fa-ellipsis-h' },
]
const GST_RATE = 0.05
const CREATED_ORDERS_KEY = 'tk_created_orders'

function dedupeTicketTypes(types) {
  return types.reduce((list, type) => {
    if (!list.some(item => item.name === type.name)) list.push(type)
    return list
  }, [])
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
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [ticketSelections, setTicketSelections] = useState({})
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', phone: '', email: '', remarks: '' })
  const [payment, setPayment] = useState('')
  const [markUsed, setMarkUsed] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [lastOrderId, setLastOrderId] = useState(null)

  const availableSlots = SLOTS_DATA.filter(s => s.date === selectedDate && s.status === 'active')
  const enabledTypes = dedupeTicketTypes(
    TICKET_TYPES_DATA.filter(tp => tp.status === 'enabled')
  )

  function handleSlotSelect(slot) {
    setSelectedSlot(slot)
    setTicketSelections({})
  }

  function updateTicketCount(typeId, delta) {
    setTicketSelections(prev => {
      const current = prev[typeId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [typeId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [typeId]: next }
    })
  }

  const totalTickets = Object.values(ticketSelections).reduce((s, v) => s + v, 0)
  const totalAmount = Object.entries(ticketSelections).reduce((sum, [typeId, count]) => {
    const tp = enabledTypes.find(t => t.id === Number(typeId))
    if (!tp) return sum
    const price = tp.priceType === 'fixed' ? (tp.price || 0) : (selectedSlot?.price || 37.95) + (tp.priceAdj || 0)
    return sum + price * count
  }, 0)
  const gstAmount = totalAmount * GST_RATE
  const totalDue = totalAmount + gstAmount
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  const ticketValidationError = Object.entries(ticketSelections).reduce((message, [typeId, count]) => {
    if (message) return message
    const type = enabledTypes.find(t => t.id === Number(typeId))
    if (!type) return ''
    if (type.name.includes('Family Bundle') && count < 3) return 'Family Bundle requires at least 3 tickets.'
    if (type.name.includes('Group Ticket') && count < 6) return 'Group Ticket requires at least 6 tickets.'
    return ''
  }, '')

  function handleConfirm() {
    const orderId = `2026051${Date.now().toString().slice(-6)}`
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const createdOrder = {
      id: orderId,
      user: {
        name: customerName || 'Walk-in customer',
        email: customer.email || null,
        phone: customer.phone || null,
      },
      emailStatus: markUsed || !customer.email ? 'not_sent' : 'sent',
      slot: {
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
      ticketCount: {
        total: totalTickets,
        completed: markUsed ? totalTickets : 0,
        notUsed: markUsed ? 0 : totalTickets,
      },
      amount: Number(totalDue.toFixed(2)),
      couponCode: null,
      couponDiscount: 0,
      remarks: customer.remarks || null,
      status: markUsed ? 'completed' : 'paid',
      paymentMethod: payment,
      createdAt: now,
      createdBy: admin ? `${admin.username} (Admin#${admin.id})` : 'Admin',
      ip: null,
    }
    try {
      const existing = JSON.parse(localStorage.getItem(CREATED_ORDERS_KEY) || '[]')
      localStorage.setItem(CREATED_ORDERS_KEY, JSON.stringify([createdOrder, ...existing]))
    } catch {
      localStorage.setItem(CREATED_ORDERS_KEY, JSON.stringify([createdOrder]))
    }
    setLastOrderId(orderId)
    setOrderComplete(true)
  }

  function resetOrder() {
    setStep(1)
    setSelectedSlot(null)
    setTicketSelections({})
    setCustomer({ firstName: '', lastName: '', phone: '', email: '', remarks: '' })
    setPayment('')
    setMarkUsed(false)
    setOrderComplete(false)
    setLastOrderId(null)
  }

  if (orderComplete) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>
          <i className="fa fa-check-circle" style={{ color: '#10b981' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Order Created!</h2>
        <p style={{ color: '#6b7280', marginBottom: 8 }}>Order ID: <strong style={{ color: '#6366f1', fontFamily: 'monospace' }}>#{lastOrderId}</strong></p>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          {totalTickets} ticket(s) · ${totalDue.toFixed(2)} · {payment}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={resetOrder}>
            <i className="fa fa-plus" /> Create Another Order
          </button>
          <button className="btn-primary">
            <i className="fa fa-print" /> Print Tickets
          </button>
          <button className="btn-primary" onClick={() => navigate(`/orders?orderId=${encodeURIComponent(lastOrderId)}`)}>
            <i className="fa fa-external-link-alt" /> View in Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
          <i className="fa fa-cash-register" style={{ color: '#6366f1' }} />
          {t.createOrderTitle}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{t.createOrderSub}</p>
      </div>

      <StepIndicator step={step} />

      {/* Step 1: Select Time Slot */}
      {step === 1 && (
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
              <i className="fa fa-clock" />
              {t.step1}
            </h2>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowDatePicker(d => !d)}
            >
              <i className="fa fa-calendar" /> {t.selectOtherDate}
            </button>
          </div>

          <div style={{ background: '#dbeafe', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 4, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <i className="fa fa-calendar-day" style={{ color: '#3b82f6' }} />
            <strong>{t.currentDate}:</strong>
            {showDatePicker ? (
              <input
                type="date"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setShowDatePicker(false); setSelectedSlot(null) }}
                style={{ border: 'none', background: 'transparent', fontWeight: 600, color: '#6366f1', cursor: 'pointer' }}
                autoFocus
              />
            ) : (
              <span style={{ fontWeight: 600, color: '#6366f1' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>

          {availableSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <i className="fa fa-calendar-times" style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
              {t.noSlotsAvailable}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {availableSlots.map(slot => {
                const sold = slot.websiteSeats + slot.inStoreSeats
                const remaining = slot.totalSeats - sold
                const isSelected = selectedSlot?.id === slot.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotSelect(slot)}
                    style={{
                      padding: 14, borderRadius: 8, textAlign: 'left',
                      border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      background: isSelected ? '#fef2f2' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      ${slot.price.toFixed(2)} / person
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      <span style={{ color: remaining > 5 ? '#10b981' : remaining > 0 ? '#f59e0b' : '#ef4444', fontWeight: 500 }}>
                        {remaining} seats left
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedSlot && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setStep(2)}>
                {t.next} <i className="fa fa-arrow-right" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Tickets */}
      {step === 2 && (
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa fa-ticket" style={{ color: '#6366f1' }} />
              {t.step2}
            </h2>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Selected: {selectedSlot.date} {selectedSlot.startTime}-{selectedSlot.endTime}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enabledTypes.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                No ticket types are available for this slot.
              </div>
            )}
            {enabledTypes.map(tp => {
              const count = ticketSelections[tp.id] || 0
              const price = tp.priceType === 'fixed' ? tp.price : (selectedSlot.price + (tp.priceAdj || 0))
              return (
                <div key={tp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: count > 0 ? '#fef2f2' : '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{tp.name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      ${price?.toFixed(2)} · 1 seat{tp.name.includes('Family Bundle') ? ' · Min: 3' : tp.name.includes('Group Ticket') ? ' · Min: 6' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>{t.total}: {totalTickets} tickets</span>
                <span style={{ color: '#6366f1' }}>${totalAmount.toFixed(2)}</span>
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
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <i className="fa fa-arrow-left" /> {t.back}
            </button>
            <button className="btn-primary" onClick={() => setStep(3)} disabled={totalTickets === 0 || Boolean(ticketValidationError)}>
              {t.next} <i className="fa fa-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Customer Information */}
      {step === 3 && (
        <div className="stat-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-user" style={{ color: '#6366f1' }} /> Step 3: Customer Information (Optional)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>First name</label>
                <input className="form-input" value={customer.firstName} onChange={e => setCustomer(c => ({ ...c, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Last name</label>
                <input className="form-input" value={customer.lastName} onChange={e => setCustomer(c => ({ ...c, lastName: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.phone}</label>
                <input className="form-input" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.email}</label>
                <input className="form-input" type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Remarks (Admin only)</label>
              <input className="form-input" value={customer.remarks} onChange={e => setCustomer(c => ({ ...c, remarks: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>
              <i className="fa fa-arrow-left" /> {t.back}
            </button>
            <button className="btn-primary" onClick={() => setStep(4)}>
              {t.next} <i className="fa fa-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment Method & Summary */}
      {step === 4 && (
        <div className="stat-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-credit-card" style={{ color: '#6366f1' }} /> Step 4: Payment Method & Summary
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
            {PAYMENT_METHODS.map(pm => (
              <button
                key={pm.id}
                onClick={() => setPayment(pm.id)}
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
                {pm.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 18, border: '1px solid #eef2f7' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Order details</div>
                <div style={{ display: 'grid', gap: 7, fontSize: 13, color: '#4b5563' }}>
                  <div><strong style={{ color: '#111827' }}>Slot:</strong> {selectedSlot.date} · {selectedSlot.startTime}-{selectedSlot.endTime}</div>
                  <div><strong style={{ color: '#111827' }}>Customer:</strong> {customerName || 'Walk-in customer'}</div>
                  <div><strong style={{ color: '#111827' }}>Email:</strong> {customer.email || '-'}</div>
                  <div><strong style={{ color: '#111827' }}>Phone:</strong> {customer.phone || '-'}</div>
                  <div><strong style={{ color: '#111827' }}>Remarks:</strong> {customer.remarks || '-'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Amount summary</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(ticketSelections).map(([typeId, count]) => {
                    const tp = enabledTypes.find(t => t.id === Number(typeId))
                    if (!tp) return null
                    const price = tp.priceType === 'fixed' ? tp.price : (selectedSlot.price + (tp.priceAdj || 0))
                    return (
                      <div key={typeId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#4b5563' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tp.name} × {count}</span>
                        <span style={{ fontWeight: 600 }}>${(price * count).toFixed(2)}</span>
                      </div>
                    )
                  })}
                  <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                    <span>Ticket Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                    <span>GST (5%)</span>
                    <span>${gstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 1, background: '#d1d5db', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: '#111827' }}>
                    <span>Total</span>
                    <span style={{ color: '#4f46e5' }}>${totalDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={markUsed} onChange={e => setMarkUsed(e.target.checked)} style={{ width: 16, height: 16 }} />
            Mark order as used immediately
          </label>

          <div style={{ maxWidth: 780, margin: '0 auto 22px', background: '#f3f4f6', borderLeft: '3px solid #3b82f6', borderRadius: 6, padding: '10px 12px', color: '#6b7280', fontSize: 12, lineHeight: 1.4 }}>
            <strong>If unchecked,</strong> order status will be marked as <strong>Paid</strong>, and tickets will be <strong>Not used</strong>. Email is required, and tickets will be sent to the customer automatically.<br />
            <strong>If checked,</strong> order status will be marked as <strong>Completed</strong>, and tickets will be <strong>Used</strong>. Ticket email will <strong>NOT</strong> be sent, but if marketing is enabled and email is filled, marketing email will be triggered.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setStep(3)}>
              <i className="fa fa-arrow-left" /> {t.back}
            </button>
            <button className="btn-primary" onClick={handleConfirm} disabled={!payment} style={{ padding: '10px 28px', fontSize: 16 }}>
              <i className="fa fa-check-circle" /> Create Order & Complete Payment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
