import { useMemo, useState } from 'react'

function fmt(n) { return `CA$${Number(n).toFixed(2)}` }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) }

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
      <button className="crt-qty-btn" onClick={onDecrease} aria-label="Decrease">−</button>
      <span className="crt-qty-val">{qty}</span>
      <button className="crt-qty-btn" onClick={onIncrease} aria-label="Increase">+</button>
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

export default function Cart({ items, onUpdateQty, onUpdateTicketType, onRemove, onClose, onCheckout }) {
  const [step, setStep] = useState('review')
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '' })
  const [touched, setTouched] = useState({})
  const subtotal   = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets = items.reduce((s, i) => s + i.quantity, 0)
  const procFee    = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
  const tax        = numTickets > 0 ? 0.05 * subtotal : 0
  const grand      = subtotal + procFee + tax

  // Group items by project + session preserving insertion order
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
  const contactReady = contact.first.trim().length > 1 && contact.last.trim().length > 1 && validEmail(contact.email)
  const updateContact = (field, value) => setContact((previous) => ({ ...previous, [field]: value }))
  const completeCheckout = () => {
    setTouched({ first: true, last: true, email: true })
    if (!contactReady) return
    onCheckout(contact)
  }

  return (
    <div className="crt-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="crt-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="crt-header">
          <div className="crt-header-left">
            <CartIcon />
            <h2 className="crt-title">Your Basket</h2>
            {numTickets > 0 && (
              <span className="crt-count-pill">{numTickets} ticket{numTickets !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button className="crt-close" onClick={onClose} aria-label="Close cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="crt-empty">
            <div className="crt-empty-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="crt-empty-title">Your basket is empty</p>
            <p className="crt-empty-sub">Add tickets from any show or game to get started.</p>
            <button className="crt-browse-btn" onClick={onClose}>Browse Experiences</button>
          </div>
        ) : (
          <>
            <div className="crt-flow">
              <button className={`crt-flow-step ${step === 'review' ? 'active' : ''}`} onClick={() => setStep('review')} type="button">
                <span>1</span> Review
              </button>
              <button className={`crt-flow-step ${step === 'details' ? 'active' : ''}`} onClick={() => setStep('details')} type="button">
                <span>2</span> Details
              </button>
              <div className="crt-flow-step disabled"><span>3</span> Pay</div>
            </div>

            {/* ── Item groups ── */}
            <div className="crt-body">
              {step === 'review' ? (
                groupedItems.map((group) => (
                  <div key={group.group_id} className="crt-group">
                    <div className="crt-group-header">
                      <div className="crt-group-product">
                        <div
                          className="crt-group-thumb"
                          style={group.image ? { backgroundImage: `url(${group.image})` } : { background: group.gradient || group.accent }}
                          aria-hidden="true"
                        />
                        <div className="crt-group-copy">
                          <span className="crt-group-badge">
                            {group.category === 'arcade' ? 'Arcade Game' : 'VR Show'}
                          </span>
                          <span className="crt-group-name">{group.show_title}</span>
                        </div>
                      </div>
                      <div className="crt-group-session">
                        {group.session_date || 'Date not selected'} · {group.session_time || 'Time not selected'}
                      </div>
                    </div>

                    <div className="crt-table-head" aria-hidden="true">
                      <span>Product</span>
                      <span>Time slot</span>
                      <span>Ticket type</span>
                      <span>Unit price</span>
                      <span>Ticket number</span>
                      <span>Subtotal</span>
                      <span />
                    </div>
                    {group.items.map((item) => (
                      <div key={item.id} className="crt-item">
                        <div className="crt-item-project">
                          <span className="crt-mobile-label">Product</span>
                          <div className="crt-product-cell">
                            <div
                              className="crt-product-thumb"
                              style={item.experience_image ? { backgroundImage: `url(${item.experience_image})` } : { background: item.experience_gradient || item.experience_accent }}
                              aria-hidden="true"
                            />
                            <div className="crt-product-copy">
                              <strong>{item.show_title}</strong>
                              <span>{item.experience_category === 'arcade' ? 'Arcade Game' : 'VR Show'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="crt-item-session">
                          {item.session_date || '—'}<br />{item.session_time || '—'}
                        </div>
                        <div className="crt-item-type">
                          <span className="crt-mobile-label">Ticket type</span>
                          {item.ticket_options?.length > 1 ? (
                            <select
                              className="crt-ticket-type-select"
                              value={item.ticket_type_id}
                              onChange={(event) => onUpdateTicketType(item.id, event.target.value)}
                              aria-label={`Ticket type for ${item.show_title}`}
                            >
                              {item.ticket_options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.ticket_type_label
                          )}
                        </div>
                        <div className="crt-item-unit">
                          <span className="crt-mobile-label">Unit price</span>
                          {fmt(item.unit_price)}
                        </div>
                        <QtyControl
                          qty={item.quantity}
                          onDecrease={() => onUpdateQty(item.id, item.quantity - 1)}
                          onIncrease={() => onUpdateQty(item.id, item.quantity + 1)}
                        />
                        <div className="crt-item-sub">
                          <span className="crt-mobile-label">Subtotal</span>
                          {fmt(item.unit_price * item.quantity)}
                        </div>
                        <button
                          className="crt-item-remove"
                          onClick={() => onRemove(item.id)}
                          aria-label="Remove item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="crt-details">
                  <div className="crt-details-card">
                    <div className="crt-details-title">Where should we send the tickets?</div>
                    <div className="crt-details-sub">Use a real email. Your confirmation and tickets go here after payment.</div>
                    <div className="crt-mini-review">
                      <strong>{numTickets} ticket{numTickets !== 1 ? 's' : ''}</strong>
                      <span>{groupedItems.map((group) => group.show_title).join(' + ')}</span>
                    </div>
                    <div className="crt-form-grid">
                      <label className={touched.first && contact.first.trim().length <= 1 ? 'crt-field-error' : ''}>
                        First name
                        <input value={contact.first} onBlur={() => setTouched((p) => ({ ...p, first: true }))} onChange={(event) => updateContact('first', event.target.value)} autoComplete="given-name" />
                      </label>
                      <label className={touched.last && contact.last.trim().length <= 1 ? 'crt-field-error' : ''}>
                        Last name
                        <input value={contact.last} onBlur={() => setTouched((p) => ({ ...p, last: true }))} onChange={(event) => updateContact('last', event.target.value)} autoComplete="family-name" />
                      </label>
                      <label className={touched.email && !validEmail(contact.email) ? 'crt-field-error crt-field-wide' : 'crt-field-wide'}>
                        Email
                        <input type="email" value={contact.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(event) => updateContact('email', event.target.value)} autoComplete="email" placeholder="(required)" />
                      </label>
                      <label className="crt-field-wide">
                        Phone number
                        <input type="tel" value={contact.phone} onChange={(event) => updateContact('phone', event.target.value)} autoComplete="tel" placeholder="(required)" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="crt-footer">
              <div className="crt-summary">
                <SummaryRow label="Subtotal" value={fmt(subtotal)} />
                <SummaryRow label="Processing fee" value={fmt(procFee)} muted />
                <SummaryRow label="GST (5%)" value={fmt(tax)} muted />
                <div className="crt-sum-divider" />
                <SummaryRow label="Total due" value={fmt(grand)} bold large />
              </div>

              <div className="crt-footer-actions">
                {step === 'details' && (
                  <button className="crt-back-btn" onClick={() => setStep('review')} type="button">Back</button>
                )}
                <button
                  className="crt-checkout-btn"
                  onClick={step === 'review' ? () => setStep('details') : completeCheckout}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  {step === 'review' ? `Continue — ${fmt(grand)}` : `Pay ${fmt(grand)}`}
                </button>
              </div>

              <div className="crt-security">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secured by <strong style={{ color: '#2563eb' }}>Stripe</strong>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <button
                  className="crt-clear-link"
                  onClick={() => items.forEach((i) => onRemove(i.id))}
                >
                  Clear all
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
