import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'


export default function Login() {
  const { login } = useAuth()
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email.trim(), form.password, form.remember)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || t.loginFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)',
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
        {/* Language select */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid #e5e7eb',
              borderRadius: 6, background: '#fff',
              fontSize: 13, color: '#374151', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="en">English</option>
            <option value="zh-Hans">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
          </select>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 28, color: '#111827' }}>
          {t.adminLogin}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14, color: '#374151' }}>{t.email}</label>
            <input
              className="form-input"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
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
              background: loading ? '#818cf8' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#4f46e5' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#6366f1' }}
          >
            {loading ? '...' : t.login}
          </button>
        </form>
      </div>
    </div>
  )
}
