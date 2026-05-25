import { requireSupabaseClient } from './supabase'
import { API_URL } from './config'

const authRedirectBaseUrl = (import.meta.env.VITE_BASE_URL || window.location.origin)
  .replace(/\/$/, '')

export function getDisplayName(user) {
  if (!user) return ''
  return user.user_metadata?.name || user.email?.split('@')[0] || 'there'
}

export async function getAuthSession() {
  const client = requireSupabaseClient()
  const { data, error } = await client.auth.getSession()

  if (error) throw error
  return data.session
}

export async function signUpWithEmail({ email, name, password }) {
  const client = requireSupabaseClient()
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || `Signup failed with status ${response.status}`)
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    if (/confirm|verified|verification/i.test(error.message || '')) {
      throw new Error('Account created, but login is blocked by Supabase email confirmation settings. Disable email confirmation for local signup or confirm the user in Supabase.')
    }
    throw error
  }

  return data
}

export async function signInWithEmail({ email, password }) {
  const client = requireSupabaseClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) throw error
  return data
}

export async function signOut() {
  const client = requireSupabaseClient()
  const { error } = await client.auth.signOut()

  if (error) throw error
}

export async function sendPasswordReset(email) {
  const client = requireSupabaseClient()
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${authRedirectBaseUrl}/reset-password`,
  })

  if (error) throw error
  return data
}

export async function updatePassword(password) {
  const client = requireSupabaseClient()
  const { data, error } = await client.auth.updateUser({ password })

  if (error) throw error
  return data
}
