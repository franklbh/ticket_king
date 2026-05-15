import {
  ALL_TIME_SLOTS,
  OFF_PEAK_PRICES,
  PEAK_PRICES,
  isDateTimePeak,
} from '../data/showData'
import { badge, currency } from '../utils/format'

function BookingPage({
  alphapayLoading,
  applyCoupon,
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
  handleAddToCart,
  localizedTicketTypes,
  markContactTouched,
  minutes,
  monthDisplay,
  paymentExpired,
  rawCounts,
  restartBooking,
  seconds,
  selectedDate,
  selectedTime,
  setContact,
  setCounts,
  setCouponCode,
  setCouponMessage,
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
      <BookingHero bookingSteps={bookingSteps} currentStepIndex={currentStepIndex} t={t} />
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
          contact={contact}
          counts={counts}
          couponCode={couponCode}
          couponMessage={couponMessage}
          fullDateDisplay={fullDateDisplay}
          handleAddToCart={handleAddToCart}
          localizedTicketTypes={localizedTicketTypes}
          minutes={minutes}
          paymentExpired={paymentExpired}
          restartBooking={restartBooking}
          seconds={seconds}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          setCouponCode={setCouponCode}
          setCouponMessage={setCouponMessage}
          setStep={setStep}
          startAlphapayCheckout={startAlphapayCheckout}
          startStripeCheckout={startStripeCheckout}
          t={t}
          totals={totals}
          vipQty={vipQty}
        />
      )}
    </div>
  )
}

function BookingHero({ bookingSteps, currentStepIndex, t }) {
  return (
    <div className="booking-hero">
      <div>
        <p className="booking-eyebrow">{t('secureCheckout')}</p>
        <h2>{t('reserveVisit')}</h2>
      </div>
      <div className="booking-stepper" aria-label="Booking progress">
        {bookingSteps.map((item, index) => (
          <div
            key={item.id}
            className={`booking-step ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'done' : ''}`}
          >
            <span className="booking-step-dot">{index + 1}</span>
            <span className="booking-step-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeaderCards({ fullDateDisplay, selectedDate, selectedTime, setStep, step, t }) {
  return (
    <div className="header-cards">
      <div className={`header-card ${step === 'date' ? 'active' : ''} ${selectedDate ? 'complete' : ''}`}>
        <div className="header-icon">📅</div>
        <div className="header-meta">
          <div className="meta-label">{t('selectedDate')}</div>
          <div className="meta-value">{selectedDate ? fullDateDisplay(selectedDate.date) : t('chooseDate')}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('date')} disabled={step === 'date'} type="button">
          {step === 'date' ? t('current') : t('edit')}
        </button>
      </div>
      <div className={`header-card ${step === 'time' ? 'active' : ''} ${selectedTime ? 'complete' : ''}`}>
        <div className="header-icon">🕐</div>
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

function TimeStep({ canProceedTime, selectedDate, selectedTime, setSelectedTime, setStep, t }) {
  return (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectTime')}</h3></div>
      <div className="time-hint">{t('timeHint')}</div>
      <div className="slot-grid">
        {ALL_TIME_SLOTS.map((time) => {
          const peak = selectedDate ? isDateTimePeak(selectedDate.date, time) : false
          const slotPrice = (peak ? PEAK_PRICES : OFF_PEAK_PRICES).adult
          return (
            <button
              key={time}
              className={`slot ${selectedTime?.time === time ? 'selected' : ''} ${peak ? 'peak' : ''}`}
              onClick={() => setSelectedTime({ time, price: slotPrice })}
              type="button"
            >
              <span className="slot-time">{time}</span>
              <span className="slot-price">{currency(slotPrice)}</span>
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
                  onChange={(event) => setRawCounts((previous) => ({ ...previous, [ticket.id]: event.target.value }))}
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
      <div className="summary-row"><div>{t('totalAmount')}</div><div className="summary-val">{currency(totals.ticketTotal)}</div></div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('time')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedTickets} onClick={() => setVipModal(true)} type="button">{t('next')}</button>
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
        <button className="primary" disabled={!canProceedContact} onClick={() => setStep('payment')} type="button">{t('continuePayment')}</button>
      </div>
    </div>
  )
}

function PaymentStep({
  alphapayLoading,
  applyCoupon,
  contact,
  counts,
  couponCode,
  couponMessage,
  fullDateDisplay,
  handleAddToCart,
  localizedTicketTypes,
  minutes,
  paymentExpired,
  restartBooking,
  seconds,
  selectedDate,
  selectedTime,
  setCouponCode,
  setCouponMessage,
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
          <div className="payment-expired-message"><span aria-hidden="true">⚠️</span><p>{t('expired')}</p></div>
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
        <div className="order-date"><div className="order-label">{selectedDate ? fullDateDisplay(selectedDate.date) : t('dateTbd')} · {selectedTime?.time}</div><div className="order-sub">{t('duration')}</div></div>
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
        <input type="text" placeholder={t('couponCode')} value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponMessage('') }} />
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
      <button
        className="add-to-cart-btn"
        onClick={handleAddToCart}
        disabled={totals.numTickets === 0 || paymentExpired}
        type="button"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Add to Cart
      </button>
      <div className="pay-options">
        <button className="pay-btn stripe" onClick={startStripeCheckout} disabled={paymentExpired} type="button">
          <span className="pay-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="currentColor" width="22" height="22"><rect x="2" y="7" width="28" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="2" y="12" width="28" height="5" fill="currentColor" opacity="0.35"/><rect x="6" y="20" width="6" height="2" rx="1" fill="currentColor"/></svg>
          </span>
          <span>{t('creditCard')}</span>
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
