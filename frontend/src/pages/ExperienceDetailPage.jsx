import { useEffect, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import HeaderActions from '../components/HeaderActions'
import { allExperiences } from '../data/experiences'

/* ── Helpers ── */
function Stars({ rating, size = 14 }) {
  return (
    <span className="exp2-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24"
          fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

/* ── Video Modal ── */
function VideoModal({ src, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="exp2-modal-overlay" onClick={onClose}>
      <div className="exp2-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="exp2-modal-close" onClick={onClose} type="button" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <video controls autoPlay className="exp2-modal-video">
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

/* ── Lightbox ── */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [images.length, onClose])
  return (
    <div className="exp2-lightbox-overlay" onClick={onClose}>
      <div className="exp2-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="exp2-lb-close" onClick={onClose} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button className="exp2-lb-nav exp2-lb-prev" onClick={prev} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <img src={images[idx]} alt="" className="exp2-lb-img" />
        <button className="exp2-lb-nav exp2-lb-next" onClick={next} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div className="exp2-lb-counter">{idx + 1} / {images.length}</div>
      </div>
    </div>
  )
}

/* ── Booking Widget ── */
function BookingWidget({ experience, onBuyTicket }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const TIME_SLOTS = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM']
  const prices = experience.offPeakPrices || {}
  const TICKET_TYPES = [
    { id: 'adult',  label: 'Adult',  desc: 'Ages 18+', price: prices.adult ?? 37.95 },
    { id: 'child',  label: 'Child',  desc: `Ages ${experience.minAge}–17`, price: prices.child ?? 27.95 },
    { id: 'senior', label: 'Senior', desc: '65+ years', price: prices.senior ?? 34.95 },
    { id: 'group',  label: 'Group',  desc: '6+ guests', price: prices.group ?? 32.95 },
    { id: 'family', label: 'Family', desc: '3+ family bundle', price: prices.family ?? 31.95 },
  ]

  const [selDay, setSelDay] = useState(0)
  const [selTime, setSelTime] = useState(null)
  const [qty, setQty] = useState(() => TICKET_TYPES.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {}))

  const totalQty = Object.values(qty).reduce((s, n) => s + n, 0)
  const totalPrice = TICKET_TYPES.reduce((s, t) => s + qty[t.id] * t.price, 0)
  const changeQty = (id, delta) => setQty((p) => ({ ...p, [id]: Math.max(0, p[id] + delta) }))

  return (
    <div className="bw-widget">
      <div className="bw-inner">
        <div className="bw-head">Select date &amp; session</div>
        <div className="bw-no-fee">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          No booking fees
        </div>

        {/* Day picker */}
        <div className="bw-days-scroll">
          {days.map((d, i) => (
            <button
              key={i}
              className={`bw-day-btn ${selDay === i ? 'bw-day-sel' : ''}`}
              onClick={() => setSelDay(i)}
              type="button"
            >
              <span className="bw-day-label">{DAY_LABELS[d.getDay()]}</span>
              <span className="bw-day-num">{d.getDate()}</span>
              <span className="bw-day-month">{MONTH_LABELS[d.getMonth()]}</span>
            </button>
          ))}
        </div>

        {/* Time slots */}
        <div className="bw-time-grid">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              className={`bw-time-btn ${selTime === t ? 'bw-time-sel' : ''}`}
              onClick={() => setSelTime((prev) => (prev === t ? null : t))}
              type="button"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Ticket types */}
        <div className="bw-tickets">
          {TICKET_TYPES.map((ticket) => (
            <div key={ticket.id} className="bw-ticket-row">
              <div className="bw-ticket-info">
                <span className="bw-ticket-label">{ticket.label}</span>
                <span className="bw-ticket-desc">{ticket.desc}</span>
              </div>
              <div className="bw-ticket-right">
                <span className="bw-ticket-price">${ticket.price.toFixed(2)}</span>
                <div className="bw-qty">
                  <button className="bw-qty-btn" onClick={() => changeQty(ticket.id, -1)} disabled={qty[ticket.id] === 0} type="button">−</button>
                  <span className="bw-qty-num">{qty[ticket.id]}</span>
                  <button className="bw-qty-btn" onClick={() => changeQty(ticket.id, 1)} type="button">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        {totalQty > 0 && (
          <div className="bw-total">
            <span>{totalQty} ticket{totalQty !== 1 ? 's' : ''}</span>
            <span className="bw-total-price">${totalPrice.toFixed(2)}</span>
          </div>
        )}

        {/* CTA */}
        <button
          className="bw-cta"
          onClick={() => onBuyTicket(experience)}
          type="button"
        >
          {totalQty > 0
            ? `$${totalPrice.toFixed(2)} — Buy Tickets`
            : 'Buy Tickets'}
        </button>
      </div>
    </div>
  )
}

/* ── Mini Experience Card (for Similar Experiences) ── */
function MiniExpCard({ exp, onSelect }) {
  return (
    <div className="exp2-mini-card" onClick={() => onSelect(exp)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(exp) }}>
      <div className="exp2-mini-img-wrap">
        {exp.heroImg
          ? <div className="exp2-mini-img" style={{ backgroundImage: `url(${exp.heroImg})` }} />
          : <div className="exp2-mini-img" style={{ background: exp.cardGradient }} />}
      </div>
      <div className="exp2-mini-body">
        <div className="exp2-mini-meta">⏱ {exp.duration} min · Ages {exp.minAge}+</div>
        <div className="exp2-mini-title">{exp.title}</div>
        <div className="exp2-mini-price">From <strong>${exp.priceFrom.toFixed(2)}</strong></div>
      </div>
    </div>
  )
}

/* ── Main Component ── */
function ExperienceDetailPage({
  experience,
  onBack,
  onBuyTicket,
  onSelectExperience,
  authReady,
  cartCount,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenCart,
  onOpenNav,
  renderLangSelect,
  t,
}) {
  const [showVideo, setShowVideo] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [showAllGallery, setShowAllGallery] = useState(false)

  const similar = allExperiences.filter((e) => e.id !== experience.id)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [experience.id])

  const gallery = experience.gallery
  const mainImg = experience.heroImg || null
  const gridImgs = gallery.slice(0, 4)

  return (
    <div className="exp2-page">
      {/* ── Topbar ── */}
      <header className="exp2-topbar">
        <button className="exp2-back-btn" onClick={onBack} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          All Experiences
        </button>
        <button className="exp2-logo-btn" onClick={onBack} type="button">
          <BrandLogo height={44} />
        </button>
        <HeaderActions
          authReady={authReady}
          cartCount={cartCount}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenAuth={onOpenAuth}
          onOpenCart={onOpenCart}
          onOpenNav={onOpenNav}
          renderLangSelect={renderLangSelect}
          t={t}
        />
      </header>

      {/* ── Photo Grid ── */}
      <div className="exp2-photo-grid">
        {/* Main image */}
        <button
          className="exp2-photo-main"
          onClick={() => experience.demoVideo ? setShowVideo(true) : setLightboxIdx(0)}
          type="button"
          aria-label="Play demo video"
        >
          {mainImg
            ? <div className="exp2-photo-fill" style={{ backgroundImage: `url(${mainImg})` }} />
            : <div className="exp2-photo-fill exp2-photo-gradient" style={{ background: experience.cardGradient }} />}
          <div className="exp2-photo-overlay" />
          {experience.demoVideo && (
            <div className="exp2-play-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          )}
        </button>

        {/* Mini grid */}
        <div className="exp2-photo-mini-grid">
          {gridImgs.map((src, i) => (
            <button
              key={i}
              className="exp2-photo-mini"
              onClick={() => setLightboxIdx(i)}
              type="button"
              aria-label={`Photo ${i + 1}`}
            >
              <div className="exp2-photo-fill" style={{ backgroundImage: `url(${src})` }} />
              {i === 3 && gallery.length > 4 && (
                <div className="exp2-photo-more-overlay">
                  +{gallery.length - 4} photos
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Gallery button */}
        <button className="exp2-gallery-btn" onClick={() => setLightboxIdx(0)} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Gallery
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="exp2-layout">
        {/* ── LEFT: Main content ── */}
        <div className="exp2-main-col">

          {/* Title section */}
          <div className="exp2-title-section exp2-reveal">
            <div className="exp2-badges-row">
              {experience.featured && <span className="exp2-badge-pill exp2-badge-featured">Featured</span>}
              <span className="exp2-badge-pill" style={{ color: experience.accent, background: `${experience.accent}14`, borderColor: `${experience.accent}30` }}>
                {experience.badge}
              </span>
            </div>
            <h1 className="exp2-title">{experience.title}</h1>
            <p className="exp2-subtitle">{experience.subtitle}</p>
            <div className="exp2-rating-row">
              <Stars rating={experience.rating} size={16} />
              <strong>{experience.rating}</strong>
              <span className="exp2-review-count">({experience.reviewCount} reviews)</span>
              <span className="exp2-dot">·</span>
              <span className="exp2-tagline">{experience.tagline}</span>
            </div>
          </div>

          {/* About */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">About this experience</h2>
            <p className="exp2-description">{experience.description}</p>
            <p className="exp2-description exp2-desc-long">{experience.longDescription}</p>
          </section>

          {/* General Info */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">General Info</h2>
            <ul className="exp2-info-list">
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <strong>Duration:</strong> {experience.duration} minutes — {experience.difficulty} intensity
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <strong>Minimum age:</strong> {experience.minAge} years old
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <strong>Group size:</strong> {experience.groupSize} people per session
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <strong>Language:</strong> {experience.languages.join(' · ')}
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <strong>Venue:</strong> Lansdowne Centre · Unit 210-5300 No.3 Rd, Richmond BC
              </li>
              <li>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <strong>Hours:</strong> Sun–Thu 10 AM–9 PM · Fri–Sat 10 AM–10 PM
              </li>
            </ul>
          </section>

          {/* Highlights */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">Highlights</h2>
            <div className="exp2-highlights-grid">
              {experience.highlights.map((h) => (
                <div key={h} className="exp2-highlight-card">
                  <div className="exp2-highlight-dot" style={{ background: experience.accent }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </section>

          {/* What to expect */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">What to expect</h2>
            <div className="exp2-expect-grid">
              {experience.whatToExpect.map((item) => (
                <div key={item.label} className="exp2-expect-card">
                  <span className="exp2-expect-icon">{item.icon}</span>
                  <div>
                    <div className="exp2-expect-label">{item.label}</div>
                    <div className="exp2-expect-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Your journey timeline */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">Your journey</h2>
            <div className="exp2-timeline">
              {[
                { step: '01', title: 'Arrive & check in', desc: 'Arrive 5–10 minutes early. Our team will greet you and confirm your booking at the front desk.' },
                { step: '02', title: 'VR headset briefing', desc: 'One of our VR guides walks you through the headset, controls, and safety — no experience needed.' },
                { step: '03', title: `Dive into ${experience.title}`, desc: `${experience.duration} minutes of pure, uninterrupted immersion. ${experience.tagline}.` },
                { step: '04', title: 'Debrief & share', desc: 'Relive your favourite moments, grab photos outside, and share your experience with friends.' },
              ].map((item) => (
                <div key={item.step} className="exp2-timeline-row">
                  <div className="exp2-timeline-step" style={{ color: experience.accent, borderColor: `${experience.accent}30` }}>{item.step}</div>
                  <div>
                    <div className="exp2-timeline-title">{item.title}</div>
                    <div className="exp2-timeline-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Practical info */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">Practical info</h2>
            <div className="exp2-practical-grid">
              {experience.practicalInfo.map((item) => (
                <div key={item.label} className="exp2-practical-row">
                  <span className="exp2-practical-label">{item.label}</span>
                  <span className="exp2-practical-value">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery strip */}
          <section className="exp2-section exp2-reveal">
            <div className="exp2-section-head-row">
              <h2 className="exp2-section-h">Gallery</h2>
              <button className="exp2-see-all-btn" onClick={() => setShowAllGallery((value) => !value)} type="button">
                {showAllGallery ? 'Show fewer' : 'See all photos'}
              </button>
            </div>
            <div className="exp2-gallery-strip">
              {(showAllGallery ? gallery : gallery.slice(0, 4)).map((src, i) => (
                <button key={i} className="exp2-gallery-thumb" onClick={() => setLightboxIdx(i)} type="button">
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">User reviews</h2>
            <div className="exp2-rating-summary">
              <span className="exp2-big-rating">{experience.rating}</span>
              <div>
                <Stars rating={experience.rating} size={18} />
                <div className="exp2-rating-based">Based on {experience.reviewCount} reviews</div>
              </div>
            </div>
            <div className="exp2-review-scroll">
              {experience.reviews.map((r) => (
                <div key={r.name} className="exp2-review-card">
                  <div className="exp2-review-head">
                    <img src={r.img} alt={r.name} className="exp2-review-avatar" />
                    <div>
                      <div className="exp2-review-name">{r.name}</div>
                      <Stars rating={r.rating} size={13} />
                    </div>
                  </div>
                  <p className="exp2-review-text">"{r.quote}"</p>
                </div>
              ))}
            </div>
          </section>

          {/* Need help */}
          <section className="exp2-section exp2-reveal exp2-help-section">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <div className="exp2-help-title">Need help?</div>
              <div className="exp2-help-desc">Contact our team at <a href="mailto:info@vrvr.show">info@vrvr.show</a> or call <a href="tel:+17788054699">(778) 805-4699</a></div>
            </div>
          </section>

          {/* Similar experiences */}
          <section className="exp2-section exp2-reveal">
            <h2 className="exp2-section-h">Similar experiences</h2>
            <div className="exp2-similar-grid">
              {similar.map((exp) => (
                <MiniExpCard key={exp.id} exp={exp} onSelect={onSelectExperience ?? onBack} />
              ))}
            </div>
          </section>
        </div>

        {/* ── RIGHT: Booking Widget ── */}
        <div className="exp2-sidebar-col">
          <div className="exp2-widget-sticky">
            <BookingWidget experience={experience} onBuyTicket={onBuyTicket} />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showVideo && <VideoModal src={experience.demoVideo} onClose={() => setShowVideo(false)} />}
      {lightboxIdx !== null && <Lightbox images={gallery} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
    </div>
  )
}

export default ExperienceDetailPage
