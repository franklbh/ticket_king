import { useEffect, useState } from 'react'
import { fetchCurrentAdmin, loginAdminWithPassword, refreshAdminSession } from '../api/adminAuth'
import { AuthContext, LangContext } from './authHooks'

const ADMIN_SESSION_KEY = 'tk_admin_session'
const ADMIN_SESSION_REFRESHED_EVENT = 'tk-admin-session-refreshed'
const ADMIN_SESSION_EXPIRED_EVENT = 'tk-admin-session-expired'
export const ADMIN_LOGOUT_NOTICE_KEY = 'tk_admin_logout_notice'
const SESSION_WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000
const REFRESH_BEFORE_EXPIRY_MS = 4 * 60 * 1000
const MIN_REFRESH_DELAY_MS = 5 * 1000
const TOKEN_EXPIRED_NOTICE = 'tokenExpired'

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY)
      return stored ? JSON.parse(stored).admin : null
    } catch { return null }
  })

  const [lang, setLang] = useState(() => localStorage.getItem('tk_lang') || 'en')
  const [sessionWarning, setSessionWarning] = useState(null)

  useEffect(() => {
    if (!admin?.accessToken) return
    let cancelled = false
    fetchCurrentAdmin(admin.accessToken)
      .then(profile => {
        if (cancelled) return
        const refreshedAdmin = {
          ...profile,
          accessToken: admin.accessToken,
          refreshToken: admin.refreshToken,
          expiresAt: admin.expiresAt,
          loginTime: admin.loginTime,
        }
        setAdmin(refreshedAdmin)
        persistAdmin(refreshedAdmin)
      })
      .catch(async () => {
        if (cancelled) return
        const refreshedAdmin = await refreshStoredAdmin(admin).catch(() => null)
        if (cancelled) return
        if (refreshedAdmin) {
          setAdmin(refreshedAdmin)
          persistAdmin(refreshedAdmin)
        } else {
          logout(TOKEN_EXPIRED_NOTICE)
        }
      })
    return () => { cancelled = true }
  }, [admin?.accessToken])

  useEffect(() => {
    if (!admin?.refreshToken || !admin?.expiresAt) return undefined
    let cancelled = false
    const expiresAtMs = Number(admin.expiresAt) * 1000
    const delay = Math.max(MIN_REFRESH_DELAY_MS, expiresAtMs - Date.now() - REFRESH_BEFORE_EXPIRY_MS)
    const timer = window.setTimeout(async () => {
      const refreshedAdmin = await refreshStoredAdmin(admin).catch(() => null)
      if (cancelled) return
      if (refreshedAdmin) {
        setSessionWarning(null)
        setAdmin(refreshedAdmin)
        persistAdmin(refreshedAdmin)
      } else {
        logout(TOKEN_EXPIRED_NOTICE)
      }
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [admin?.refreshToken, admin?.expiresAt])

  useEffect(() => {
    if (!admin?.expiresAt) {
      setSessionWarning(null)
      return undefined
    }
    const expiresAtMs = Number(admin.expiresAt) * 1000
    if (!Number.isFinite(expiresAtMs)) return undefined
    const delay = Math.max(0, expiresAtMs - Date.now() - SESSION_WARNING_BEFORE_EXPIRY_MS)
    const timer = window.setTimeout(() => {
      if (expiresAtMs <= Date.now()) {
        logout(TOKEN_EXPIRED_NOTICE)
        return
      }
      setSessionWarning({ expiresAt: admin.expiresAt })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [admin?.expiresAt])

  useEffect(() => {
    function handleSessionRefreshed(event) {
      if (!event.detail?.accessToken) return
      setSessionWarning(null)
      setAdmin(event.detail)
    }
    function handleSessionExpired() {
      logout(TOKEN_EXPIRED_NOTICE)
    }
    window.addEventListener(ADMIN_SESSION_REFRESHED_EVENT, handleSessionRefreshed)
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(ADMIN_SESSION_REFRESHED_EVENT, handleSessionRefreshed)
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [])

  async function login(email, password, remember) {
    const nextSession = await resolveAdminSession(email, password)
    sessionStorage.removeItem(ADMIN_LOGOUT_NOTICE_KEY)
    setSessionWarning(null)
    setAdmin(nextSession.admin)
    const storage = remember ? localStorage : sessionStorage
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    localStorage.removeItem('tk_admin')
    storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession))
    storage.setItem('tk_admin', JSON.stringify(nextSession.admin))
    return nextSession.admin
  }

  function logout(reason) {
    if (reason === TOKEN_EXPIRED_NOTICE) {
      sessionStorage.setItem(ADMIN_LOGOUT_NOTICE_KEY, TOKEN_EXPIRED_NOTICE)
    } else {
      sessionStorage.removeItem(ADMIN_LOGOUT_NOTICE_KEY)
    }
    setSessionWarning(null)
    setAdmin(null)
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    localStorage.removeItem('tk_admin')
    sessionStorage.removeItem('tk_admin')
  }

  function changeLang(l) {
    setLang(l)
    localStorage.setItem('tk_lang', l)
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, sessionWarning, dismissSessionWarning: () => setSessionWarning(null) }}>
      <LangContext.Provider value={{ lang, changeLang }}>
        {children}
      </LangContext.Provider>
    </AuthContext.Provider>
  )
}

function persistAdmin(admin) {
  const localSession = localStorage.getItem(ADMIN_SESSION_KEY)
  const sessionStorageSession = sessionStorage.getItem(ADMIN_SESSION_KEY)
  const storage = localSession ? localStorage : sessionStorageSession ? sessionStorage : localStorage
  storage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ admin }))
  storage.setItem('tk_admin', JSON.stringify(admin))
}

async function refreshStoredAdmin(admin) {
  if (!admin?.refreshToken) return null
  const session = await refreshAdminSession(admin.refreshToken)
  return {
    ...session.admin,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    loginTime: admin.loginTime,
  }
}

async function resolveAdminSession(email, password) {
  const session = await loginAdminWithPassword(email, password)
  const loginTime = new Date().toISOString()
  return {
    ...session,
    admin: {
      ...session.admin,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      loginTime,
    },
  }
}
