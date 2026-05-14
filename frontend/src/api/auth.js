import { API_URL } from './config'

async function authRequest(path, payload) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || `Authentication failed with status ${response.status}`)
  }

  return data
}

export function signupUser(payload) {
  return authRequest('/auth/signup', payload)
}

export function loginUser(payload) {
  return authRequest('/auth/login', payload)
}
