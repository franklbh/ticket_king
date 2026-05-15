import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
const LangContext = createContext(null)

const ADMINS = [
  { id: 1, username: 'spadmin', role: 'SuperAdmin', department: 'backend', position: 'admin' },
  { id: 5, username: 'Sunnie', email: '1021784916@qq.com', role: 'SDirector', department: 'BMW', position: 'CEO' },
  { id: 6, username: 'Victor', email: 'victorli690113@gmail.com', role: 'Director', department: 'BMW', position: 'CEO-' },
  { id: 3, username: 'franklee123', email: '1@1.1', role: 'Director', department: 'BMW', position: 'COO' },
  { id: 4, username: 'staff_1', role: 'Director', department: 'store', position: 'Staff' },
  { id: 2, username: 'scanner', role: 'Operator', department: 'store', position: 'front' },
]

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem('tk_admin')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [lang, setLang] = useState(() => localStorage.getItem('tk_lang') || 'en')

  function login(username, password, remember) {
    const found = ADMINS.find(a => a.username.toLowerCase() === username.toLowerCase())
    if (!found) return false
    if (password !== 'admin123' && password !== username) return false
    const session = { ...found, loginTime: new Date().toISOString() }
    setAdmin(session)
    if (remember) localStorage.setItem('tk_admin', JSON.stringify(session))
    return true
  }

  function logout() {
    setAdmin(null)
    localStorage.removeItem('tk_admin')
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
