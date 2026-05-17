import { useEffect, useMemo, useState } from 'react'

function fmt(n) { return `CA$${Number(n).toFixed(2)}` }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) }
function validPhone(value) { return value.replace(/[^\d]/g, '').length >= 10 }

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

function userContact(user, getDisplayName) {
  const name = getDisplayName?.(user) || ''
  const parts = name.split(' ').filter(Boolean)
  return {
    first: parts[0] || user?.email?.split('@')[0] || '',
    last: parts.slice(1).join(' '),
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
  }
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
  onCheckout,
  resetAuthForm,
  setAuthForm,
  setAuthMode,
}) {
  const [step, setStep] = useState('review')
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '' })
  const [touched, setTouched] = useState({})

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets = items.reduce((s, i) => s + i.quantity, 0)
  const procFee = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
  const tax = numTickets > 0 ? 0.05 * subtotal : 0
  const grand = subtotal + procFee + tax

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

  const invalidItems = items.filter((item) => (
    (item.ticket_type_id === 'group' && item.quantity < 6)
    || (item.ticket_type_id === 'family' && item.quantity < 3)
  ))
  const contactReady = contact.first.trim().length > 1
    && contact.last.trim().length > 1
    && validEmail(contact.email)
    && validPhone(contact.phone)

  useEffect(() => {
    if (!currentUser) return
    setContact((previous) => {
      const fromUser = userContact(currentUser, getDisplayName)
      return {
        first: previous.first || fromUser.first,
        last: previous.last || fromUser.last,
        email: previous.email || fromUser.email,
        phone: previous.phone || fromUser.phone,
      }
    })
    if (step === 'account') setStep('details')
  }, [currentUser, getDisplayName, step])

  const updateContact = (field, value) => setContact((previous) => ({ ...previous, [field]: value }))
  const goAfterReview = () => {
    if (invalidItems.length > 0) return
    if (currentUser) {
      setStep('details')
      return
    }
    setStep('account')
  }
  const completeCheckout = () => {
    setTouched({ first: true, last: true, email: true, phone: true })
    if (!contactReady || invalidItems.length > 0) return
    onCheckout(contact)
  }
  const switchAuthMode = (mode) => {
    setAuthMode(mode)
    resetAuthForm()
  }

  return (
    <div className="crt-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="crt-panel" onClick={(e) => e.stopPropagation()}>
        <div className="crt-header">
          <div className="crt-header-left">
            <CartIcon />
            <h2 className="crt-title">Your Shopping Cart</h2>
            {numTickets > 0 && <span className="crt-count-pill">{numTickets} ticket{numTickets !== 1 ? 's' : ''}</span>}
          </div>
          <button className="crt-close" onClick={onClose} aria-label="Close cart" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="crt-empty">
            <div className="crt-empty-icon"><CartIcon /></div>
            <p className="crt-empty-title">Your shopping cart is empty</p>
            <p className="crt-empty-sub">Add tickets from any show or game to get started.</p>
            <button className="crt-browse-btn" onClick={onClose} type="button">Browse Experiences</button>
          </div>
        ) : (
          <>
            <div className="crt-flow">
              {[
                ['review', 'Review'],
                ['account', 'Account'],
                ['details', 'Details'],
                ['pay', 'Pay'],
              ].map(([id, label], index) => (
                (() => {
                  const disabled = id === 'pay' || (id === 'details' && !currentUser)
                  return (
                <button
                  key={id}
                  className={`crt-flow-step ${step === id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && setStep(id)}
                  type="button"
                  disabled={disabled}
                >
                  <span>{index + 1}</span> {label}
                </button>
                  )
                })()
              ))}
            </div>

            <div className="crt-body">
              {step === 'review' && (
                <>
                  {invalidItems.length > 0 && (
                    <div className="crt-warning">
                      Group tickets require at least 6 people. Family bundles require at least 3 people.
                    </div>
                  )}
                  {groupedItems.map((group) => (
                    <div key={group.group_id} className="crt-group">
                      <div className="crt-group-header">
                        <div className="crt-group-product">
                          <div
                            className="crt-group-thumb"
                            style={group.image ? { backgroundImage: `url(${group.image})` } : { background: group.gradient || group.accent }}
                            aria-hidden="true"
                          />
                          <div className="crt-group-copy">
                            <span className="crt-group-badge">{group.category === 'arcade' ? 'Arcade Game' : 'VR Show'}</span>
                            <span className="crt-group-name">{group.show_title}</span>
                          </div>
                        </div>
                        <div className="crt-group-session">{group.session_date || 'Date not selected'} - {group.session_time || 'Time not selected'}</div>
                      </div>

                      <div className="crt-table-head" aria-hidden="true">
                        <span>Product</span>
                        <span>Time slot</span>
                        <span>Ticket type</span>
                        <span>Unit price</span>
                        <span>Qty</span>
                        <span>Total</span>
                        <span />
                      </div>
                      {group.items.map((item) => {
                        const itemInvalid = (item.ticket_type_id === 'group' && item.quantity < 6) || (item.ticket_type_id === 'family' && item.quantity < 3)
                        return (
                          <div key={item.id} className={`crt-item ${itemInvalid ? 'crt-item-invalid' : ''}`}>
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
                            <div className="crt-item-session">{item.session_date || '-'}<br />{item.session_time || '-'}</div>
                            <div className="crt-item-type">
                              <span className="crt-mobile-label">Ticket type</span>
                              {item.ticket_options?.length > 1 ? (
                                <select
                                  className="crt-ticket-type-select"
                                  value={item.ticket_type_id}
                                  onChange={(event) => onUpdateTicketType(item.id, event.target.value)}
                                  aria-label={`Ticket type for ${item.show_title}`}
                                >
                                  {item.ticket_options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                                </select>
                              ) : item.ticket_type_label}
                              {itemInvalid && (
                                <div className="crt-row-warning">
                                  {item.ticket_type_id === 'group' ? 'Min. 6 people required.' : 'Min. 3 people required.'}
                                </div>
                              )}
                            </div>
                            <div className="crt-item-unit"><span className="crt-mobile-label">Unit price</span>{fmt(item.unit_price)}</div>
                            <QtyControl qty={item.quantity} onDecrease={() => onUpdateQty(item.id, item.quantity - 1)} onIncrease={() => onUpdateQty(item.id, item.quantity + 1)} />
                            <div className="crt-item-sub"><span className="crt-mobile-label">Total</span>{fmt(item.unit_price * item.quantity)}</div>
                            <button className="crt-item-remove" onClick={() => onRemove(item.id)} aria-label="Remove item" type="button">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              )}

              {step === 'account' && (
                <div className="crt-account">
                  <div className="crt-details-card">
                    <div className="crt-details-title">Sign in to continue</div>
                    <div className="crt-details-sub">Create an account or log in before payment so your tickets stay connected to you.</div>
                    {currentUser ? (
                      <button className="crt-checkout-btn" onClick={() => setStep('details')} type="button">Continue as {getDisplayName(currentUser)}</button>
                    ) : (
                      <>
                        <div className="auth-tabs crt-auth-tabs">
                          <button className={`auth-tab ${authMode !== 'signup' ? 'active' : ''}`} onClick={() => switchAuthMode('login')} type="button">Log in</button>
                          <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => switchAuthMode('signup')} type="button">Sign up</button>
                        </div>
                        <form className="crt-auth-form" onSubmit={authMode === 'signup' ? handleSignup : handleLogin}>
                          {authMode === 'signup' && (
                            <label>Full name<input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} autoComplete="name" /></label>
                          )}
                          <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} autoComplete="email" /></label>
                          <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} /></label>
                          {authMessage && <div className="crt-warning">{authMessage}</div>}
                          <button className="crt-checkout-btn" disabled={!authReady} type="submit">
                            {authMode === 'signup' ? 'Create account' : 'Log in'}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 'details' && (
                <div className="crt-details">
                  <div className="crt-details-card">
                    <div className="crt-details-title">Welcome, {contact.first || getDisplayName?.(currentUser) || 'there'}</div>
                    <div className="crt-details-sub">Confirm your contact information before payment.</div>
                    <div className="crt-mini-review">
                      <strong>{numTickets} ticket{numTickets !== 1 ? 's' : ''}</strong>
                      <span>{groupedItems.map((group) => `${group.show_title} (${group.session_date} ${group.session_time})`).join(' + ')}</span>
                    </div>
                    <div className="crt-confirm-summary">
                      {groupedItems.map((group) => (
                        <div key={group.group_id} className="crt-confirm-group">
                          <strong>{group.show_title}</strong>
                          <span>{group.session_date} · {group.session_time}</span>
                          {group.items.map((item) => (
                            <div key={item.id} className="crt-confirm-line">
                              <span>{item.ticket_type_label} x{item.quantity}</span>
                              <span>{fmt(item.unit_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
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
                        <input type="email" value={contact.email} onBlur={() => setTouched((p) => ({ ...p, email: true }))} onChange={(event) => updateContact('email', event.target.value)} autoComplete="email" />
                      </label>
                      <label className={touched.phone && !validPhone(contact.phone) ? 'crt-field-error crt-field-wide' : 'crt-field-wide'}>
                        Phone number
                        <input type="tel" value={contact.phone} onBlur={() => setTouched((p) => ({ ...p, phone: true }))} onChange={(event) => updateContact('phone', event.target.value)} autoComplete="tel" placeholder="(778) 123-4567" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
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
                {step !== 'review' && <button className="crt-back-btn" onClick={() => setStep(step === 'details' ? 'account' : 'review')} type="button">Back</button>}
                <button
                  className="crt-checkout-btn"
                  onClick={step === 'review' ? goAfterReview : step === 'account' ? () => currentUser && setStep('details') : completeCheckout}
                  disabled={(step === 'review' && invalidItems.length > 0) || (step === 'details' && !contactReady)}
                  type="button"
                >
                  {step === 'review' ? `Continue - ${fmt(grand)}` : step === 'account' ? 'Continue to details' : `Continue to Payment - ${fmt(grand)}`}
                </button>
              </div>

              <div className="crt-security">
                Secured by <strong style={{ color: '#2563eb' }}>Stripe</strong>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <button className="crt-clear-link" onClick={() => items.forEach((i) => onRemove(i.id))} type="button">Clear all</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
