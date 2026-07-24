import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/authHooks'
import { ADMIN_LOGOUT_NOTICE_KEY } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { AdminAlert } from '../components/AdminUI'


export default function Login() {
  const { login } = useAuth()
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => sessionStorage.getItem(ADMIN_LOGOUT_NOTICE_KEY) || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (notice) sessionStorage.removeItem(ADMIN_LOGOUT_NOTICE_KEY)
  }, [notice])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-200 px-4">
      <div className="w-full max-w-[380px] rounded-xl bg-white px-9 py-8 shadow-2xl shadow-brand-950/20">
        <div className="mb-6 flex justify-end">
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="en">English</option>
            <option value="zh-Hans">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
          </select>
        </div>

        <h1 className="mb-7 text-center text-[22px] font-bold text-slate-950">
          {t.adminLogin}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t.email}</label>
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

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t.password}</label>
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

          <div className="mb-6 flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={form.remember}
              onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
              className="h-4 w-4 cursor-pointer"
            />
            <label htmlFor="remember" className="cursor-pointer text-sm text-slate-700">{t.rememberMe}</label>
          </div>

          {error && (
            <AdminAlert tone="error">{error}</AdminAlert>
          )}

          {notice === 'tokenExpired' && (
            <AdminAlert tone="warning">{t.tokenExpiredNotice}</AdminAlert>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-md border-0 bg-brand-500 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {loading ? '...' : t.login}
          </button>
        </form>
      </div>
    </div>
  )
}
