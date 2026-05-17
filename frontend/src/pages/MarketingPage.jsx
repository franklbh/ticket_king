import { useEffect, useRef, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import HeaderActions from '../components/HeaderActions'
import { GOOGLE_MAPS_URL } from '../constants/venue'
import { mapInstructionPdf } from '../data/showData'
/* ── Experience Card ── */
function ExperienceCard({ exp, onSelect, onBook, t }) {
  return (
    <div
      className="vr-exp-card"
      onClick={() => onSelect(exp)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(exp) }}
      aria-label={`View details for ${exp.title}`}
    >
      {/* Image */}
      <div className="vr-card-img-wrap">
        {exp.heroImg
          ? <div className="vr-card-img" style={{ backgroundImage: `url(${exp.heroImg})` }} />
          : <div className="vr-card-img" style={{ background: exp.cardGradient }}><div className="vr-card-placeholder-glow" style={{ background: exp.accent }} /></div>}

        {exp.featured && <span className="vr-card-featured-pill">{t('featured')}</span>}

        <div className="vr-card-play-overlay">
          <span className="vr-card-play-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
          {t('watchDemo')}
        </div>
        <div className="vr-card-hover-shine" />
      </div>

      {/* Text */}
      <div className="vr-card-text">
        <div className="vr-card-top-meta">
          <span className="vr-card-type-tag">{exp.category === 'arcade' ? t('arcade') : 'VR'} · {exp.duration} min</span>
          <span className="vr-card-rating-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {exp.rating} <span className="vr-card-review-ct">({exp.reviewCount})</span>
          </span>
        </div>
        <h3 className="vr-card-title">{exp.title}</h3>
        <p className="vr-card-subtitle">{exp.subtitle}</p>
        <div className="vr-card-info-row">
          <span>{t('agesMin', { min: exp.minAge })}</span>
          <span className="vr-dot">·</span>
          <span>{exp.groupSize} {t('people')}</span>
          <span className="vr-dot">·</span>
          <span>{exp.difficulty}</span>
        </div>
        <div className="vr-card-footer">
          <div className="vr-card-price">
            {t('from')} <strong>${exp.priceFrom.toFixed(2)}</strong><span>{t('perPerson')}</span>
          </div>
          <button
            className="vr-card-book-btn"
            onClick={(e) => { e.stopPropagation(); onBook(exp) }}
            type="button"
            style={{ '--btn-accent': exp.accent }}
          >
            {t('bookNow')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function MarketingPage({
  authReady,
  cartCount,
  currentUser,
  faqOpen,
  localizedExperiences,
  localizedFaqItems,
  localizedNewsItems,
  newsletterEmail,
  newsletterMessage,
  onBuyTicket,
  onGoHome,
  onLogout,
  onOpenAuth,
  onOpenBookings,
  onOpenCart,
  onOpenMap,
  onOpenNav,
  onSelectExperience,
  renderLangSelect,
  setFaqOpen,
  setNewsletterEmail,
  setNewsletterMessage,
  submitNewsletter,
  t,
}) {
  const experiencesRef = useRef(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroTimerResetKey, setHeroTimerResetKey] = useState(0)
  const heroCount = localizedExperiences?.length || 6
  const activeHero = (localizedExperiences || [])[heroIndex] || (localizedExperiences || [])[0] || {}
  const resetHeroTimer = () => setHeroTimerResetKey((key) => key + 1)
  const goToHero = (index) => {
    setHeroIndex(index)
    resetHeroTimer()
  }
  const goToPreviousHero = () => {
    setHeroIndex((index) => (index - 1 + heroCount) % heroCount)
    resetHeroTimer()
  }
  const goToNextHero = () => {
    setHeroIndex((index) => (index + 1) % heroCount)
    resetHeroTimer()
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroCount)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [heroCount, heroTimerResetKey])

  return (
    <div className="mkt-page">

      {/* ── Sticky Nav ── */}
      <header className="mkt-nav">
        <button className="mkt-logo-btn" onClick={onGoHome} type="button">
          <BrandLogo height={60} />
        </button>
        <div className="mkt-nav-actions">
          <HeaderActions
            authReady={authReady}
            cartCount={cartCount}
            currentUser={currentUser}
            onLogout={onLogout}
            onOpenAuth={onOpenAuth}
            onOpenBookings={onOpenBookings}
            onOpenCart={onOpenCart}
            onOpenNav={onOpenNav}
            renderLangSelect={renderLangSelect}
            t={t}
          />
        </div>
      </header>

      {/* ── Compact Hero ── */}
      <section className="mkt-hero">
        {(localizedExperiences || []).map((exp, index) => {
          const heroSrc = exp.heroImg || exp.gallery?.[0]
          return (
            <div
              key={exp.id}
              className={`mkt-hero-slide ${index === heroIndex ? 'active' : ''}`}
              style={{ backgroundImage: heroSrc ? `url(${heroSrc})` : undefined, background: heroSrc ? undefined : exp.cardGradient }}
              aria-hidden={index !== heroIndex}
            />
          )
        })}
        <div className="mkt-hero-gradient" />
        <button
          className="mkt-hero-nav mkt-hero-nav-prev"
          onClick={goToPreviousHero}
          type="button"
          aria-label="Previous featured experience"
        >
          ‹
        </button>
        <button
          className="mkt-hero-nav mkt-hero-nav-next"
          onClick={goToNextHero}
          type="button"
          aria-label="Next featured experience"
        >
          ›
        </button>
        <div className="mkt-hero-inner">
          <span className="mkt-hero-eyebrow">We Are VR</span>
          <h1 className="mkt-hero-h1">{activeHero.title}</h1>
          <p className="mkt-hero-sub">
            {activeHero.tagline}. {activeHero.duration} minutes · {t('agesMin', { min: activeHero.minAge })}
          </p>
          <div className="mkt-hero-btns">
            <div className="mkt-hero-cta-stack">
              <button
                className="mkt-hero-primary"
                onClick={() => onBuyTicket(activeHero)}
                type="button"
                style={{ background: activeHero.accent, boxShadow: `0 8px 28px ${activeHero.accentGlow || 'rgba(0,0,0,0.35)'}` }}
              >
                {t('bookExperience')}
              </button>
              <div className="mkt-cta-note" aria-hidden="true">&nbsp;</div>
            </div>
            <div className="mkt-showpass-stack">
              <button className="mkt-hero-secondary" onClick={() => window.open('https://www.showpass.com/', '_blank', 'noopener,noreferrer')} type="button">
                Showpass
              </button>
              <div className="mkt-showpass-note">{t('showpassNote')}</div>
            </div>
          </div>
          <div className="mkt-hero-dots" aria-label="Featured experience carousel">
            {(localizedExperiences || []).map((exp, index) => (
              <button
                key={exp.id}
                className={`mkt-hero-dot ${index === heroIndex ? 'active' : ''}`}
                onClick={() => goToHero(index)}
                type="button"
                aria-label={`Show ${exp.title}`}
              />
            ))}
          </div>
          <div className="mkt-hero-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Sun–Thu 10AM–9PM &nbsp;·&nbsp; Fri–Sat 10AM–10PM
            </span>
            <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              Unit 210-5300 No.3 Rd, Lansdowne Centre, Richmond BC
            </a>
          </div>
        </div>
      </section>

      {/* ── VR Shows ── */}
      <section ref={experiencesRef} className="vr-experiences-section" id="experiences">
        <div className="vr-exp-header">
          <div>
            <div className="vr-exp-eyebrow">{t('vrShowsEyebrow')}</div>
            <h2 className="vr-exp-title">{t('vrShowsTitle')}</h2>
            <p className="vr-exp-subhead">{t('vrShowsSubhead')}</p>
          </div>
          <div className="vr-exp-count-badges">
            <span className="vr-exp-stat">{t('vrShowsStat1')}</span>
            <span className="vr-exp-stat">{t('vrShowsStat2')}</span>
            <span className="vr-exp-stat">{t('vrShowsStat3')}</span>
          </div>
        </div>
        <div className="vr-exp-grid">
          {(localizedExperiences || []).filter((e) => e.category === 'vr-show').map((exp) => (
            <ExperienceCard key={exp.id} exp={exp} onSelect={onSelectExperience} onBook={onSelectExperience} t={t} />
          ))}
        </div>
      </section>

      {/* ── Arcade Games ── */}
      <section className="vr-experiences-section arcade-section" id="games">
        <div className="vr-exp-header">
          <div>
            <div className="vr-exp-eyebrow">{t('vrGamesEyebrow')}</div>
            <h2 className="vr-exp-title">{t('vrGames')}</h2>
            <p className="vr-exp-subhead">{t('vrGamesSubhead')}</p>
          </div>
          <div className="vr-exp-count-badges">
            <span className="vr-exp-stat">{t('vrGamesStat1')}</span>
            <span className="vr-exp-stat">{t('vrGamesStat2')}</span>
            <span className="vr-exp-stat">{t('vrGamesStat3')}</span>
          </div>
        </div>
        <div className="vr-exp-grid">
          {(localizedExperiences || []).filter((e) => e.category === 'arcade').map((exp) => (
            <ExperienceCard key={exp.id} exp={exp} onSelect={onSelectExperience} onBook={onSelectExperience} t={t} />
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="faq-header">
          <div className="section-eyebrow faq-eyebrow">{t('faqEyebrow')}</div>
          <h2 className="faq-title">{t('faqTitle')}</h2>
        </div>
        <div className="faq-list">
          {localizedFaqItems.map((item, index) => (
            <div key={index} className={`faq-item ${faqOpen === index ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setFaqOpen(faqOpen === index ? null : index)} type="button">
                <span className="faq-toggle">{faqOpen === index ? '−' : '+'}</span>
                {item.q}
              </button>
              {faqOpen === index && <div className="faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── News ── */}
      <div className="news-section-wrap">
        <section className="news-section" id="news">
          <div className="section-heading">
            <div className="section-eyebrow">{t('newsEyebrow')}</div>
            <h2>{t('newsTitle')}</h2>
          </div>
          <div className="news-list">
            {localizedNewsItems.map((item) => (
              <div key={item.title} className="news-item">
                <a href={item.link} target="_blank" rel="noreferrer" className="news-title-link"><h4>{item.title}</h4></a>
                <p>{item.body}</p>
                <a href={item.link} target="_blank" rel="noreferrer" className="news-read-more">{t('readMore')}</a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="site-footer" id="contact">
        <div className="footer-inner">
          <div className="footer-col footer-brand-col">
            <div className="footer-logo-group"><BrandLogo height={64} /></div>
            <div className="footer-socials">
              <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook" data-label="Facebook"><i className="fab fa-facebook-f" /></a>
              <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram" data-label="Instagram"><i className="fab fa-instagram" /></a>
              <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="social-link social-link-text" aria-label="Xiaohongshu" data-label="Xiaohongshu">小红书</a>
              <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="social-link" aria-label="TikTok" data-label="TikTok"><i className="fab fa-tiktok" /></a>
              <a href="mailto:info@vrvr.show" className="social-link" aria-label="Email" data-label="Email"><i className="far fa-envelope" /></a>
            </div>
            <div className="footer-newsletter">
              <div className="footer-newsletter-label">{t('footerSubscribe')}</div>
              <div className="footer-newsletter-row">
                <input type="email" placeholder={t('emailHere')} value={newsletterEmail} onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterMessage('') }} className="footer-email-input" />
                <button className="footer-signup-btn" onClick={submitNewsletter} type="button">{t('signUpCaps')}</button>
              </div>
              {newsletterMessage && <div className="footer-newsletter-message">{newsletterMessage}</div>}
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">{t('reachLocation')}</h4>
            <div className="footer-location-name">Lansdowne Centre</div>
            <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="footer-location-addr-link">
              Unit 210-5300 Number 3 Rd, Richmond, BC
            </a>
            <button className="footer-map-link" onClick={onOpenMap} type="button">{t('viewMap')}</button>
            <button className="footer-map-link highlight" onClick={() => window.open(mapInstructionPdf, '_blank')} type="button">
              {t('detailedLocation')}
            </button>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">{t('openingHours')}</h4>
            <div className="footer-hours-row"><span className="footer-hours-day">{t('sundayThursday')} ...</span><span className="footer-hours-time">10AM – 9PM</span></div>
            <div className="footer-hours-row"><span className="footer-hours-day">{t('fridaySaturday')} ...</span><span className="footer-hours-time">10AM – 10PM</span></div>
            <h4 className="footer-col-title" style={{ marginTop: 28 }}>{t('contactUs')}</h4>
            <div className="footer-contact-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              info@vrvr.show
            </div>
            <div className="footer-contact-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.36a16 16 0 0 0 6.13 6.13l.951-.951a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              (778) 805-4699
            </div>
          </div>
        </div>
        <div className="footer-copy">© {new Date().getFullYear()} We Are VR · Lansdowne Centre, Richmond BC</div>
      </footer>
    </div>
  )
}

export default MarketingPage
