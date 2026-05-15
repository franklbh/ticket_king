import { isSupabaseConfigured, missingSupabaseEnvVars } from '../api/supabase'

function AuthPage({
  authForm,
  authMessage,
  authMode,
  handleLogin,
  handlePasswordResetRequest,
  handlePasswordUpdate,
  handleSignup,
  onClose,
  resetAuthForm,
  setAuthForm,
  setAuthMessage,
  setAuthMode,
  t,
}) {
  const submitHandler = authMode === 'signup'
    ? handleSignup
    : authMode === 'forgot'
      ? handlePasswordResetRequest
      : authMode === 'reset'
        ? handlePasswordUpdate
        : handleLogin

  return (
    <div className="auth-page">
      <button className="auth-close-btn" onClick={onClose} type="button" aria-label="Close account screen">
        <span aria-hidden="true">x</span>
      </button>
      <div className="auth-inner">
        <section className="auth-left">
          <p className="auth-eyebrow">{t('authEyebrow')}</p>
          <h2>{t('authTitle')}</h2>
          <p>{t('authCopy')}</p>
        </section>
        <section className="auth-card">
          {authMode !== 'reset' && (
            <div className="auth-tabs">
              <button className={`auth-tab ${authMode !== 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); resetAuthForm() }} type="button">{t('login')}</button>
              <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); resetAuthForm() }} type="button">{t('signup')}</button>
            </div>
          )}
          <h3>{authMode === 'signup' ? t('createAccount') : authMode === 'forgot' ? t('resetPassword') : authMode === 'reset' ? t('setNewPassword') : t('welcomeBack')}</h3>
          <form className="auth-form" onSubmit={submitHandler}>
            {!isSupabaseConfigured && (
              <div className="auth-error">
                Supabase is not configured. Add {missingSupabaseEnvVars.join(' and ')} to frontend/.env.
              </div>
            )}
            {authMode === 'signup' && (
              <AuthField label={t('fullName')} value={authForm.name} onChange={(v) => setAuthForm({ ...authForm, name: v })} placeholder="Jane Smith" autoComplete="name" />
            )}
            {authMode !== 'reset' && (
              <AuthField label={t('emailAddress')} value={authForm.email} onChange={(v) => setAuthForm({ ...authForm, email: v })} placeholder="name@example.com" type="email" autoComplete="email" />
            )}
            {authMode !== 'forgot' && (
              <AuthField
                label={authMode === 'reset' ? t('newPassword') : t('password')}
                value={authMode === 'reset' ? authForm.newPassword : authForm.password}
                onChange={(v) => setAuthForm(authMode === 'reset' ? { ...authForm, newPassword: v } : { ...authForm, password: v })}
                placeholder={t('passwordPlaceholder')}
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                helper={authMode === 'signup' || authMode === 'reset' ? t('passwordHelper') : undefined}
              />
            )}
            {authMessage && <div className="auth-error">{authMessage}</div>}
            <button className="auth-submit" type="submit" disabled={!isSupabaseConfigured}>
              {authMode === 'signup' ? t('signup') : authMode === 'forgot' ? t('sendResetEmail') : authMode === 'reset' ? t('setNewPassword') : t('login')}
            </button>
            {authMode === 'login' && (
              <button className="auth-link-btn" onClick={() => { setAuthMode('forgot'); setAuthMessage('') }} type="button">{t('forgotPassword')}</button>
            )}
            {(authMode === 'forgot' || authMode === 'reset') && (
              <button className="auth-link-btn" onClick={() => { setAuthMode('login'); resetAuthForm() }} type="button">{t('backToLogin')}</button>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}

function AuthField({ helper, label, onChange, type = 'text', value, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input className="auth-input" onChange={(e) => onChange(e.target.value)} type={type} value={value} {...props} />
      {helper && <span className="auth-helper">{helper}</span>}
    </label>
  )
}

export default AuthPage
