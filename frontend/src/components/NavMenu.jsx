function NavMenu({ onClose, onNavigateHome, onNavigateToSection, t }) {
  const scrollTo = (id) => {
    onClose()
    if (onNavigateToSection) {
      onNavigateToSection(id)
      return
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const scrollToTop = () => {
    onClose()
    if (onNavigateHome) {
      onNavigateHome()
      return
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60)
  }

  return (
    <div className="nav-menu-overlay">
      <div className="nav-menu-inner">
        <div className="nav-menu-header">
          <div className="nav-menu-brand">WE ARE VR</div>
          <button className="nav-menu-close" onClick={onClose} type="button" aria-label={t('closeMenu')}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="nav-menu-kicker">{t('navigation')}</div>
        <nav className="nav-menu-links" aria-label={t('navigationMenu')}>
          <button className="nav-menu-item active" onClick={scrollToTop} type="button"><Icon type="home" />{t('home')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => scrollTo('experiences')} type="button"><Icon type="show" />{t('vrShows')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => scrollTo('games')} type="button"><Icon type="game" />{t('vrGames')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => window.open('https://www.showpass.com/', '_blank', 'noopener,noreferrer')} type="button"><Icon type="ticket" />{t('showpass')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => scrollTo('faq')} type="button"><Icon type="faq" />{t('faqs')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => scrollTo('news')} type="button"><Icon type="news" />{t('newsMedia')}<Arrow /></button>
          <button className="nav-menu-item" onClick={() => scrollTo('contact')} type="button"><Icon type="contact" />{t('contactLabel')}<Arrow /></button>
        </nav>
        <div className="nav-menu-section-title">{t('experiences')}</div>
        <div className="nav-menu-experience-cards">
          <button onClick={() => scrollTo('experiences')} type="button">
            <span><Icon type="show" /></span>
            <strong>{t('vrShows')}</strong>
            <small>{t('vrShowsCardCopy')}</small>
          </button>
          <button onClick={() => scrollTo('games')} type="button">
            <span><Icon type="game" /></span>
            <strong>{t('vrGames')}</strong>
            <small>{t('vrGamesCardCopy')}</small>
          </button>
        </div>
        <div className="nav-menu-section-title">{t('support')}</div>
        <div className="nav-menu-support">
          <span><Icon type="help" /></span>
          <div><strong>{t('needHelp')}</strong><small>{t('navHelpCopy')}</small></div>
          <button onClick={() => scrollTo('faq')} type="button">{t('visitFaqs')} <Arrow /></button>
        </div>
        <div className="nav-menu-footer">
          <div className="nav-menu-socials">
            <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="nav-social" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
            <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="nav-social" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="nav-social nav-social-text" aria-label="Xiaohongshu">小红书</a>
            <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="nav-social" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
            <a href="mailto:info@vrvr.show" className="nav-social" aria-label="Email"><i className="far fa-envelope" /></a>
            <a href="tel:+17788054699" className="nav-social" aria-label="Phone"><i className="fas fa-phone-alt" /></a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg className="nav-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function Icon({ type }) {
  const paths = {
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    show: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3V9Z" /></>,
    game: <><path d="M7 13h.01M10 10h.01M17 11h.01M14 14h.01" /><path d="M5.5 18h13a3 3 0 0 0 2.8-4.1l-1.7-4.4A4 4 0 0 0 15.9 7H8.1a4 4 0 0 0-3.7 2.5l-1.7 4.4A3 3 0 0 0 5.5 18Z" /></>,
    ticket: <><path d="M4 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3Z" /></>,
    gift: <><path d="M20 12v8H4v-8M22 7H2v5h20V7ZM12 22V7M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7ZM12 7h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z" /></>,
    group: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>,
    faq: <><path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1.4-2.4 1.8-2.7 3.4M12 17h.01" /><circle cx="12" cy="12" r="9" /></>,
    news: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" /><path d="M8 7h8M8 11h8" /></>,
    contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    help: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M18 19a2 2 0 0 0 2-2v-3h-4v5h2ZM6 19a2 2 0 0 1-2-2v-3h4v5H6Z" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>
}

export default NavMenu
