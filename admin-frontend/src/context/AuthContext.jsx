import { createContext, useContext, useState } from 'react'
import { loginAdminWithPassword } from '../api/adminAuth'

const AuthContext = createContext(null)
const LangContext = createContext(null)

const ADMIN_SESSION_KEY = 'tk_admin_session'
const LOCAL_DEV_ADMIN_USER_ID = '722f129d-8cb3-4471-90d2-210f7da463ac'
const LOCAL_DEV_ADMIN_EMAIL = 'p235liu@uwaterloo.ca'
const LOCAL_DEV_ADMIN_PASSWORDS = new Set(['admin123', LOCAL_DEV_ADMIN_EMAIL, 'Owner'])

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY)
      return stored ? JSON.parse(stored).admin : null
    } catch { return null }
  })

  const [lang, setLang] = useState(() => localStorage.getItem('tk_lang') || 'en')

  async function login(email, password, remember) {
    const nextSession = await resolveAdminSession(email, password)
    setAdmin(nextSession.admin)
    const storage = remember ? localStorage : sessionStorage
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    localStorage.removeItem('tk_admin')
    storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession))
    storage.setItem('tk_admin', JSON.stringify(nextSession.admin))
    return nextSession.admin
  }

  function logout() {
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
    <AuthContext.Provider value={{ admin, login, logout }}>
      <LangContext.Provider value={{ lang, changeLang }}>
        {children}
      </LangContext.Provider>
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
export function useLang() { return useContext(LangContext) }

async function resolveAdminSession(email, password) {
  try {
    const session = await loginAdminWithPassword(email, password)
    return {
      ...session,
      admin: {
        ...session.admin,
        loginTime: new Date().toISOString(),
      },
    }
  } catch (error) {
    const devSession = localDevSession(email, password)
    if (devSession) return devSession
    throw error
  }
}

function localDevSession(email, password) {
  const identifier = String(email || '').trim().toLowerCase()
  if (identifier !== LOCAL_DEV_ADMIN_EMAIL.toLowerCase() && identifier !== 'owner') return null
  if (!LOCAL_DEV_ADMIN_PASSWORDS.has(password)) return null
  const admin = {
    id: LOCAL_DEV_ADMIN_USER_ID,
    username: 'Owner',
    name: 'Owner',
    email: LOCAL_DEV_ADMIN_EMAIL,
    role: 'owner',
    department: 'admin',
    position: 'Owner',
    devUserId: LOCAL_DEV_ADMIN_USER_ID,
    accessToken: null,
    loginTime: new Date().toISOString(),
  }
  return { admin, accessToken: null, refreshToken: null, expiresAt: null }
}
