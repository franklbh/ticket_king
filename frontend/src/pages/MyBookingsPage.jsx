import { useEffect, useMemo, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import HeaderActions from '../components/HeaderActions'
import { getDisplayName } from '../api/auth'

function MyBookingsPage({
  authReady,
  cartCount,
  currentUser,
  experiences = [],
  initialSection = 'bookings',
  onGoHome,
  onLogout,
  onOpenAuth,
  onOpenCart,
  onOpenNav,
  onVisitContact,
  onVisitFaq,
  renderLangSelect,
  t,
}) {
  const [section, setSection] = useState('bookings')
  const [bookingFilter, setBookingFilter] = useState('upcoming')
  const name = currentUser ? getDisplayName(currentUser) : t('guest')
  const email = currentUser?.email || t('authTitle')
  const bookings = useMemo(() => buildDemoBookings(experiences, t), [experiences, t])
  const upcoming = bookings.filter((booking) => booking.status === 'upcoming')
  const past = bookings.filter((booking) => booking.status === 'past')
  const visibleBookings = bookingFilter === 'past' ? past : bookingFilter === 'all' ? bookings : upcoming

  useEffect(() => {
    setSection(initialSection === 'account' ? 'account' : 'bookings')
  }, [initialSection])

  const showBookings = (filter = 'upcoming') => {
    setSection('bookings')
    setBookingFilter(filter)
  }

  return (
    <div className="mb-page">
      <header className="mb-nav">
        <button className="mb-logo-btn" onClick={onGoHome} type="button">
          <BrandLogo height={62} />
        </button>
        <HeaderActions
          authReady={authReady}
          cartCount={cartCount}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenAuth={onOpenAuth}
          onOpenBookings={() => {}}
          onOpenCart={onOpenCart}
          onOpenNav={onOpenNav}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      </header>

      <div className="mb-shell">
        <aside className="mb-sidebar">
          <button className="mb-back-main" onClick={onGoHome} type="button">← {t('mainPageShort')}</button>
          <div className="mb-profile">
            <div className="mb-avatar">{name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{name}</strong>
              <span>{email}</span>
              <button type="button">{t('viewProfile')}</button>
            </div>
          </div>

          <nav className="mb-side-nav" aria-label={t('accountNavigation')}>
            <button className={section === 'bookings' && bookingFilter === 'all' ? 'active' : ''} onClick={() => showBookings('all')} type="button"><CalendarIcon /> {t('myBookingsTitle')}</button>
            <button className={section === 'bookings' && bookingFilter === 'upcoming' ? 'active' : ''} onClick={() => showBookings('upcoming')} type="button"><CalendarIcon /> {t('upcoming')}</button>
            <button className={section === 'bookings' && bookingFilter === 'past' ? 'active' : ''} onClick={() => showBookings('past')} type="button"><HistoryIcon /> {t('past')}</button>
            <div className="mb-side-rule" />
            <button className={section === 'account' ? 'active' : ''} onClick={() => setSection('account')} type="button"><UserIcon /> {t('accountDetails')}</button>
            <button className="danger" onClick={onLogout} type="button"><LogoutIcon /> {t('logout')}</button>
          </nav>
        </aside>

        <main className="mb-main">
          {section === 'account' ? (
            <AccountDetails name={name} email={email} t={t} />
          ) : (
            <>
              <section className="mb-heading">
                <div>
                  <h1>{t('myBookingsTitle')}</h1>
                  <p>{t('myBookingsCopy')}</p>
                </div>
              </section>

              <div className="mb-tabs" role="tablist" aria-label={t('bookingStatus')}>
                <button className={bookingFilter === 'upcoming' ? 'active' : ''} onClick={() => setBookingFilter('upcoming')} type="button">{t('upcoming')} ({upcoming.length})</button>
                <button className={bookingFilter === 'past' ? 'active' : ''} onClick={() => setBookingFilter('past')} type="button">{t('past')} ({past.length})</button>
                <button className={bookingFilter === 'all' ? 'active' : ''} onClick={() => setBookingFilter('all')} type="button">{t('allBookings')} ({bookings.length})</button>
              </div>

              <section className="mb-booking-list" aria-label={t('bookings')}>
                {visibleBookings.map((booking) => (
                  <BookingCard
                    booking={booking}
                    key={booking.id}
                    primaryAction={booking.status === 'past' ? t('viewReceipt') : t('viewTickets')}
                    statusLabel={booking.status === 'past' ? t('completed') : t('upcoming')}
                    t={t}
                  />
                ))}
              </section>
            </>
          )}
        </main>

        <aside className="mb-help">
          <h2>{t('needHelp')}</h2>
          <HelpItem action={onVisitFaq} icon={<QuestionIcon />} title={t('visitFaq')} text={t('faqHelpText')} />
          <HelpItem action={onVisitContact} icon={<MessageIcon />} title={t('contactSupport')} text={t('supportHelpText')} />
        </aside>
      </div>
    </div>
  )
}

function AccountDetails({ email, name, t }) {
  const [first = '', ...rest] = name.split(' ')
  const last = rest.join(' ')

  return (
    <section className="mb-account-page">
      <div className="mb-heading">
        <div>
          <h1>{t('accountDetails')}</h1>
          <p>{t('accountDetailsCopy')}</p>
        </div>
      </div>
      <div className="mb-account-grid">
        <form className="mb-account-card">
          <div className="mb-account-two">
            <label>{t('firstName')}<input defaultValue={first} /></label>
            <label>{t('lastName')}<input defaultValue={last} /></label>
          </div>
          <label>{t('emailAddress')}<input defaultValue={email} type="email" /></label>
          <label>
            {t('phoneNumber')}
            <div className="mb-phone-row">
              <button type="button">🇨🇦 +1</button>
              <input defaultValue="778 123 4567" type="tel" />
            </div>
          </label>
          <div className="mb-account-actions">
            <button className="secondary" type="button">{t('changePassword')}</button>
            <button type="button">{t('saveChanges')}</button>
          </div>
        </form>
        <aside className="mb-security-card">
          <h2>{t('accountSecurity')}</h2>
          <p>{t('accountSecurityCopy')}</p>
          <strong>{t('password')}</strong>
          <span>{t('passwordMasked')}</span>
          <small>{t('lastChanged')}</small>
          <button type="button">{t('changePassword')}</button>
        </aside>
      </div>
    </section>
  )
}

function BookingCard({ booking, primaryAction, statusLabel, t }) {
  return (
    <article className="mb-booking-card">
      <div className="mb-booking-img" style={{ backgroundImage: `url(${booking.image})` }}>
        <span className={booking.category === 'arcade' ? 'game' : 'show'}>{booking.category === 'arcade' ? t('vrGames') : t('vrShows')}</span>
      </div>
      <div className="mb-booking-body">
        <div className="mb-booking-title-row">
          <h2>{booking.title}</h2>
          <span className={`mb-status ${booking.status}`}>{statusLabel}</span>
        </div>
        <div className="mb-booking-meta">
          <span><CalendarIcon /> {booking.date}</span>
          <span><ClockIcon /> {booking.time} ({booking.duration} {t('minuteShort')})</span>
          <span><PinIcon /> {t('venueRichmond')}</span>
          <span><TicketIcon /> {t('ticketCount', { count: booking.tickets })}</span>
          <span><ReceiptIcon /> {t('bookingId')}: {booking.id}</span>
        </div>
      </div>
      <div className="mb-booking-actions">
        <button type="button">{primaryAction}</button>
      </div>
    </article>
  )
}

function HelpItem({ action, icon, text, title }) {
  return (
    <button className="mb-help-item" onClick={action} type="button">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </button>
  )
}

function buildDemoBookings(experiences, t) {
  const fallback = []
  const byId = (id, index = 0) => experiences.find((item) => item.id === id) || experiences[index] || {}
  const source = [
    { id: 'VR-2026-0518-000123', experienceId: 'terracotta-warriors', date: t('bookingDateMay20'), time: '20:30 - 21:15', tickets: 2, status: 'upcoming' },
    { id: 'VR-2026-0518-000124', experienceId: 'dragon', date: t('bookingDateMay22'), time: '11:30 - 12:15', tickets: 2, status: 'upcoming' },
    { id: 'VR-2026-0510-000098', experienceId: 'cyber-arena', date: t('bookingDateMay18'), time: '14:00 - 14:45', tickets: 2, status: 'past' },
  ]
  return source.map((booking, index) => {
    const experience = byId(booking.experienceId, index)
    return {
      ...booking,
      category: experience.category,
      duration: experience.duration || 45,
      image: experience.heroImg || experience.gallery?.[0],
      title: experience.title || fallback[index]?.title || t('vrExperience'),
    }
  })
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" /><path d="M12 10.5h.01" /></svg>
}

function TicketIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3Z" /></svg>
}

function ReceiptIcon() {
  return <svg viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-1.3V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 12h6" /></svg>
}

function UserIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" /><path d="M12 7v5l4 2" /></svg>
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
}

function QuestionIcon() {
  return <svg viewBox="0 0 24 24"><path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1.4-2.4 1.8-2.7 3.4M12 17h.01" /><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
}

function MessageIcon() {
  return <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /></svg>
}

export default MyBookingsPage
