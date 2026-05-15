import { useCallback, useEffect, useState } from 'react'

import {
  getAuthSession,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
} from '../api/auth'
import { syncCurrentUser } from '../api/backend'
import { isSupabaseConfigured, supabase } from '../api/supabase'
import { isStrictEmail, normalize } from '../utils/validation'

export function useCustomerAuth({ onAuthenticated, onShowAuth, t }) {
  const [authMode, setAuthMode] = useState('login')
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', newPassword: '' })

  const resetAuthForm = useCallback(() => {
    setAuthForm({ name: '', email: '', password: '', newPassword: '' })
    setAuthMessage('')
  }, [])

  const syncUser = useCallback(async () => {
    try {
      await syncCurrentUser()
    } catch (error) {
      console.error('Unable to sync authenticated user', error)
    }
  }, [])

  const openAuth = useCallback((mode) => {
    setAuthMode(mode)
    resetAuthForm()
    onShowAuth()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [onShowAuth, resetAuthForm])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true)
      return undefined
    }

    let mounted = true

    getAuthSession()
      .then((activeSession) => {
        if (!mounted) return
        setSession(activeSession)
        if (activeSession) syncUser()

        if (window.location.pathname === '/auth/callback') {
          setAuthMode('login')
          setAuthMessage(activeSession ? 'Email verified. You are now signed in.' : 'Email verified. Please log in.')
          onShowAuth()
          window.history.replaceState({}, document.title, '/')
        }

        if (window.location.pathname === '/reset-password') {
          setAuthMode('reset')
          setAuthMessage('Enter a new password for your account.')
          onShowAuth()
        }
      })
      .catch((error) => {
        console.error('Unable to load Supabase session', error)
        setAuthMessage(error.message || 'Unable to load your session.')
      })
      .finally(() => {
        if (mounted) setAuthReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((event, activeSession) => {
      setSession(activeSession)
      if (activeSession) syncUser()

      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset')
        setAuthMessage('Enter a new password for your account.')
        onShowAuth()
      }

      if (event === 'SIGNED_IN' && window.location.pathname === '/auth/callback') {
        setAuthMode('login')
        setAuthMessage('Email verified. You are now signed in.')
        onShowAuth()
        window.history.replaceState({}, document.title, '/')
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [onShowAuth, syncUser])

  const handleSignup = async (event) => {
    event.preventDefault()
    const name = authForm.name.trim()
    const email = normalize(authForm.email)
    const password = authForm.password
    if (name.length < 2) { setAuthMessage(t('fullNameRequired')); return }
    if (!isStrictEmail(email)) { setAuthMessage(t('emailError')); return }
    if (password.length < 8) { setAuthMessage(t('passwordMin')); return }

    try {
      const data = await signUpWithEmail({ email, name, password })
      if (data.session) {
        setSession(data.session)
        await syncUser()
        resetAuthForm()
        onAuthenticated()
        return
      }

      setAuthMessage('Check your email to verify your account before logging in.')
      setAuthMode('login')
      setAuthForm({ name: '', email, password: '', newPassword: '' })
    } catch (error) {
      setAuthMessage(error.message || 'Unable to sign up. Please try again.')
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const email = normalize(authForm.email)
    const password = authForm.password
    if (!isStrictEmail(email)) { setAuthMessage(t('emailError')); return }
    if (!password) { setAuthMessage(t('passwordPlaceholder')); return }

    try {
      const data = await signInWithEmail({ email, password })
      setSession(data.session)
      await syncUser()
      resetAuthForm()
      onAuthenticated()
    } catch (error) {
      setAuthMessage(error.message || t('loginIncorrect'))
    }
  }

  const handlePasswordResetRequest = async (event) => {
    event.preventDefault()
    const email = normalize(authForm.email)
    if (!isStrictEmail(email)) { setAuthMessage(t('emailError')); return }

    try {
      await sendPasswordReset(email)
      setAuthMessage('Password reset email sent. Check your inbox.')
    } catch (error) {
      setAuthMessage(error.message || 'Unable to send password reset email.')
    }
  }

  const handlePasswordUpdate = async (event) => {
    event.preventDefault()
    const nextPassword = authForm.newPassword || authForm.password
    if (nextPassword.length < 8) { setAuthMessage(t('passwordMin')); return }

    try {
      await updatePassword(nextPassword)
      setAuthMessage('Password updated.')
      setAuthMode('login')
      setAuthForm({ name: '', email: '', password: '', newPassword: '' })
      window.history.replaceState({}, document.title, '/')
      onAuthenticated()
    } catch (error) {
      setAuthMessage(error.message || 'Unable to update password.')
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setSession(null)
      onAuthenticated()
    } catch (error) {
      setAuthMessage(error.message || 'Unable to log out. Please try again.')
      onShowAuth()
    }
  }

  return {
    authForm,
    authMessage,
    authMode,
    authReady,
    currentUser: session?.user || null,
    handleLogin,
    handlePasswordResetRequest,
    handlePasswordUpdate,
    handleSignup,
    logout,
    openAuth,
    resetAuthForm,
    setAuthForm,
    setAuthMessage,
    setAuthMode,
  }
}
