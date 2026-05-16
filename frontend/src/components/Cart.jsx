import { useMemo, useState } from 'react'

const TIME_SLOTS = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM']

function fmt(n) { return `CA$${Number(n).toFixed(2)}` }

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function QtyControl({ qty, onDecrease, onIncrease }) {
  return (
    <div className="crt-qty">
      <button className="crt-qty-btn" onClick={onDecrease} aria-label="Decrease" type="button">-</button>
      <span className="crt-qty-val">{qty}</span>
      <button className="crt-qty-btn" onClick={onIncrease} aria-label="Increase" type="button">+</button>
    </div>
  )
}

function SummaryRow({ label, value, muted, bold, large }) {
  return (
    <div className={`crt-sum-row ${bold ? 'crt-sum-bold' : ''} ${muted ? 'crt-sum-muted' : ''}`}>
      <span>{label}</span>
      <span style={large ? { fontSize: 15, fontWeight: 800 } : {}}>{value}</span>
    </div>
  )
}

function ticketMinimum(ticketTypeId) {
  if (ticketTypeId === 'group') return 6
  if (ticketTypeId === 'family') return 3
  return 0
}

function ticketMinimumMessage(ticketTypeId) {
  if (ticketTypeId === 'group') return 'Group Ticket requires min. 6 people. Use remove to delete it from your basket.'
  if (ticketTypeId === 'family') return 'Family Bundle requires min. 3 people and max. 2 adults. Use remove to delete it from your basket.'
  return ''
}

function buildTicketOptions(experience) {
  const prices = experience?.offPeakPrices || {}
  return [
    { id: 'adult', label: 'Adult', price: prices.adult ?? 37.95 },
    { id: 'child', label: 'Child', price: prices.child ?? 27.95 },
    { id: 'senior', label: 'Senior', price: prices.senior ?? 34.95 },
    { id: 'group', label: 'Group', price: prices.group ?? 32.95 },
    { id: 'family', label: 'Family', price: prices.family ?? 31.95 },
  ]
}

export default function Cart({
  allExperiences = [],
  items,
  onAddItem,
  onUpdateQty,
  onUpdateTicketType,
  onRemove,
  onClose,
  onCheckout,
}) {
  const [itemNotices, setItemNotices] = useState({})
  const [draft, setDraft] = useState(() => ({
    experienceId: allExperiences[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    time: TIME_SLOTS[0],
    ticketTypeId: 'adult',
    quantity: 1,
  }))
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets = items.reduce((s, i) => s + i.quantity, 0)
  const procFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
  const tax = numTickets > 0 ? 0.05 * subtotal : 0
  const grand = subtotal + procFee + tax
  const selectedExperience = allExperiences.find((experience) => experience.id === draft.experienceId) || allExperiences[0]
  const draftTicketOptions = buildTicketOptions(selectedExperience)
  const selectedTicket = draftTicketOptions.find((ticket) => ticket.id === draft.ticketTypeId) || draftTicketOptions[0]

  const groups = useMemo(() => items.reduce((acc, item) => {
    const groupId = [item.show_id, item.session_date || 'date', item.session_time || 'time'].join('__')
    if (!acc[groupId]) {
      acc[groupId] = {
        group_id: groupId,
        show_title: item.show_title,
        session_date: item.session_date,
        session_time: item.session_time,
        accent: item.experience_accent || '#2563eb',
        category: item.experience_category || 'vr-show',
        image: item.experience_image,
        gradient: item.experience_gradient,
        items: [],
      }
    }
    acc[groupId].items.push(item)
    return acc
  }, {}), [items])
  const groupedItems = useMemo(() => Object.values(groups), [groups])

  const updateItemQty = (item, nextQty) => {
    const minQty = ticketMinimum(item.ticket_type_id)
    if (minQty && nextQty > 0 && nextQty < minQty) {
      setItemNotices((previous) => ({ ...previous, [item.id]: ticketMinimumMessage(item.ticket_type_id) }))
      return
    }
    setItemNotices((previous) => {
      const next = { ...previous }
      delete next[item.id]
      return next
    })
    onUpdateQty(item.id, nextQty)
  }

  const updateDraft = (field, value) => setDraft((previous) => {
    const next = { ...previous, [field]: value }
    if (field === 'ticketTypeId') {
      const minQty = ticketMinimum(value)
      if (minQty && next.quantity < minQty) next.quantity = minQty
    }
    return next
  })

  const addDraftItem = () => {
    if (!selectedExperience || !selectedTicket || !draft.date || !draft.time) return
    const minQty = ticketMinimum(selectedTicket.id)
    const quantity = Math.max(Number(draft.quantity) || 0, minQty || 1)
    onAddItem?.({
      experience: selectedExperience,
      selectedDate: new Date(`${draft.date}T00:00:00`),
      selectedTime: draft.time,
      ticketOptions: draftTicketOptions,
      tickets: [{ ...selectedTicket, quantity }],
      openCart: false,
    })
  }

  return (
    <div className="crt-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="crt-panel" onClick={(e) => e.stopPropagation()}>
        <div className="crt-header">
          <div className="crt-header-left">
            <CartIcon />
            <h2 className="crt-title">Your Basket</h2>
            {numTickets > 0 && <span className="crt-count-pill">{numTickets} ticket{numTickets !== 1 ? 's' : ''}</span>}
          </div>
          <button className="crt-close" onClick={onClose} aria-label="Close cart" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="crt-flow">
          <button className="crt-flow-step active" type="button"><span>1</span> Review</button>
          <div className="crt-flow-step disabled"><span>2</span> Contact</div>
          <div className="crt-flow-step disabled"><span>3</span> Pay</div>
        </div>

        <div className="crt-body">
          <div className="crt-add-panel">
            <div className="crt-add-title">Add tickets</div>
            <div className="crt-add-grid">
              <label>
                Product
                <select value={draft.experienceId} onChange={(event) => updateDraft('experienceId', event.target.value)}>
                  {allExperiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.title}</option>)}
                </select>
              </label>
              <label>
                Date
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
              </label>
              <label>
                Time
                <select value={draft.time} onChange={(event) => updateDraft('time', event.target.value)}>
                  {TIME_SLOTS.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              <label>
                Ticket
                <select value={draft.ticketTypeId} onChange={(event) => updateDraft('ticketTypeId', event.target.value)}>
                  {draftTicketOptions.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.label} - {fmt(ticket.price)}</option>)}
                </select>
              </label>
              <label>
                Qty
                <input type="number" min={ticketMinimum(draft.ticketTypeId) || 1} value={draft.quantity} onChange={(event) => updateDraft('quantity', Math.max(0, parseInt(event.target.value) || 0))} />
              </label>
              <button className="crt-add-btn" onClick={addDraftItem} type="button">Add</button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="crt-empty">
              <p className="crt-empty-title">Your basket is empty</p>
              <p className="crt-empty-sub">Add tickets from any show or game to get started.</p>
            </div>
          ) : groupedItems.map((group) => (
            <div key={group.group_id} className="crt-group">
              <div className="crt-group-header">
                <div className="crt-group-product">
                  <div className="crt-group-thumb" style={group.image ? { backgroundImage: `url(${group.image})` } : { background: group.gradient || group.accent }} aria-hidden="true" />
                  <div className="crt-group-copy">
                    <span className="crt-group-badge">{group.category === 'arcade' ? 'Arcade Game' : 'VR Show'}</span>
                    <span className="crt-group-name">{group.show_title}</span>
                  </div>
                </div>
                <div className="crt-group-session">{group.session_date || 'Date not selected'} · {group.session_time || 'Time not selected'}</div>
              </div>

              <div className="crt-table-head" aria-hidden="true">
                <span>Product</span><span>Time slot</span><span>Ticket type</span><span>Unit price</span><span>Ticket number</span><span>Subtotal</span><span />
              </div>
              {group.items.map((item) => (
                <div key={item.id} className="crt-item">
                  <div className="crt-item-project">
                    <span className="crt-mobile-label">Product</span>
                    <div className="crt-product-cell">
                      <div className="crt-product-thumb" style={item.experience_image ? { backgroundImage: `url(${item.experience_image})` } : { background: item.experience_gradient || item.experience_accent }} aria-hidden="true" />
                      <div className="crt-product-copy">
                        <strong>{item.show_title}</strong>
                        <span>{item.experience_category === 'arcade' ? 'Arcade Game' : 'VR Show'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="crt-item-session">{item.session_date || '-'}<br />{item.session_time || '-'}</div>
                  <div className="crt-item-type">
                    <span className="crt-mobile-label">Ticket type</span>
                    {item.ticket_options?.length > 1 ? (
                      <select className="crt-ticket-type-select" value={item.ticket_type_id} onChange={(event) => onUpdateTicketType(item.id, event.target.value)} aria-label={`Ticket type for ${item.show_title}`}>
                        {item.ticket_options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    ) : item.ticket_type_label}
                  </div>
                  <div className="crt-item-unit"><span className="crt-mobile-label">Unit price</span>{fmt(item.unit_price)}</div>
                  <QtyControl qty={item.quantity} onDecrease={() => updateItemQty(item, item.quantity - 1)} onIncrease={() => updateItemQty(item, item.quantity + 1)} />
                  <div className="crt-item-sub"><span className="crt-mobile-label">Subtotal</span>{fmt(item.unit_price * item.quantity)}</div>
                  <button className="crt-item-remove" onClick={() => onRemove(item.id)} aria-label="Remove item" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {itemNotices[item.id] && <div className="crt-item-notice"><span aria-hidden="true">!</span>{itemNotices[item.id]}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="crt-footer">
          <div className="crt-summary">
            <SummaryRow label="Subtotal" value={fmt(subtotal)} />
            <SummaryRow label="Processing fee" value={fmt(procFee)} muted />
            <SummaryRow label="GST (5%)" value={fmt(tax)} muted />
            <div className="crt-sum-divider" />
            <SummaryRow label="Total due" value={fmt(grand)} bold large />
          </div>
          <div className="crt-footer-actions">
            <button className="crt-checkout-btn" onClick={onCheckout} disabled={items.length === 0} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Checkout - {fmt(grand)}
            </button>
          </div>
          <div className="crt-security">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Secured by <strong style={{ color: '#2563eb' }}>Stripe</strong>
            &nbsp;&nbsp;-&nbsp;&nbsp;
            <button className="crt-clear-link" onClick={() => items.forEach((i) => onRemove(i.id))} type="button">Clear all</button>
          </div>
        </div>
      </div>
    </div>
  )
}
