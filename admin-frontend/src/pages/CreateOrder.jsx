import { useState } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { SLOTS_DATA, TICKET_TYPES_DATA } from '../data/mockData'

const TODAY = '2026-05-14'
const PAYMENT_METHODS = ['Instore Credit', 'EMT', 'Cash', 'Other']

function StepIndicator({ step }) {
  const steps = [1, 2, 3, 4]
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, flexShrink: 0,
            background: s <= step ? '#7b2020' : '#e5e7eb',
            color: s <= step ? '#fff' : '#9ca3af',
          }}>{s <= step && s < step ? <i className="fa fa-check" /> : s}</div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: s < step ? '#7b2020' : '#e5e7eb', margin: '0 8px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateOrder() {
  const { lang } = useLang()
  const t = useT(lang)
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [ticketSelections, setTicketSelections] = useState({})
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', remarks: '' })
  const [payment, setPayment] = useState('Instore Credit')
  const [orderComplete, setOrderComplete] = useState(false)
  const [lastOrderId, setLastOrderId] = useState(null)

  const availableSlots = SLOTS_DATA.filter(s => s.date === selectedDate && s.status === 'active')
  const enabledTypes = TICKET_TYPES_DATA.filter(tp => tp.status === 'enabled')

  function handleSlotSelect(slot) {
    setSelectedSlot(slot)
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

  function handleConfirm() {
    const orderId = `2026051${Date.now().toString().slice(-6)}`
    setLastOrderId(orderId)
    setOrderComplete(true)
  }

  function resetOrder() {
    setStep(1)
    setSelectedSlot(null)
    setTicketSelections({})
    setCustomer({ name: '', phone: '', email: '', remarks: '' })
    setPayment('Instore Credit')
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
        <p style={{ color: '#6b7280', marginBottom: 8 }}>Order ID: <strong style={{ color: '#7b2020', fontFamily: 'monospace' }}>#{lastOrderId}</strong></p>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          {totalTickets} ticket(s) · ${totalAmount.toFixed(2)} · {payment}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={resetOrder}>
            <i className="fa fa-plus" /> Create Another Order
          </button>
          <button className="btn-primary">
            <i className="fa fa-print" /> Print Tickets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
          <i className="fa fa-cash-register" style={{ color: '#7b2020' }} />
          {t.createOrderTitle}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{t.createOrderSub}</p>
      </div>

      <StepIndicator step={step} />

      {/* Step 1: Select Time Slot */}
      {step === 1 && (
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8' }}>
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
                style={{ border: 'none', background: 'transparent', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}
                autoFocus
              />
            ) : (
              <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
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
                      border: isSelected ? '2px solid #7b2020' : '1px solid #e5e7eb',
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
              <i className="fa fa-ticket" style={{ color: '#7b2020' }} />
              {t.step2}
            </h2>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Selected: {selectedSlot.date} {selectedSlot.startTime}-{selectedSlot.endTime}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enabledTypes.map(tp => {
              const count = ticketSelections[tp.id] || 0
              const price = tp.priceType === 'fixed' ? tp.price : (selectedSlot.price + (tp.priceAdj || 0))
              return (
                <div key={tp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: count > 0 ? '#fef2f2' : '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{tp.name}</div>
                    {tp.remarks && <div style={{ fontSize: 12, color: '#6b7280' }}>{tp.remarks}</div>}
                    <div style={{ fontSize: 13, color: '#7b2020', fontWeight: 600 }}>${price?.toFixed(2)}</div>
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
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #7b2020', background: '#7b2020', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                <span style={{ color: '#7b2020' }}>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <i className="fa fa-arrow-left" /> {t.back}
            </button>
            <button className="btn-primary" onClick={() => setStep(3)} disabled={totalTickets === 0}>
              {t.next} <i className="fa fa-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Customer Info */}
      {step === 3 && (
        <div className="stat-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-user" style={{ color: '#7b2020' }} /> {t.step3}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Name</label>
              <input className="form-input" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Customer name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.phone}</label>
                <input className="form-input" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.email}</label>
                <input className="form-input" type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.remarks}</label>
              <input className="form-input" value={customer.remarks} onChange={e => setCustomer(c => ({ ...c, remarks: e.target.value }))} placeholder="Optional remarks (e.g. Walk-in)" />
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

      {/* Step 4: Confirm & Pay */}
      {step === 4 && (
        <div className="stat-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            <i className="fa fa-credit-card" style={{ color: '#7b2020' }} /> {t.step4}
          </h2>

          {/* Order summary */}
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Order Summary</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
              Slot: {selectedSlot.date} {selectedSlot.startTime} - {selectedSlot.endTime}
            </div>
            {customer.name && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Customer: {customer.name}</div>}
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
              {Object.entries(ticketSelections).map(([typeId, count]) => {
                const tp = enabledTypes.find(t => t.id === Number(typeId))
                if (!tp) return null
                const price = tp.priceType === 'fixed' ? tp.price : (selectedSlot.price + (tp.priceAdj || 0))
                return (
                  <div key={typeId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{tp.name} × {count}</span>
                    <span>${(price * count).toFixed(2)}</span>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                <span>Total ({totalTickets} tickets)</span>
                <span style={{ color: '#7b2020' }}>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 10 }}>Payment Method</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm}
                  onClick={() => setPayment(pm)}
                  style={{
                    padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
                    border: payment === pm ? '2px solid #7b2020' : '1px solid #e5e7eb',
                    background: payment === pm ? '#fef2f2' : '#fff',
                    color: payment === pm ? '#7b2020' : '#374151',
                    fontWeight: payment === pm ? 600 : 400,
                  }}
                >{pm}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setStep(3)}>
              <i className="fa fa-arrow-left" /> {t.back}
            </button>
            <button className="btn-primary" onClick={handleConfirm} style={{ padding: '10px 28px', fontSize: 16 }}>
              <i className="fa fa-check" /> {t.confirm} (${totalAmount.toFixed(2)})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
