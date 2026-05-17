import { useState } from 'react'
import {
  isDateTimePeak,
} from '../data/showData'
import { badge, currency } from '../utils/format'

function BookingPage({
  alphapayLoading,
  applyCoupon,
  appliedCoupon,
  availableSlots,
  availableSlotsLoaded,
  availableSlotsLoading,
  bookingExperience,
  bookingExperiences,
  bookingRef,
  bookingSteps,
  calendarMonth,
  canProceedContact,
  canProceedDate,
  canProceedTickets,
  canProceedTime,
  changeCalendarMonth,
  changeCount,
  contact,
  contactErrors,
  contactTouched,
  counts,
  couponCode,
  couponMessage,
  currentStepIndex,
  fullDateDisplay,
  localizedTicketTypes,
  markContactTouched,
  minutes,
  monthDisplay,
  onBookingExperienceChange,
  paymentExpired,
  rawCounts,
  restartBooking,
  reservationLoading,
  seconds,
  selectedDate,
  selectedTime,
  setContact,
  setCounts,
  setCouponCode,
  setCouponMessage,
  setAppliedCoupon,
  setRawCounts,
  setSelectedDate,
  setSelectedTime,
  setStep,
  setVipModal,
  startAlphapayCheckout,
  startStripeCheckout,
  step,
  t,
  totals,
  updateContact,
  vipQty,
  visibleDateGrid,
  weekdayLabels,
}) {
  return (
    <div className="content" ref={bookingRef} id="booking">
      <BookingHero
        bookingExperience={bookingExperience}
        bookingExperiences={bookingExperiences}
        bookingSteps={bookingSteps}
        currentStepIndex={currentStepIndex}
        onBookingExperienceChange={onBookingExperienceChange}
        t={t}
      />
      <HeaderCards
        fullDateDisplay={fullDateDisplay}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        setStep={setStep}
        step={step}
        t={t}
      />
      {step === 'date' && (
        <DateStep
          calendarMonth={calendarMonth}
          canProceedDate={canProceedDate}
          changeCalendarMonth={changeCalendarMonth}
          fullDateDisplay={fullDateDisplay}
          monthDisplay={monthDisplay}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setStep={setStep}
          t={t}
          visibleDateGrid={visibleDateGrid}
          weekdayLabels={weekdayLabels}
        />
      )}
      {step === 'time' && (
        <TimeStep
          canProceedTime={canProceedTime}
          availableSlots={availableSlots}
          availableSlotsLoaded={availableSlotsLoaded}
          availableSlotsLoading={availableSlotsLoading}
          experience={bookingExperience}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          setStep={setStep}
          t={t}
        />
      )}
      {step === 'tickets' && (
        <TicketsStep
          canProceedTickets={canProceedTickets}
          changeCount={changeCount}
          counts={counts}
          localizedTicketTypes={localizedTicketTypes}
          rawCounts={rawCounts}
          setCounts={setCounts}
          setRawCounts={setRawCounts}
          setStep={setStep}
          setVipModal={setVipModal}
          t={t}
          totals={totals}
        />
      )}
      {step === 'contact' && (
        <ContactStep
          canProceedContact={canProceedContact}
          contact={contact}
          contactErrors={contactErrors}
          contactTouched={contactTouched}
          markContactTouched={markContactTouched}
          reservationLoading={reservationLoading}
          setContact={setContact}
          setStep={setStep}
          t={t}
          updateContact={updateContact}
        />
      )}
      {step === 'payment' && (
        <PaymentStep
          alphapayLoading={alphapayLoading}
          applyCoupon={applyCoupon}
          appliedCoupon={appliedCoupon}
          contact={contact}
          counts={counts}
          couponCode={couponCode}
          couponMessage={couponMessage}
          fullDateDisplay={fullDateDisplay}
          localizedTicketTypes={localizedTicketTypes}
          minutes={minutes}
          paymentExpired={paymentExpired}
          restartBooking={restartBooking}
          seconds={seconds}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          setCouponCode={setCouponCode}
          setCouponMessage={setCouponMessage}
          setAppliedCoupon={setAppliedCoupon}
          setStep={setStep}
          startAlphapayCheckout={startAlphapayCheckout}
          startStripeCheckout={startStripeCheckout}
          t={t}
          totals={totals}
          bookingExperience={bookingExperience}
          vipQty={vipQty}
        />
      )}
    </div>
  )
}

function BookingHero({ bookingExperience, bookingExperiences, bookingSteps, currentStepIndex, onBookingExperienceChange, t }) {
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const projectImage = bookingExperience?.heroImg || bookingExperience?.gallery?.[0]
  return (
    <div className="booking-hero">
      <div className="booking-title-block">
        <p className="booking-eyebrow">{t('secureCheckout')}</p>
        <h2>Checkout</h2>
        <p className="booking-hero-copy">Choose date, time, tickets, then pay.</p>
      </div>
      {bookingExperience && (
        <div className="booking-project-card">
          <div className="booking-project-thumb" style={projectImage ? { backgroundImage: `url(${projectImage})` } : { background: bookingExperience.cardGradient }} />
          <div className="booking-project-body">
            <div className="booking-project-title-row">
              <span className="booking-project-dot" style={{ background: bookingExperience.accent }} />
              <span className="booking-project-title">{bookingExperience.title}</span>
            </div>
            <div className="booking-project-meta">
              <span>{bookingExperience.duration} min</span>
              <span>Ages {bookingExperience.minAge}+</span>
            </div>
          </div>
          <div className="booking-product-menu-wrap">
            <button
              className="booking-product-switch-btn"
              onClick={() => setProductMenuOpen((open) => !open)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={productMenuOpen}
            >
              Switch
            </button>
            {productMenuOpen && (
              <div className="booking-product-menu" role="menu">
                {bookingExperiences
                  .filter((experience) => experience.id !== bookingExperience.id)
                  .map((experience) => {
                    const menuImage = experience.heroImg || experience.gallery?.[0]
                  const productType = experience.category === 'arcade' ? 'VR Game' : 'VR Show'
                    return (
                      <button
                        key={experience.id}
                        onClick={() => {
                          setProductMenuOpen(false)
                          onBookingExperienceChange(experience.id)
                        }}
                        type="button"
                        role="menuitem"
                      >
                        <span
                          className="booking-product-menu-thumb"
                          style={menuImage ? { backgroundImage: `url(${menuImage})` } : { background: experience.cardGradient }}
                          aria-hidden="true"
                        />
                      <span className="booking-product-menu-text">
                        <strong>{experience.title}</strong>
                        <span>{productType}</span>
                      </span>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HeaderCards({ fullDateDisplay, selectedDate, selectedTime, setStep, step, t }) {
  return (
    <div className="header-cards">
      <div className={`header-card ${step === 'date' ? 'active' : ''} ${selectedDate ? 'complete' : ''}`}>
        <div className="header-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </div>
        <div className="header-meta">
          <div className="meta-label">{t('selectedDate')}</div>
          <div className="meta-value">{selectedDate ? fullDateDisplay(selectedDate.date) : t('chooseDate')}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('date')} disabled={step === 'date'} type="button">
          {step === 'date' ? t('current') : t('edit')}
        </button>
      </div>
      <div className={`header-card ${step === 'time' ? 'active' : ''} ${selectedTime ? 'complete' : ''}`}>
        <div className="header-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <div className="header-meta">
          <div className="meta-label">{t('selectedTime')}</div>
          <div className="meta-value">{selectedTime ? selectedTime.time : t('chooseTime')}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('time')} disabled={!selectedDate || step === 'time'} type="button">
          {step === 'time' ? t('current') : t('edit')}
        </button>
      </div>
    </div>
  )
}

function DateStep({
  calendarMonth,
  canProceedDate,
  changeCalendarMonth,
  fullDateDisplay,
  monthDisplay,
  selectedDate,
  setSelectedDate,
  setStep,
  t,
  visibleDateGrid,
  weekdayLabels,
}) {
  return (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectDate')}</h3></div>
      <div className="month-bar">
        <button className="nav-arrow" onClick={() => changeCalendarMonth(-1)} type="button" aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="month-label">{monthDisplay(calendarMonth)}</div>
        <button className="nav-arrow" onClick={() => changeCalendarMonth(1)} type="button" aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="calendar">
        {weekdayLabels.map((day) => <div className="dow" key={day}>{day}</div>)}
        {visibleDateGrid.map((date) => (
          date.blank ? (
            <span key={date.key} className="day day-blank" aria-hidden="true" />
          ) : (
            <button
              key={date.key}
              className={`day ${date.disabled ? 'disabled' : ''} ${selectedDate?.key === date.key ? 'selected' : ''} ${badge(date.level)}`}
              disabled={date.disabled}
              onClick={() => setSelectedDate(date)}
              type="button"
              aria-pressed={selectedDate?.key === date.key}
              aria-label={date.price ? `${fullDateDisplay(date.date)}, ${currency(date.price)}` : `${fullDateDisplay(date.date)} ${t('unavailable')}`}
            >
              <span className="day-number">{date.day}</span>
              <span className="day-price">{date.price ? currency(date.price) : '-'}</span>
            </button>
          )
        ))}
      </div>
      <div className="actions"><button className="primary" disabled={!canProceedDate} onClick={() => setStep('time')} type="button">{t('next')}</button></div>
    </div>
  )
}

function TimeStep({
  availableSlots = [],
  availableSlotsLoaded = false,
  availableSlotsLoading = false,
  canProceedTime,
  experience,
  selectedDate,
  selectedTime,
  setSelectedTime,
  setStep,
  t,
}) {
  const backendSlots = availableSlots.map((slot) => {
    const time = slot.label || [slot.startTime, slot.endTime].filter(Boolean).join('-')
    const peak = selectedDate ? isDateTimePeak(selectedDate.date, time) : false
    const prices = experience ? (peak ? experience.peakPrices : experience.offPeakPrices) : {}
    return {
      id: slot.id,
      eventId: slot.eventId,
      time,
      label: slot.label || time,
      price: slot.price ?? prices.adult ?? 0,
      availableSeats: slot.availableSeats,
      peak,
      slotId: slot.id,
    }
  })
  const slots = availableSlotsLoading ? [] : backendSlots

  return (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectTime')}</h3></div>
      <div className="time-hint">{t('timeHint')}</div>
      <div className="slot-grid">
        {availableSlotsLoading && <div className="time-hint">Loading available times...</div>}
        {!availableSlotsLoading && availableSlotsLoaded && slots.length === 0 && (
          <div className="time-hint">No available times for this date.</div>
        )}
        {slots.map((slot) => {
          return (
            <button
              key={slot.id}
              className={`slot ${selectedTime?.time === slot.time ? 'selected' : ''} ${slot.peak ? 'peak' : ''}`}
              onClick={() => setSelectedTime(slot)}
              type="button"
            >
              <span className="slot-time">{slot.time}</span>
              <span className="slot-price">{currency(slot.price)}</span>
              {slot.availableSeats !== null && slot.availableSeats <= 5 && (
                <span className="slot-price">{slot.availableSeats} left</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('date')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedTime} onClick={() => setStep('tickets')} type="button">{t('next')}</button>
      </div>
    </div>
  )
}

function TicketsStep({
  canProceedTickets,
  changeCount,
  counts,
  localizedTicketTypes,
  rawCounts,
  setCounts,
  setRawCounts,
  setStep,
  setVipModal,
  t,
  totals,
}) {
  const invalidGroup = counts.group > 0 && counts.group < 6
  const invalidFamily = counts.family > 0 && counts.family < 3
  return (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectTickets')}</h3></div>
      <div className="ticket-list">
        {localizedTicketTypes.map((ticket) => (
          <div key={ticket.id} className="ticket-row">
            <div className="ticket-info">
              <div className="ticket-title-row">
                <div className="ticket-title">{ticket.label}</div>
                {ticket.info && (
                  <span className="ticket-info-popover">
                    <button className="ticket-info-badge" type="button" aria-label={`${ticket.label} information`}>i</button>
                    <span className="ticket-info-tooltip" role="tooltip">{ticket.info}</span>
                  </span>
                )}
              </div>
              <div className="ticket-desc">{ticket.description}</div>
            </div>
            <div className="ticket-actions">
              <div className="counter">
                <button onClick={() => changeCount(ticket.id, -1)} disabled={counts[ticket.id] === 0} type="button">-</button>
                <input
                  className="counter-value"
                  type="number"
                  min="0"
                  value={rawCounts[ticket.id] !== undefined ? rawCounts[ticket.id] : counts[ticket.id]}
                  onChange={(event) => {
                    const rawValue = event.target.value
                    const value = Math.max(0, parseInt(rawValue) || 0)
                    setRawCounts((previous) => ({ ...previous, [ticket.id]: rawValue }))
                    setCounts((previous) => ({ ...previous, [ticket.id]: value }))
                  }}
                  onBlur={(event) => {
                    const value = Math.max(0, parseInt(event.target.value) || 0)
                    setCounts((previous) => ({ ...previous, [ticket.id]: value }))
                    setRawCounts((previous) => { const next = { ...previous }; delete next[ticket.id]; return next })
                  }}
                />
                <button onClick={() => changeCount(ticket.id, 1)} type="button">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(invalidGroup || invalidFamily) && (
        <div className="ticket-validation-warning">
          {invalidGroup && <div>Group tickets require at least 6 tickets.</div>}
          {invalidFamily && <div>Family bundle requires at least 3 tickets.</div>}
        </div>
      )}
      <div className="summary-row"><div>{t('totalAmount')}</div><div className="summary-val">{currency(totals.ticketTotal)}</div></div>
      <div className="tickets-actions-row">
        <div className="actions" style={{ marginBottom: 0 }}>
          <button className="secondary" onClick={() => setStep('time')} type="button">{t('back')}</button>
          <button className="primary" disabled={!canProceedTickets} onClick={() => setVipModal(true)} type="button">{t('next')}</button>
        </div>
      </div>
    </div>
  )
}

function ContactStep({
  canProceedContact,
  contact,
  contactErrors,
  contactTouched,
  markContactTouched,
  reservationLoading,
  setContact,
  setStep,
  t,
  updateContact,
}) {
  return (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('contactDetails')}</h3></div>
      <div className="form-grid">
        <label className={contactTouched.first && contactErrors.first ? 'field-invalid' : ''}>
          <span>{t('firstName')}<span className="required-mark">*</span></span>
          <input type="text" placeholder={t('firstNamePlaceholder')} value={contact.first} onBlur={() => markContactTouched('first')} onChange={(event) => updateContact('first', event.target.value)} autoComplete="given-name" />
          {contactTouched.first && contactErrors.first && <small className="field-error">{contactErrors.first}</small>}
        </label>
        <label className={contactTouched.last && contactErrors.last ? 'field-invalid' : ''}>
          <span>{t('lastName')}<span className="required-mark">*</span></span>
          <input type="text" placeholder={t('lastNamePlaceholder')} value={contact.last} onBlur={() => markContactTouched('last')} onChange={(event) => updateContact('last', event.target.value)} autoComplete="family-name" />
          {contactTouched.last && contactErrors.last && <small className="field-error">{contactErrors.last}</small>}
        </label>
        <label className={contactTouched.email && contactErrors.email ? 'field-invalid' : ''}>
          <span>{t('email')}<span className="required-mark">*</span></span>
          <input type="email" placeholder={t('emailPlaceholder')} value={contact.email} onBlur={() => markContactTouched('email')} onChange={(event) => updateContact('email', event.target.value)} autoComplete="email" />
          {contactTouched.email && contactErrors.email ? <small className="field-error">{contactErrors.email}</small> : <small>{t('ticketsSent')}</small>}
        </label>
        <label className={contactTouched.phone && contactErrors.phone ? 'field-invalid' : ''}>
          <span>{t('phoneOptional')}</span>
          <input type="tel" placeholder={t('phonePlaceholder')} value={contact.phone} onBlur={() => markContactTouched('phone')} onChange={(event) => updateContact('phone', event.target.value)} autoComplete="tel" />
          {contactTouched.phone && contactErrors.phone && <small className="field-error">{contactErrors.phone}</small>}
        </label>
        <label className="checkbox"><input type="checkbox" checked={contact.optIn} onChange={(event) => setContact({ ...contact, optIn: event.target.checked })} /><span>{t('optIn')}</span></label>
      </div>
      <p className="policy-copy">{t('policyCopy')}</p>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('tickets')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedContact || reservationLoading} onClick={() => setStep('payment')} type="button">
          {reservationLoading ? 'Reserving...' : t('continuePayment')}
        </button>
      </div>
    </div>
  )
}

function PaymentStep({
  alphapayLoading,
  applyCoupon,
  bookingExperience,
  appliedCoupon,
  contact,
  counts,
  couponCode,
  couponMessage,
  fullDateDisplay,
  localizedTicketTypes,
  minutes,
  paymentExpired,
  restartBooking,
  seconds,
  selectedDate,
  selectedTime,
  setCouponCode,
  setCouponMessage,
  setAppliedCoupon,
  setStep,
  startAlphapayCheckout,
  startStripeCheckout,
  t,
  totals,
  vipQty,
}) {
  if (paymentExpired) {
    return (
      <div className="panel payment-panel">
        <div className="payment-expired-card">
          <div className="payment-expired-message">
            <span aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            </span>
            <p>{t('expired')}</p>
          </div>
          <button className="payment-start-over" onClick={restartBooking} type="button">{t('startOver')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="panel payment-panel">
      <div className="timer-banner">{t('completeWithin')} <strong>{minutes}:{seconds}</strong> {t('secureReservation')}</div>
      <div className="panel-title"><div className="title-accent" /><h3>{t('orderSummary')}</h3></div>
      <div className="order-block">
        <div className="order-date">
          <div className="order-label">{bookingExperience?.title || 'Selected experience'}</div>
          <div className="order-sub">{selectedDate ? fullDateDisplay(selectedDate.date) : t('dateTbd')} · {selectedTime?.time || selectedTime?.label}</div>
          <div className="order-sub">{t('duration')}</div>
        </div>
        <div className="line-items">
          {localizedTicketTypes.map((ticket) => counts[ticket.id] > 0 && (
            <div key={ticket.id} className="line">
              <div><div className="line-label">{ticket.label}</div><div className="line-price">{currency(ticket.price)}</div></div>
              <div className="line-qty">×{counts[ticket.id]}</div>
            </div>
          ))}
          {vipQty > 0 && <div className="line"><div><div className="line-label">{t('vipTitle')}</div><div className="line-price">{t('vipPrice')}</div></div><div className="line-qty">×{vipQty}</div></div>}
        </div>
        <div className="totals">
          <div className="totals-row"><span>{t('subtotal')}</span><span>{currency(totals.subtotal)}</span></div>
          {appliedCoupon && totals.couponDiscount > 0 && (
            <div className="totals-row coupon-discount-row">
              <span>Coupon discount ({appliedCoupon.code})</span>
              <span>-{currency(totals.couponDiscount)}</span>
            </div>
          )}
          <div className="totals-row fees-row">
            <span className="fees-label">
              {t('feesTaxes')}
              <span className="fees-info-wrap">
                <span className="fees-badge" aria-label="Fee breakdown">!</span>
                <span className="fees-tooltip">
                  <span className="fees-tooltip-row"><span>Processing fee</span><span>{currency(totals.processingFee)}</span></span>
                  <span className="fees-tooltip-row"><span>Tax (5%)</span><span>{currency(totals.tax)}</span></span>
                </span>
              </span>
            </span>
            <span>{currency(totals.fees)}</span>
          </div>
          <div className="totals-row due"><span>{t('totalDue')}</span><span>{currency(totals.grand)}</span></div>
        </div>
        <div className="warning">{t('warningNonRefund')}</div>
      </div>
      <div className="coupon-row">
        <input type="text" placeholder={t('couponCode')} value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponMessage(''); setAppliedCoupon(null) }} />
        <button className="coupon-btn" onClick={applyCoupon} type="button">{t('apply')}</button>
      </div>
      {couponMessage && <div className="coupon-message">{couponMessage}</div>}
      <div className="contact-summary">
        <div className="contact-head"><div>{t('contactDetailsLower')}</div><button className="link-btn" onClick={() => setStep('contact')} type="button">{t('edit')}</button></div>
        <div className="contact-cols">
          <div><div className="label">{t('firstName')}</div><div className="value">{contact.first || '—'}</div></div>
          <div><div className="label">{t('lastName')}</div><div className="value">{contact.last || '—'}</div></div>
          <div><div className="label">{t('email')}</div><div className="value">{contact.email || '—'}</div></div>
          <div><div className="label">{t('phoneOptional')}</div><div className="value">{contact.phone || '—'}</div></div>
        </div>
      </div>
      <div className="pay-options">
        <button className="pay-btn stripe" onClick={startStripeCheckout} disabled={paymentExpired} type="button">
          <span className="stripe-word" aria-hidden="true">stripe</span>
          <span className="stripe-card-line">
            <span className="pay-icon card-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="currentColor" width="22" height="22"><rect x="2" y="7" width="28" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="2" y="12" width="28" height="5" fill="currentColor" opacity="0.35"/><rect x="6" y="20" width="6" height="2" rx="1" fill="currentColor"/></svg>
            </span>
            <span>{t('creditCard')}</span>
          </span>
        </button>
        <button className="pay-btn wechat" onClick={() => startAlphapayCheckout('wechat')} disabled={alphapayLoading || paymentExpired} type="button">
          <span className="pay-icon wechat-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M13.2 7.2C6.9 7.2 2 11.1 2 16.1c0 2.8 1.6 5.2 4 6.8l-.8 3 3.5-1.7c1.3.5 2.8.8 4.5.8.8 0 1.6-.1 2.4-.2-.4-1-.6-2-.6-3.1 0-4.4 4.2-8 9.6-8.5-1.5-3.5-5.9-6-11.4-6z"/><path d="M25 15.1c-4.2 0-7.6 2.8-7.6 6.3s3.4 6.3 7.6 6.3c1 0 2-.2 2.9-.5l2.5 1.2-.6-2.1c1.4-1.1 2.2-2.8 2.2-4.8 0-3.6-3.4-6.4-7-6.4z"/></svg>
          </span>
          <span>WeChat Pay</span>
        </button>
        <button className="pay-btn alipay" onClick={() => startAlphapayCheckout('alipay')} disabled={alphapayLoading || paymentExpired} type="button">
          <span className="pay-icon alipay-icon" aria-hidden="true">支</span>
          <span>Alipay</span>
        </button>
      </div>
    </div>
  )
}

export default BookingPage
