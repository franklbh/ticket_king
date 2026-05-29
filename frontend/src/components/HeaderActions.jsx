import { getDisplayName } from '../api/auth'

function HeaderActions({
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
  const displayName = currentUser ? getDisplayName(currentUser) : ''

  return (
    <div className="top-actions">
      {!authReady ? (
        <span className="auth-welcome">{t('checkingSession')}</span>
      ) : currentUser ? (
        <div className="account-menu-wrap">
          <div className="account-trigger account-trigger-static">
            <span>{t('hi')} {displayName}</span>
            <small>{currentUser.email || displayName}</small>
          </div>
          <button className="ghost-btn" onClick={onLogout} type="button">{t('logout')}</button>
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

export default HeaderActions
