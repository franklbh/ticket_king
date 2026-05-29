import { useEffect, useRef, useState } from 'react'
import { getDisplayName } from '../api/auth'
import { ENABLE_MY_BOOKINGS } from '../constants/features'

function HeaderActions({
  authReady,
  cartCount,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenBookings,
  onOpenCart,
  onOpenNav,
  renderLangSelect,
  t,
}) {
  const [accountOpen, setAccountOpen] = useState(false)
  const menuRef = useRef(null)
  const displayName = currentUser ? getDisplayName(currentUser) : ''

  useEffect(() => {
    if (!accountOpen) return undefined
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [accountOpen])

  const openBookings = () => {
    setAccountOpen(false)
    onOpenBookings?.('bookings')
  }

  const openAccountDetails = () => {
    setAccountOpen(false)
    onOpenBookings?.('account')
  }

  return (
    <div className="top-actions">
      {!authReady ? (
        <span className="auth-welcome">{t('checkingSession')}</span>
      ) : currentUser ? (
        <div className="account-menu-wrap" ref={menuRef}>
          <button className="account-trigger" onClick={() => setAccountOpen((open) => !open)} type="button" aria-expanded={accountOpen}>
            <span>{t('hi')} {displayName}</span>
            <small>{ENABLE_MY_BOOKINGS ? t('myBookingsShort') : currentUser.email || displayName}</small>
            <ChevronDownIcon />
          </button>
          <button className="ghost-btn" onClick={onLogout} type="button">{t('logout')}</button>
          {accountOpen && (
            <div className="account-menu-panel">
              <div className="account-menu-profile">
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{displayName}</strong>
                  <small>{t('viewProfile')}</small>
                </div>
              </div>
              {ENABLE_MY_BOOKINGS && (
                <>
                  <button className="active" onClick={openBookings} type="button"><CalendarIcon /> {t('myBookingsTitle')} <ArrowIcon /></button>
                  <button onClick={openAccountDetails} type="button"><UserIcon /> {t('accountDetails')} <ArrowIcon /></button>
                </>
              )}
              <div className="account-menu-rule" />
              <button className="danger" onClick={onLogout} type="button"><LogoutIcon /> {t('logout')}</button>
            </div>
          )}
        </div>
      ) : (
        <button className="ghost-btn" onClick={onOpenAuth} type="button">{t('loginSignup')}</button>
      )}
      {renderLangSelect()}
      <button className="cart-icon-btn" onClick={onOpenCart} type="button" aria-label={t('shoppingCart')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>
      <button className="menu-dots-btn" onClick={onOpenNav} type="button" aria-label={t('navigationMenu')}>
        <span /><span /><span /><span /><span /><span /><span /><span /><span />
      </button>
    </div>
  )
}

function ArrowIcon() {
  return <svg className="account-menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
}

function ChevronDownIcon() {
  return <svg className="account-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
}

function UserIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
}

export default HeaderActions
