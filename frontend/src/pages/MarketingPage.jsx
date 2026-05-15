import BrandLogo from '../components/BrandLogo'
import HeaderActions from '../components/HeaderActions'
import { GOOGLE_MAPS_URL } from '../constants/venue'
import {
  commentFeatureImg,
  galleryImages,
  heroImg,
  introVideo,
  mapInstructionPdf,
} from '../data/showData'

function MarketingPage({
  authReady,
  cartCount,
  currentUser,
  faqOpen,
  localizedFaqItems,
  localizedNewsItems,
  localizedTestimonials,
  localizedTicketPricing,
  newsletterEmail,
  newsletterMessage,
  onBuyTicket,
  onGoHome,
  onLogout,
  onOpenAuth,
  onOpenCart,
  onOpenMap,
  onOpenNav,
  renderLangSelect,
  setFaqOpen,
  setNewsletterEmail,
  setNewsletterMessage,
  submitNewsletter,
  t,
}) {
  return (
    <div className="marketing">
      <section className="hero-rich" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hero-header">
          <button className="brand-button" onClick={onGoHome} type="button">
            <BrandLogo height={68} />
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
        </div>
        <div className="hero-overlay" />
        <div className="hero-inner">
          <p className="hero-kicker">{t('heroKicker')}</p>
          <h1>{t('heroTitle')}</h1>
          <div className="hero-btns">
            <button className="hero-buy-btn" onClick={onBuyTicket} type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
              {t('buyTicket')}
            </button>
            <a href="https://www.showpass.com/" target="_blank" rel="noreferrer" className="hero-showpass-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Buy on Showpass
            </a>
          </div>
          <div className="hero-meta-row">
            <div className="hero-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div><div><strong>{t('sundayThursday')}</strong> ... 10AM - 9PM</div><div><strong>{t('fridaySaturday')}</strong> ... 10AM - 10PM</div></div>
            </div>
            <div className="hero-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <div><div><strong>{t('venueLine')}</strong></div><div>{t('nearNorth')}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-section" id="intro">
        <div className="intro-media">
          <video controls poster={galleryImages[0]} className="intro-video"><source src={introVideo} type="video/mp4" /></video>
        </div>
        <div className="intro-text">
          <h2>{t('introTitle')}</h2>
          <p>{t('introP1')}</p>
          <p>{t('introP2')}</p>
        </div>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="section-heading">
          <div className="section-eyebrow">{t('galleryEyebrow')}</div>
          <h2>{t('gallery')}</h2>
        </div>
        <div className="gallery-grid">
          {galleryImages.map((src, index) => (
            <div key={index} className="gallery-card" style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>
      </section>

      <section className="tickets-section" id="tickets">
        <div className="section-heading light">
          <div className="section-eyebrow">{t('reserveSpot')}</div>
          <h2>{t('tickets')}</h2>
        </div>
        <div className="ticket-pricing-list">
          {localizedTicketPricing.map((priceItem) => (
            <div key={priceItem.label} className="ticket-pricing-row">
              <div className="ticket-pricing-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
              </div>
              <div className="ticket-pricing-info">
                <div className="ticket-pricing-name">{priceItem.label}</div>
                <div className="ticket-pricing-desc">{priceItem.desc}</div>
              </div>
              <div className="ticket-pricing-price">{priceItem.price}</div>
              <button className="ticket-section-buy-btn" onClick={onBuyTicket} type="button">{t('buyTicket')}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-heading light">
          <div className="section-eyebrow">{t('faqEyebrow')}</div>
          <h2>{t('faqTitle')}</h2>
        </div>
        <div className="faq-list">
          {localizedFaqItems.map((item, index) => (
            <div key={index} className={`faq-item ${faqOpen === index ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setFaqOpen(faqOpen === index ? null : index)} type="button">
                <span className="faq-toggle">{faqOpen === index ? '-' : '+'}</span>
                {item.q}
              </button>
              {faqOpen === index && <div className="faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <div className="reviews-top">
          <div className="quote-badge">&ldquo;</div>
          <div className="review-stats-row">
            <span className="stat-badge">{t('reviewsViews')}</span>
            <span className="stat-badge">{t('reviewsSatisfied')}</span>
            <span className="stat-badge">{t('reviewsLocations')}</span>
          </div>
        </div>
        <div className="reviews-grid">
          <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
          <div className="review-card rust-card">
            <p className="review-quote">&ldquo;{localizedTestimonials[0].quote}&rdquo;</p>
            <div className="reviewer">
              <img src={localizedTestimonials[0].img} alt={localizedTestimonials[0].name} className="reviewer-img" />
              <div><div className="reviewer-name">{localizedTestimonials[0].name}</div><div className="reviewer-stars">{'★'.repeat(localizedTestimonials[0].rating)} {localizedTestimonials[0].rating} / 5</div></div>
            </div>
          </div>
          <div className="review-card dark-card">
            <p className="review-quote">&ldquo;{localizedTestimonials[1].quote}&rdquo;</p>
            <div className="reviewer">
              <img src={localizedTestimonials[1].img} alt={localizedTestimonials[1].name} className="reviewer-img" />
              <div><div className="reviewer-name">{localizedTestimonials[1].name}</div><div className="reviewer-stars">{'★'.repeat(localizedTestimonials[1].rating)} {localizedTestimonials[1].rating} / 5</div></div>
            </div>
          </div>
          <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
        </div>
      </section>

      <section className="news-section">
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

      <footer className="site-footer" id="contact">
        <div className="footer-inner">
          <div className="footer-col footer-brand-col">
            <div className="footer-logo-group">
              <BrandLogo height={68} />
            </div>
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
                <input type="email" placeholder={t('emailHere')} value={newsletterEmail} onChange={(event) => { setNewsletterEmail(event.target.value); setNewsletterMessage('') }} className="footer-email-input" />
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
            <div className="footer-hours-row"><span className="footer-hours-day">{t('sundayThursday')} ...</span><span className="footer-hours-time">10AM - 9PM</span></div>
            <div className="footer-hours-row"><span className="footer-hours-day">{t('fridaySaturday')} ...</span><span className="footer-hours-time">10AM - 10PM</span></div>
            <h4 className="footer-col-title" style={{ marginTop: '28px' }}>{t('contactUs')}</h4>
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
