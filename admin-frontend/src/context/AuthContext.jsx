import { createContext, useContext, useState } from 'react'
import { loginAdminWithPassword } from '../api/adminAuth'

const AuthContext = createContext(null)
const LangContext = createContext(null)

const ADMIN_SESSION_KEY = 'tk_admin_session'

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY)
      return stored ? JSON.parse(stored).admin : null
    } catch { return null }
  })

  const [lang, setLang] = useState(() => localStorage.getItem('tk_lang') || 'en')

  async function login(email, password, remember) {
    const session = await loginAdminWithPassword(email, password)
    const nextSession = {
      ...session,
      admin: {
        ...session.admin,
        loginTime: new Date().toISOString(),
      },
    }
    setAdmin(nextSession.admin)
    const storage = remember ? localStorage : sessionStorage
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession))
    return nextSession.admin
  }

  function logout() {
    setAdmin(null)
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
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
