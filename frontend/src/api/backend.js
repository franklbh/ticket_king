import { getAuthSession } from './auth'
import { API_URL } from './config'

export async function authenticatedFetch(path, options = {}) {
  const session = await getAuthSession()
  const headers = new Headers(options.headers || {})

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export function getCurrentApiUser() {
  return authenticatedFetch('/auth/me')
}

export function syncCurrentUser() {
  return authenticatedFetch('/auth/user', { method: 'POST' })
}
