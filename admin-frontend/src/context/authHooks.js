import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const LangContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function useLang() {
  return useContext(LangContext)
}
