import { requireSupabaseClient } from './supabase'

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
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
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
    redirectTo: `${window.location.origin}/reset-password`,
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
