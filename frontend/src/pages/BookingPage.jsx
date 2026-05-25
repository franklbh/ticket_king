import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { badge, currency } from '../utils/format'
import { getExperiencePriceFrom, getPricesForSlot } from '../utils/pricing'

function BookingPage({
  availableSlots = [],
  availableSlotsLoading = false,
  bookingExperience,
  bookingExperiences = [],
  bookingRef,
  calendarMonth,
  cartCount = 0,
  changeCalendarMonth,
  fullDateDisplay,
  localizedTicketTypes,
  monthDisplay,
  onAddToCart,
  onBookingExperienceChange,
  onClose,
  onOpenCart,
  selectedDate,
  selectedTime,
  setSelectedDate,
  setSelectedTime,
  visibleDateGrid,
  weekdayLabels,
}) {
  const [ticketLines, setTicketLines] = useState([{ key: 'ticket-1', ticketTypeId: 'adult', quantity: 1 }])
  const [rawTicketQty, setRawTicketQty] = useState({})
  const [showAllSlots, setShowAllSlots] = useState(false)
  const lastAutoCartSelectionRef = useRef(null)
  const onAddToCartRef = useRef(onAddToCart)

  useEffect(() => {
    onAddToCartRef.current = onAddToCart
  }, [onAddToCart])

  const minQtyForType = (id) => id === 'family' ? 3 : id === 'group' ? 6 : 1
  const ticketById = useCallback((id) => (
    localizedTicketTypes.find((item) => item.id === id) || localizedTicketTypes[0]
  ), [localizedTicketTypes])
  const ticketOptions = useMemo(() => (
    localizedTicketTypes.map((item) => ({ id: item.id, label: item.label, price: item.price }))
  ), [localizedTicketTypes])
  const selectedImage = bookingExperience?.heroImg || bookingExperience?.gallery?.[0]

  const liveSlots = useMemo(() => availableSlots.map((slot) => {
    const time = slot.label || [slot.startTime, slot.endTime].filter(Boolean).join(' - ')
    const prices = getPricesForSlot(bookingExperience, selectedDate?.date)
    const weekend = selectedDate?.date ? [0, 6].includes(selectedDate.date.getDay()) : false
    return {
      id: slot.id,
      eventId: slot.eventId,
      slotId: slot.id,
      time,
      label: time,
      price: prices.adult ?? slot.price ?? localizedTicketTypes[0]?.price ?? 0,
      availableSeats: slot.availableSeats,
      peak: weekend,
    }
  }), [availableSlots, bookingExperience, localizedTicketTypes, selectedDate])

  useEffect(() => {
    setTicketLines((lines) => lines.map((line) => {
      const ticketTypeId = ticketById(line.ticketTypeId)?.id || localizedTicketTypes[0]?.id || 'adult'
      return { ...line, ticketTypeId, quantity: Math.max(line.quantity, minQtyForType(ticketTypeId)) }
    }))
  }, [localizedTicketTypes, ticketById])

  const lineSubtotal = (line) => (ticketById(line.ticketTypeId)?.price || 0) * line.quantity
  const subtotal = ticketLines.reduce((sum, line) => sum + lineSubtotal(line), 0)
  const ticketQty = ticketLines.reduce((sum, line) => sum + line.quantity, 0)
  const processingFee = ticketQty > 0 ? 1.8 * ticketQty + 0.025 * subtotal : 0
  const tax = ticketQty > 0 ? 0.05 * subtotal : 0
  const grand = subtotal + processingFee + tax
  const canAdd = Boolean(
    selectedDate
    && selectedTime
    && bookingExperience
    && ticketLines.length
    && ticketLines.every((line) => line.quantity >= minQtyForType(line.ticketTypeId)),
  )
  const displayCartCount = cartCount
  const visibleSlots = showAllSlots ? liveSlots : liveSlots.slice(0, 8)
  const relatedExperiences = bookingExperiences.filter((item) => item.id !== bookingExperience?.id).slice(0, 5)

  useEffect(() => {
    const previousSelection = lastAutoCartSelectionRef.current
    if (!canAdd) {
      if (previousSelection) {
        onAddToCartRef.current?.({ ...previousSelection, tickets: [] })
        lastAutoCartSelectionRef.current = null
      }
      return
    }

    const nextSelection = {
      experience: bookingExperience,
      selectedDate: selectedDate.date,
      selectedTime,
      ticketOptions,
      tickets: ticketLines.map((line) => ({ ...ticketById(line.ticketTypeId), quantity: line.quantity })),
      openCart: false,
    }

    if (previousSelection) {
      const previousDateKey = previousSelection.selectedDate?.toISOString?.() || String(previousSelection.selectedDate)
      const nextDateKey = nextSelection.selectedDate?.toISOString?.() || String(nextSelection.selectedDate)
      const previousTime = previousSelection.selectedTime?.id || previousSelection.selectedTime?.time || previousSelection.selectedTime
      const nextTime = nextSelection.selectedTime?.id || nextSelection.selectedTime?.time || nextSelection.selectedTime
      if (previousSelection.experience?.id !== nextSelection.experience?.id || previousDateKey !== nextDateKey || previousTime !== nextTime) {
        onAddToCartRef.current?.({ ...previousSelection, tickets: [] })
      }
    }

    onAddToCartRef.current?.(nextSelection)
    lastAutoCartSelectionRef.current = nextSelection
  }, [bookingExperience, canAdd, selectedDate, selectedTime, ticketById, ticketLines, ticketOptions])

  const updateTicketType = (key, ticketTypeId) => {
    setRawTicketQty((values) => {
      const next = { ...values }
      delete next[key]
      return next
    })
    setTicketLines((lines) => lines.map((line) => (
      line.key === key
        ? { ...line, ticketTypeId, quantity: Math.max(line.quantity, minQtyForType(ticketTypeId)) }
        : line
    )))
  }

  const updateTicketQty = (key, delta) => {
    setRawTicketQty((values) => {
      const next = { ...values }
      delete next[key]
      return next
    })
    setTicketLines((lines) => lines.map((line) => {
      if (line.key !== key) return line
      return { ...line, quantity: Math.max(minQtyForType(line.ticketTypeId), line.quantity + delta) }
    }))
  }

  const setTicketQty = (line, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 2)
    setRawTicketQty((values) => ({ ...values, [line.key]: digits }))
    if (!digits) return
    const minQty = minQtyForType(line.ticketTypeId)
    const quantity = Math.max(minQty, Math.min(99, Number(digits)))
    setRawTicketQty((values) => ({ ...values, [line.key]: String(quantity) }))
    setTicketLines((lines) => lines.map((item) => (
      item.key === line.key ? { ...item, quantity } : item
    )))
  }

  const commitTicketQty = (line) => {
    setRawTicketQty((values) => {
      const next = { ...values }
      delete next[line.key]
      return next
    })
    setTicketLines((lines) => lines.map((item) => {
      if (item.key !== line.key) return item
      return { ...item, quantity: Math.max(minQtyForType(item.ticketTypeId), item.quantity || 0) }
    }))
  }

  const addTicketLine = () => {
    const usedIds = new Set(ticketLines.map((line) => line.ticketTypeId))
    const nextType = localizedTicketTypes.find((item) => !usedIds.has(item.id)) || localizedTicketTypes[0]
    if (!nextType) return
    setTicketLines((lines) => [...lines, {
      key: `ticket-${Date.now()}`,
      ticketTypeId: nextType.id,
      quantity: minQtyForType(nextType.id),
    }])
  }

  const removeTicketLine = (key) => {
    setRawTicketQty((values) => {
      const next = { ...values }
      delete next[key]
      return next
    })
    setTicketLines((lines) => lines.length > 1 ? lines.filter((line) => line.key !== key) : lines)
  }

  const switchExperienceByStep = (direction) => {
    if (!bookingExperiences.length || !bookingExperience?.id) return
    const currentIndex = bookingExperiences.findIndex((item) => item.id === bookingExperience.id)
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + direction + bookingExperiences.length) % bookingExperiences.length
    chooseRelatedExperience(bookingExperiences[nextIndex].id)
  }

  const chooseRelatedExperience = (experienceId) => {
    lastAutoCartSelectionRef.current = null
    onBookingExperienceChange?.(experienceId)
    setSelectedTime(null)
    setTicketLines([{ key: 'ticket-1', ticketTypeId: localizedTicketTypes[0]?.id || 'adult', quantity: 1 }])
    setRawTicketQty({})
    setShowAllSlots(false)
    requestAnimationFrame(() => {
      bookingRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="btk-page" ref={bookingRef} id="booking">
      <div className="btk-shell">
        <header className="btk-header">
          <div className="btk-title"><CartIcon /><h1>Buy Tickets</h1><span>Step 1 of 4</span></div>
          <button className="btk-close" onClick={onClose} type="button" aria-label="Close">×</button>
        </header>

        <div className="btk-layout">
          <main className="btk-main">
            <button className="btk-back" onClick={onClose} type="button">← Back to experiences</button>

            <section className="btk-product">
              {bookingExperiences.length > 1 && (
                <button className="btk-product-arrow prev" onClick={() => switchExperienceByStep(-1)} type="button" aria-label="Previous experience">
                  <span aria-hidden="true">‹</span>
                  <strong>See other experiences</strong>
                </button>
              )}
              <div className="btk-product-image" style={selectedImage ? { backgroundImage: `url(${selectedImage})` } : { background: bookingExperience?.cardGradient }}>
                <span>{bookingExperience?.category === 'arcade' ? 'VR Game' : 'VR Show'}</span>
              </div>
              <div>
                <h2>{bookingExperience?.title}</h2>
                <p>{bookingExperience?.subtitle || bookingExperience?.description || 'Step into an immersive VR journey brought to life.'}</p>
                <div className="btk-meta"><span>◷ Duration: {bookingExperience?.duration} min</span><span>♙ Ages: {bookingExperience?.minAge}+</span></div>
              </div>
              {bookingExperiences.length > 1 && (
                <button className="btk-product-arrow next" onClick={() => switchExperienceByStep(1)} type="button" aria-label="Next experience">
                  <strong>See other experiences</strong>
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </section>

            <section className="btk-picker">
              <div className="btk-date-panel">
                <StepLabel number="1" label="Select date" />
                <div className="btk-month-row">
                  <button onClick={() => changeCalendarMonth(-1)} type="button" aria-label="Previous month">‹</button>
                  <strong>{monthDisplay(calendarMonth)}</strong>
                  <button onClick={() => changeCalendarMonth(1)} type="button" aria-label="Next month">›</button>
                </div>
                <div className="btk-calendar">
                  {weekdayLabels.map((day) => <span className="btk-dow" key={day}>{day.slice(0, 1)}</span>)}
                  {visibleDateGrid.map((date) => date.blank ? <span key={date.key} /> : (
                    <button
                      key={date.key}
                      className={`${date.disabled ? 'disabled' : ''} ${selectedDate?.key === date.key ? 'selected' : ''} ${badge(date.level)}`}
                      disabled={date.disabled}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null) }}
                      type="button"
                    >
                      <strong>{date.day}</strong>
                      <small>{date.price ? `$${Math.round(date.price)}` : '-'}</small>
                    </button>
                  ))}
                </div>
                <div className="btk-legend"><span className="best" />Best price <span className="low" />Low availability</div>
              </div>

              <div className="btk-time-panel">
                <StepLabel number="2" label="Select time" />
                <div className="btk-time-grid">
                  {availableSlotsLoading && <div className="btk-slot-note">Loading live time slots...</div>}
                  {!availableSlotsLoading && selectedDate && liveSlots.length === 0 && <div className="btk-slot-note">No sessions available for this date.</div>}
                  {!selectedDate && <div className="btk-slot-note">Choose a date to load live sessions.</div>}
                  {!availableSlotsLoading && visibleSlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={selectedTime?.id === slot.id ? 'selected' : ''}
                      onClick={() => { setSelectedTime(slot) }}
                      type="button"
                    >
                      <strong>{slot.time}</strong>
                      {slot.availableSeats != null && slot.availableSeats <= 5 && <small>Only {slot.availableSeats} left</small>}
                      {selectedTime?.id === slot.id && <span>✓</span>}
                    </button>
                  ))}
                  {!availableSlotsLoading && liveSlots.length > 8 && (
                    <button className="btk-expand-slots" onClick={() => setShowAllSlots((open) => !open)} type="button">
                      {showAllSlots ? 'Show fewer times' : `Expand more (${liveSlots.length - 8})`}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="btk-ticket-card">
              <div className="btk-ticket-head">
                <StepLabel number="3" label="Choose tickets" />
                <p className="btk-auto-cart-note">Your selected tickets are added to the shopping cart automatically.</p>
              </div>
              <div className="btk-ticket-lines">
                {ticketLines.map((line) => {
                  const selectedTicket = ticketById(line.ticketTypeId)
                  const minQty = minQtyForType(line.ticketTypeId)
                  return (
                    <div className="btk-ticket-row" key={line.key}>
                      <select value={line.ticketTypeId} onChange={(event) => updateTicketType(line.key, event.target.value)}>
                        {localizedTicketTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                      <span>{selectedTicket?.info || `General Admission for ${selectedTicket?.label || 'ticket'}`}</span>
                      <div className="btk-qty">
                        <button onClick={() => updateTicketQty(line.key, -1)} disabled={line.quantity <= minQty} type="button">-</button>
                        <input
                          aria-label={`${selectedTicket?.label || 'Ticket'} quantity`}
                          inputMode="numeric"
                          min={minQty}
                          onBlur={() => commitTicketQty(line)}
                          onChange={(event) => setTicketQty(line, event.target.value)}
                          type="text"
                          value={rawTicketQty[line.key] ?? line.quantity}
                        />
                        <button onClick={() => updateTicketQty(line.key, 1)} type="button">+</button>
                      </div>
                      <strong>{currency(lineSubtotal(line))}</strong>
                      <button className="btk-remove-ticket" onClick={() => removeTicketLine(line.key)} disabled={ticketLines.length === 1} type="button" aria-label="Remove ticket type">×</button>
                    </div>
                  )
                })}
              </div>
              <div className="btk-ticket-actions">
                <button className="btk-add-type" onClick={addTicketLine} type="button">+ Add another ticket type</button>
              </div>
            </section>

            {relatedExperiences.length > 0 && (
              <section className="btk-more-experiences">
                <div className="btk-more-head">
                  <StepLabel number="4" label="Add multiple experiences and pay in one checkout." />
                  <button type="button">View all experiences →</button>
                </div>
                <div className="btk-exp-row">
                  {relatedExperiences.map((experience) => {
                    const image = experience.heroImg || experience.gallery?.[0]
                    return (
                      <article className="btk-exp-card" key={experience.id}>
                        <div className="btk-exp-img" style={image ? { backgroundImage: `url(${image})` } : { background: experience.cardGradient }}>
                          <span>{experience.category === 'arcade' ? 'VR Game' : 'VR Show'}</span>
                        </div>
                        <div className="btk-exp-body">
                          <strong>{experience.title}</strong>
                          <small>{experience.subtitle || experience.tagline}</small>
                          <div><span>from {currency(getExperiencePriceFrom(experience) || 37.95)}</span><button onClick={() => chooseRelatedExperience(experience.id)} type="button">Add</button></div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
          </main>

          <aside className="btk-summary">
            <div className="btk-summary-head">
              <div>
                <h3>Current Choice</h3>
                <p>Your selection is added to your cart automatically.</p>
              </div>
            </div>
            <div className="btk-summary-product">
              <div className="btk-summary-thumb" style={selectedImage ? { backgroundImage: `url(${selectedImage})` } : { background: bookingExperience?.cardGradient }} />
              <div><strong>{bookingExperience?.title}</strong><span>{selectedDate ? fullDateDisplay(selectedDate.date) : 'Select date'}</span><span>{selectedTime?.time || 'Select time'}</span></div>
            </div>
            {ticketLines.map((line) => (
              <SummaryLine key={line.key} label={`${ticketById(line.ticketTypeId)?.label || 'Ticket'} × ${line.quantity}`} value={currency(lineSubtotal(line))} />
            ))}
            <div className="btk-divider" />
            <SummaryLine label="Subtotal" value={currency(subtotal)} muted />
            <SummaryLine label={<ProcessingFeeLabel />} value={currency(processingFee)} muted />
            <SummaryLine label="GST (5%)" value={currency(tax)} muted />
            <div className="btk-divider" />
            <div className="btk-total"><span>Total</span><strong>{currency(grand)} <small>CAD</small></strong></div>
            <div className="btk-cart-callout">
              <div><CartIcon /><strong>{displayCartCount} item{displayCartCount !== 1 ? 's' : ''} in your cart</strong><span>Add more experiences and pay in one checkout.</span></div>
              <button onClick={onOpenCart} disabled={!displayCartCount} type="button">View cart ({displayCartCount}) →</button>
            </div>
            <div className="btk-bundle-callout"><span>♙</span><div><strong>Add multiple experiences</strong><small>Bundle your favorite VR experiences and enjoy a seamless checkout.</small></div></div>
            <TrustBox />
          </aside>
        </div>
      </div>
    </div>
  )
}

function CartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function StepLabel({ number, label }) {
  return <div className="btk-step-label"><span>{number}</span><strong>{label}</strong></div>
}

function SummaryLine({ label, value, muted }) {
  return <div className={`btk-summary-line ${muted ? 'muted' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

function ProcessingFeeLabel() {
  return (
    <span className="processing-fee-label">
      Processing fee
      <span className="processing-fee-help">
        <button
          className="processing-fee-icon"
          type="button"
          aria-label="Processing fee details"
        >
          !
        </button>
        <span className="processing-fee-tooltip" role="tooltip">
          Includes a $1.80 platform fee per ticket plus a 2.5% payment processing fee.
        </span>
      </span>
    </span>
  )
}

function TrustBox() {
  return (
    <div className="btk-trust">
      <div><span>♢</span><strong>Secure & encrypted</strong><small>Your data is protected with industry-standard encryption.</small></div>
      <div><span>▣</span><strong>Flexible booking</strong><small>Easy to manage your bookings after purchase.</small></div>
      <div><span>☏</span><strong>Need help?</strong><small>Contact our support team anytime.</small></div>
    </div>
  )
}

export default BookingPage
