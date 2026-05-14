import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
]

export default function Login() {
  const { login } = useAuth()
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const ok = login(form.username.trim(), form.password, form.remember)
      setLoading(false)
      if (ok) {
        navigate('/dashboard')
      } else {
        setError(t.loginFailed)
      }
    }, 300)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #9b2c2c 0%, #7b1c1c 45%, #4a0f0f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '32px 36px',
        width: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Language toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 24 }}>
          {LANG_OPTIONS.map(l => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: l.code === lang ? '#7b2020' : 'transparent',
                color: l.code === lang ? '#fff' : '#374151',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: l.code === lang ? 600 : 400,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 28, color: '#111827' }}>
          {t.adminLogin}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14, color: '#374151' }}>{t.username}</label>
            <input
              className="form-input"
              type="text"
              placeholder={t.enterUsername}
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14, color: '#374151' }}>{t.password}</label>
            <input
              className="form-input"
              type="password"
              placeholder={t.enterPassword}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <input
              type="checkbox"
              id="remember"
              checked={form.remember}
              onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ fontSize: 14, color: '#374151', cursor: 'pointer' }}>{t.rememberMe}</label>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#9b3030' : '#7b2020',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#5a1414' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#7b2020' }}
          >
            {loading ? '...' : t.login}
          </button>
        </form>
      </div>
    </div>
  )
}
