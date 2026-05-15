function NavMenu({ onClose, onBuyTicket, onNavigateToSection, t }) {
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

  return (
    <div className="nav-menu-overlay">
      <button className="nav-menu-close" onClick={onClose} type="button" aria-label="Close menu">x</button>
      <div className="nav-menu-inner">
        <div className="nav-menu-brand">WE ARE VR</div>
        <nav className="nav-menu-links">
          <button className="nav-menu-item" onClick={() => scrollTo('intro')} type="button">{t('introduce')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('gallery')} type="button">{t('gallery')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('tickets')} type="button">{t('ticket')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('faq')} type="button">{t('faq')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('contact')} type="button">{t('contactLocation')}</button>
        </nav>
        <button
          className="nav-menu-buy-btn"
          onClick={() => { onClose(); onBuyTicket() }}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
          {t('buyTicket')}
        </button>
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
  )
}

export default NavMenu
