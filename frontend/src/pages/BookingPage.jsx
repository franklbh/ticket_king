import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { badge, currency } from '../utils/format'
import { applyCartItemTuesdayDiscount, applyTerracottaTuesdayDiscount, getExperiencePriceFrom, getPricesForSlot } from '../utils/pricing'
import { formatSlotTicketTypes, minQtyForTicket } from '../utils/tickets'

function cartDateKey(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function minQtyForTicketType(ticketOrId) {
  return minQtyForTicket(ticketOrId)
}

function BookingPage({
  availableSlots = [],
  availableSlotsLoading = false,
  bookingExperience,
  bookingExperiences = [],
  bookingRef,
  calendarMonth,
  cartCount = 0,
  cartItems = [],
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
  t = (key, params = {}) => Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), key),
  visibleDateGrid,
  weekdayLabels,
}) {
  const [ticketLines, setTicketLines] = useState([{ key: 'ticket-1', ticketTypeId: 'adult', quantity: 1 }])
  const [rawTicketQty, setRawTicketQty] = useState({})
  const [showAllSlots, setShowAllSlots] = useState(false)
  const lastAutoCartSelectionRef = useRef(null)
  const previousSelectedSessionCartCountRef = useRef(0)
  const suppressNextAutoCartSyncRef = useRef(false)
  const onAddToCartRef = useRef(onAddToCart)

  useEffect(() => {
    onAddToCartRef.current = onAddToCart
  }, [onAddToCart])

  const ticketById = useCallback((id) => (
    localizedTicketTypes.find((item) => item.id === id) || localizedTicketTypes[0]
  ), [localizedTicketTypes])
  const minQtyForType = useCallback((id) => minQtyForTicketType(ticketById(id) || id), [ticketById])
  const defaultTicketTypeId = localizedTicketTypes[0]?.id || 'adult'
  const bookingExperienceId = bookingExperience?.id
  const ticketOptions = useMemo(() => (
    localizedTicketTypes.map((item) => ({ id: item.id, label: item.label, price: item.price, minQty: minQtyForTicketType(item) }))
  ), [localizedTicketTypes])
  const defaultTicketLines = useCallback(() => ([
    { key: 'ticket-1', ticketTypeId: defaultTicketTypeId, quantity: minQtyForType(defaultTicketTypeId) },
  ]), [defaultTicketTypeId, minQtyForType])
  const ticketLinesFromCartItems = useCallback((items) => items.map((item, index) => {
    const ticketTypeId = ticketById(item.ticket_type_id)?.id || defaultTicketTypeId
    return {
      key: `ticket-${item.ticket_type_id || index}`,
      ticketTypeId,
      quantity: Math.max(minQtyForType(ticketTypeId), Number(item.quantity) || 0),
    }
  }), [defaultTicketTypeId, minQtyForType, ticketById])
  const mergeTicketLinesWithCartItems = useCallback((previousLines, items) => {
    const nextByType = new Map()
    previousLines.forEach((line) => {
      const ticketTypeId = ticketById(line.ticketTypeId)?.id || defaultTicketTypeId
      nextByType.set(ticketTypeId, { ...line, ticketTypeId, quantity: 0 })
    })
    ticketLinesFromCartItems(items).forEach((line) => {
      nextByType.set(line.ticketTypeId, line)
    })
    const nextLines = Array.from(nextByType.values())
    return nextLines.length ? nextLines : [{ key: `ticket-${defaultTicketTypeId}`, ticketTypeId: defaultTicketTypeId, quantity: 0 }]
  }, [defaultTicketTypeId, ticketById, ticketLinesFromCartItems])
  const selectedImage = bookingExperience?.heroImg || bookingExperience?.gallery?.[0]

  const liveSlots = useMemo(() => availableSlots.map((slot) => {
    const time = slot.label || [slot.startTime, slot.endTime].filter(Boolean).join(' - ')
    const prices = getPricesForSlot(bookingExperience, selectedDate?.date)
    const weekend = selectedDate?.date ? [0, 6].includes(selectedDate.date.getDay()) : false
    const slotTicketTypes = formatSlotTicketTypes(slot.ticketTypes || slot.ticket_types || [])
    const adultTicket = slotTicketTypes.find((ticket) => ticket.key === 'adult') || slotTicketTypes[0]
    const liveSlotPrice = adultTicket?.price ?? slot.price
    return {
      id: slot.id,
      eventId: slot.eventId,
      slotId: slot.id,
      time,
      label: time,
      price: Number.isFinite(Number(liveSlotPrice))
        ? applyTerracottaTuesdayDiscount(liveSlotPrice, bookingExperience, selectedDate?.date)
        : prices.adult ?? localizedTicketTypes[0]?.price ?? 0,
      availableSeats: slot.availableSeats,
      peak: weekend,
      ticketTypes: slot.ticketTypes || slot.ticket_types || [],
    }
  }), [availableSlots, bookingExperience, localizedTicketTypes, selectedDate])

  useEffect(() => {
    setTicketLines((lines) => lines.map((line) => {
      const ticketTypeId = ticketById(line.ticketTypeId)?.id || localizedTicketTypes[0]?.id || 'adult'
      return { ...line, ticketTypeId, quantity: line.quantity === 0 ? 0 : Math.max(line.quantity, minQtyForType(ticketTypeId)) }
    }))
  }, [localizedTicketTypes, minQtyForType, ticketById])

  const lineSubtotal = (line) => (ticketById(line.ticketTypeId)?.price || 0) * line.quantity
  const lineOriginalSubtotal = (line) => {
    const ticket = ticketById(line.ticketTypeId)
    const originalPrice = Number(ticket?.originalPrice || ticket?.price || 0)
    return originalPrice * line.quantity
  }
  const canAdd = Boolean(
    selectedDate
    && selectedTime
    && bookingExperience
    && localizedTicketTypes.length
    && ticketLines.length
    && ticketLines.some((line) => line.quantity > 0)
    && ticketLines.every((line) => line.quantity === 0 || line.quantity >= minQtyForType(line.ticketTypeId)),
  )
  const displayCartCount = cartCount
  const visibleSlots = showAllSlots ? liveSlots : liveSlots.slice(0, 8)
  const relatedExperiences = bookingExperiences.filter((item) => item.id !== bookingExperienceId).slice(0, 5)
  const currentSummaryItems = useMemo(() => ticketLines.map((line) => {
    const ticket = ticketById(line.ticketTypeId)
    const quantity = Number(line.quantity) || 0
    const unitPrice = Number(ticket?.price || 0)
    const originalUnitPrice = Number(ticket?.originalPrice || unitPrice)
    const hasDiscount = originalUnitPrice > unitPrice
    return {
      key: line.key,
      title: bookingExperience?.title || t('experience'),
      date: selectedDate ? fullDateDisplay(selectedDate.date) : t('selectDate'),
      time: selectedTime?.time || selectedTime?.label || t('selectTime'),
      ticketLabel: ticket?.label || t('ticketType'),
      quantity,
      total: unitPrice * quantity,
      originalTotal: hasDiscount ? originalUnitPrice * quantity : null,
      discountLabel: hasDiscount ? t('tuesdayPromo50Off') : '',
    }
  }), [bookingExperience?.title, fullDateDisplay, selectedDate, selectedTime, t, ticketById, ticketLines])
  const pricedCartItems = useMemo(() => cartItems.map((item) => applyCartItemTuesdayDiscount(item)), [cartItems])
  const cartSummaryItems = useMemo(() => pricedCartItems.map((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0)
    const unitPrice = Number(item.unit_price || 0)
    const originalUnitPrice = Number(item.original_unit_price || unitPrice)
    const hasDiscount = originalUnitPrice > unitPrice
    return {
      key: item.id,
      title: item.show_title || t('experience'),
      date: item.session_date || item.session_date_key || t('selectDate'),
      time: item.session_time || t('selectTime'),
      ticketLabel: item.ticket_type_label || t('ticketType'),
      quantity,
      total: unitPrice * quantity,
      originalTotal: hasDiscount ? originalUnitPrice * quantity : null,
      discountLabel: hasDiscount ? t('tuesdayPromo50Off') : '',
    }
  }).filter((item) => item.quantity > 0), [pricedCartItems, t])
  const summaryItems = cartSummaryItems.length ? cartSummaryItems : currentSummaryItems
  const subtotal = cartSummaryItems.reduce((sum, item) => sum + item.total, 0)
  const ticketQty = cartSummaryItems.reduce((sum, item) => sum + item.quantity, 0)
  const processingFee = ticketQty > 0 ? 1.8 * ticketQty + 0.025 * subtotal : 0
  const tax = ticketQty > 0 ? 0.05 * subtotal : 0
  const grand = subtotal + processingFee + tax
  const selectedSessionCartItems = useMemo(() => {
    if (!selectedDate?.date || !selectedTime || !bookingExperienceId) return []
    const sessionDateKey = cartDateKey(selectedDate.date)
    const sessionTime = selectedTime.label || selectedTime.time
    const slotId = selectedTime.id || selectedTime.slot_id || selectedTime.slotId
    return cartItems.filter((item) => {
      const itemSlotId = item.slot_id || item.slotId
      const sameSlot = itemSlotId && slotId ? itemSlotId === slotId : item.session_time === sessionTime
      return item.show_id === bookingExperienceId
        && item.session_date_key === sessionDateKey
        && sameSlot
        && item.quantity > 0
    })
  }, [bookingExperienceId, cartItems, selectedDate, selectedTime])

  const resetTicketSelectorWithoutAdding = useCallback(() => {
    suppressNextAutoCartSyncRef.current = true
    lastAutoCartSelectionRef.current = null
    setTicketLines((lines) => {
      const nextLines = lines.map((line) => ({ ...line, quantity: 0 }))
      return nextLines.length ? nextLines : defaultTicketLines().map((line) => ({ ...line, quantity: 0 }))
    })
    setRawTicketQty({})
  }, [defaultTicketLines])

  useEffect(() => {
    const selectedSessionCartCount = selectedSessionCartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const hadSelectedSessionItems = previousSelectedSessionCartCountRef.current > 0
    previousSelectedSessionCartCountRef.current = selectedSessionCartCount

    if (selectedSessionCartItems.length) {
      setTicketLines((previousLines) => {
        const nextTicketLines = mergeTicketLinesWithCartItems(previousLines, selectedSessionCartItems)
        const sameLines = previousLines.length === nextTicketLines.length
          && previousLines.every((line, index) => (
            line.ticketTypeId === nextTicketLines[index].ticketTypeId
            && Number(line.quantity) === Number(nextTicketLines[index].quantity)
          ))
        if (sameLines) return previousLines
        suppressNextAutoCartSyncRef.current = true
        lastAutoCartSelectionRef.current = null
        return nextTicketLines
      })
      setRawTicketQty({})
      return
    }

    if (hadSelectedSessionItems) resetTicketSelectorWithoutAdding()
  }, [mergeTicketLinesWithCartItems, resetTicketSelectorWithoutAdding, selectedSessionCartItems])

  useEffect(() => {
    if (suppressNextAutoCartSyncRef.current) {
      suppressNextAutoCartSyncRef.current = false
      return
    }

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
        ? { ...line, ticketTypeId, quantity: line.quantity === 0 ? 0 : Math.max(line.quantity, minQtyForType(ticketTypeId)) }
        : line
    )))
  }

  const selectTimeSlot = (slot) => {
    if (selectedDate?.date && bookingExperienceId) {
      const sessionDateKey = cartDateKey(selectedDate.date)
      const sessionTime = slot.label || slot.time
      const existingItems = cartItems.filter((item) => (
        item.show_id === bookingExperienceId
        && item.session_date_key === sessionDateKey
        && item.session_time === sessionTime
        && item.quantity > 0
      ))

      if (existingItems.length) {
        setTicketLines(ticketLinesFromCartItems(existingItems))
        setRawTicketQty({})
      }
    }
    setSelectedTime(slot)
  }

  const updateTicketQty = (key, delta) => {
    setRawTicketQty((values) => {
      const next = { ...values }
      delete next[key]
      return next
    })
    setTicketLines((lines) => lines.map((line) => {
      if (line.key !== key) return line
      const minQty = minQtyForType(line.ticketTypeId)
      const nextQuantity = delta > 0 && line.quantity === 0 && minQty > 1
        ? minQty
        : delta < 0 && line.quantity <= minQty
          ? 0
          : Math.max(0, line.quantity + delta)
      return { ...line, quantity: nextQuantity }
    }))
  }

  const setTicketQty = (line, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 2)
    setRawTicketQty((values) => ({ ...values, [line.key]: digits }))
    if (!digits) return
    const parsed = Math.min(99, Number(digits))
    const minQty = minQtyForType(line.ticketTypeId)
    const quantity = parsed === 0 ? 0 : Math.max(minQty, parsed)
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
      const minQty = minQtyForType(item.ticketTypeId)
      return { ...item, quantity: item.quantity === 0 ? 0 : Math.max(minQty, item.quantity || 0) }
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
    setTicketLines(defaultTicketLines())
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
          <div className="btk-title"><CartIcon /><h1>{t('buyTickets')}</h1><span>{t('stepOfTotal', { current: 1, total: 4 })}</span></div>
          <button className="btk-close" onClick={onClose} type="button" aria-label={t('close')}>×</button>
        </header>

        <div className="btk-layout">
          <main className="btk-main">
            <button className="btk-back" onClick={onClose} type="button">← {t('backToExperiences')}</button>

            <section className="btk-product">
              {bookingExperiences.length > 1 && (
                <button className="btk-product-arrow prev" onClick={() => switchExperienceByStep(-1)} type="button" aria-label={t('seeOtherExperiences')}>
                  <span aria-hidden="true">‹</span>
                  <strong>{t('seeOtherExperiences')}</strong>
                </button>
              )}
              <div className="btk-product-image" style={selectedImage ? { backgroundImage: `url(${selectedImage})` } : { background: bookingExperience?.cardGradient }}>
                <span>{bookingExperience?.category === 'arcade' ? t('vrGame') : t('vrShow')}</span>
              </div>
              <div>
                <h2>{bookingExperience?.title}</h2>
                <p>{bookingExperience?.subtitle || bookingExperience?.description || t('stepIntoVrJourney')}</p>
                <div className="btk-meta"><span>◷ {t('durationLabel')}: {bookingExperience?.duration} {t('minuteShort')}</span><span>♙ {t('agesMin', { min: bookingExperience?.minAge })}</span></div>
              </div>
              {bookingExperiences.length > 1 && (
                <button className="btk-product-arrow next" onClick={() => switchExperienceByStep(1)} type="button" aria-label={t('seeOtherExperiences')}>
                  <strong>{t('seeOtherExperiences')}</strong>
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </section>

            <section className="btk-picker">
              <div className="btk-date-panel">
                <StepLabel number="1" label={t('selectDate')} />
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
                <div className="btk-legend"><span className="best" />{t('bestPrice')} <span className="low" />{t('lowAvailability')}</div>
              </div>

              <div className="btk-time-panel">
                <StepLabel number="2" label={t('selectTime')} />
                <div className="btk-time-grid">
                  {availableSlotsLoading && <div className="btk-slot-note">{t('loadingLiveTimeSlots')}</div>}
                  {!availableSlotsLoading && selectedDate && liveSlots.length === 0 && <div className="btk-slot-note">{t('noSessionsForDate')}</div>}
                  {!selectedDate && <div className="btk-slot-note">{t('chooseDateToLoadSessions')}</div>}
                  {!availableSlotsLoading && visibleSlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={selectedTime?.id === slot.id ? 'selected' : ''}
                      onClick={() => selectTimeSlot(slot)}
                      type="button"
                    >
                      <strong>{slot.time}</strong>
                      {slot.availableSeats != null && slot.availableSeats <= 5 && <small>{t('onlyLeft', { count: slot.availableSeats })}</small>}
                      {selectedTime?.id === slot.id && <span>✓</span>}
                    </button>
                  ))}
                  {!availableSlotsLoading && liveSlots.length > 8 && (
                    <button className="btk-expand-slots" onClick={() => setShowAllSlots((open) => !open)} type="button">
                      {showAllSlots ? t('showFewerTimes') : t('expandMoreSlots', { count: liveSlots.length - 8 })}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="btk-ticket-card">
              <div className="btk-ticket-head">
                <StepLabel number="3" label={t('chooseTickets')} />
                <p className="btk-auto-cart-note">{t('autoCartNote')}</p>
              </div>
              <div className="btk-ticket-lines">
                {ticketLines.map((line) => {
                  const selectedTicket = ticketById(line.ticketTypeId)
                  const total = lineSubtotal(line)
                  const originalTotal = lineOriginalSubtotal(line)
                  return (
                    <div className="btk-ticket-row" key={line.key}>
                      <select value={line.ticketTypeId} onChange={(event) => updateTicketType(line.key, event.target.value)}>
                        {localizedTicketTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                      <span>{selectedTicket?.info || t('generalAdmissionFor', { label: selectedTicket?.label || t('ticketType') })}</span>
                      <div className="btk-qty">
                        <button onClick={() => updateTicketQty(line.key, -1)} disabled={line.quantity <= 0} type="button">-</button>
                        <input
                          aria-label={`${selectedTicket?.label || t('ticketType')} ${t('qty')}`}
                          inputMode="numeric"
                          min="0"
                          onBlur={() => commitTicketQty(line)}
                          onChange={(event) => setTicketQty(line, event.target.value)}
                          type="text"
                          value={rawTicketQty[line.key] ?? line.quantity}
                        />
                        <button onClick={() => updateTicketQty(line.key, 1)} type="button">+</button>
                      </div>
                      <strong>
                        <SummaryPrice
                          item={{
                            total,
                            originalTotal: originalTotal > total ? originalTotal : null,
                            discountLabel: originalTotal > total ? t('tuesdayPromo50Off') : '',
                          }}
                          currency={currency}
                        />
                      </strong>
                      <button className="btk-remove-ticket" onClick={() => removeTicketLine(line.key)} disabled={ticketLines.length === 1} type="button" aria-label={t('remove')}>×</button>
                    </div>
                  )
                })}
              </div>
              <div className="btk-ticket-actions">
                <button className="btk-add-type" onClick={addTicketLine} type="button">+ {t('addAnotherTicketType')}</button>
              </div>
            </section>

            {relatedExperiences.length > 0 && (
              <section className="btk-more-experiences">
                <div className="btk-more-head">
                  <StepLabel number="4" label={t('addMultipleCheckout')} />
                  <button type="button">{t('viewAllExperiences')} →</button>
                </div>
                <div className="btk-exp-row">
                  {relatedExperiences.map((experience) => {
                    const image = experience.heroImg || experience.gallery?.[0]
                    return (
                      <article className="btk-exp-card" key={experience.id}>
                        <div className="btk-exp-img" style={image ? { backgroundImage: `url(${image})` } : { background: experience.cardGradient }}>
                          <span>{experience.category === 'arcade' ? t('vrGame') : t('vrShow')}</span>
                        </div>
                        <div className="btk-exp-body">
                          <strong>{experience.title}</strong>
                          <small>{experience.subtitle || experience.tagline}</small>
                          <div><span>{t('from')} {currency(getExperiencePriceFrom(experience) || 37.95)}</span><button onClick={() => chooseRelatedExperience(experience.id)} type="button">{t('add')}</button></div>
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
                <h3>{cartSummaryItems.length ? t('bookingSummary') : t('currentChoice')}</h3>
                <p>{cartSummaryItems.length ? t('cartSavedAuto') : t('selectionAddedAuto')}</p>
              </div>
            </div>
            <div className="btk-summary-product">
              <div className="btk-summary-thumb" style={selectedImage ? { backgroundImage: `url(${selectedImage})` } : { background: bookingExperience?.cardGradient }} />
              <div><strong>{bookingExperience?.title}</strong><span>{selectedDate ? fullDateDisplay(selectedDate.date) : t('selectDate')}</span><span>{selectedTime?.time || t('selectTime')}</span></div>
            </div>
            {summaryItems.map((item) => (
              <SummaryLine
                key={item.key}
                label={<CartSummaryLabel item={item} compact={!cartSummaryItems.length} />}
                value={<SummaryPrice item={item} currency={currency} />}
              />
            ))}
            <div className="btk-divider" />
            <SummaryLine label={t('subtotal')} value={currency(subtotal)} muted />
            <SummaryLine label={<ProcessingFeeLabel t={t} />} value={currency(processingFee)} muted />
            <SummaryLine label="GST (5%)" value={currency(tax)} muted />
            <div className="btk-divider" />
            <div className="btk-total"><span>{t('totalDue')}</span><strong>{currency(grand)} <small>CAD</small></strong></div>
            <div className="btk-cart-callout">
              <div><CartIcon /><strong>{t('itemsInCart', { count: displayCartCount, plural: displayCartCount !== 1 ? 's' : '' })}</strong><span>{t('addMoreCheckout')}</span></div>
              <button onClick={onOpenCart} disabled={!displayCartCount} type="button">{t('viewCart')} ({displayCartCount}) →</button>
            </div>
            <div className="btk-bundle-callout"><span>♙</span><div><strong>{t('addMultipleExperiences')}</strong><small>{t('bundleExperiencesCopy')}</small></div></div>
            <TrustBox t={t} />
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

function CartSummaryLabel({ item, compact }) {
  if (compact) return `${item.ticketLabel} × ${item.quantity}`
  return (
    <span className="btk-summary-item-label">
      <strong>{item.title}</strong>
      <small>{item.date} · {item.time}</small>
      <span>{item.ticketLabel} × {item.quantity}</span>
    </span>
  )
}

function SummaryLine({ label, value, muted }) {
  return <div className={`btk-summary-line ${muted ? 'muted' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

function SummaryPrice({ item, currency }) {
  if (!item.originalTotal || item.originalTotal <= item.total) return currency(item.total)
  return (
    <span className="btk-summary-price-discount">
      <small>{item.discountLabel}</small>
      <span>
        <del>{currency(item.originalTotal)}</del>
        <b>{currency(item.total)}</b>
      </span>
    </span>
  )
}

function ProcessingFeeLabel({ t }) {
  const [open, setOpen] = useState(false)
  const tooltipId = 'booking-processing-fee-tooltip'

  useEffect(() => {
    if (!open) return undefined
    const closeTooltip = () => setOpen(false)
    document.addEventListener('click', closeTooltip)
    return () => document.removeEventListener('click', closeTooltip)
  }, [open])

  return (
    <span className="processing-fee-label">
      {t('processingFee')}
      <span className={`processing-fee-help ${open ? 'is-open' : ''}`}>
        <button
          className="processing-fee-icon"
          type="button"
          aria-label={t('processingFeeDetails')}
          aria-expanded={open}
          aria-describedby={tooltipId}
          onClick={(event) => {
            event.stopPropagation()
            setOpen((current) => !current)
          }}
        >
          !
        </button>
        <span className="processing-fee-tooltip" id={tooltipId} role="tooltip">
          {t('processingFeeTooltip')}
        </span>
      </span>
    </span>
  )
}

function TrustBox({ t }) {
  return (
    <div className="btk-trust">
      <div><span>♢</span><strong>{t('secureEncrypted')}</strong><small>{t('secureEncryptedCopy')}</small></div>
      <div><span>▣</span><strong>{t('flexibleBooking')}</strong><small>{t('flexibleBookingCopy')}</small></div>
      <div><span>☏</span><strong>{t('needHelp')}</strong><small>{t('supportAnytime')}</small></div>
    </div>
  )
}

export default BookingPage
