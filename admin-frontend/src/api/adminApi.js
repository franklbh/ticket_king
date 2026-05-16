const DEFAULT_ADMIN_API_URL = 'http://localhost:8000/api/v1/admin'
const API_BASE_URL = (import.meta.env.VITE_ADMIN_API_URL || DEFAULT_ADMIN_API_URL).replace(/\/$/, '')

export class AdminApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.payload = payload
  }
}

function session() {
  try {
    const legacy = localStorage.getItem('tk_admin') || sessionStorage.getItem('tk_admin')
    if (legacy) return JSON.parse(legacy)
    const stored = localStorage.getItem('tk_admin_session') || sessionStorage.getItem('tk_admin_session')
    return stored ? JSON.parse(stored).admin : null
  } catch {
    return null
  }
}

function authHeaders() {
  const admin = session()
  const token = admin?.accessToken
  const devUserId = admin?.devUserId
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (!token && devUserId) headers['X-User-Id'] = devUserId
  return headers
}

function withQuery(path, params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','))
      return
    }
    search.set(key, String(value))
  })
  const query = search.toString()
  return `${path}${query ? `?${query}` : ''}`
}

export async function apiRequest(path, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  })

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = await response.text().catch(() => null)
    }
    const detail = typeof payload === 'object' && payload?.detail ? payload.detail : response.statusText
    throw new AdminApiError(detail || 'Admin API request failed.', response.status, payload)
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/csv')) return response.blob()
  return response.json()
}

export function getDashboard(range) {
  return apiRequest(withQuery('/dashboard', { range }))
}

export function getOrders(filters = {}) {
  return apiRequest(withQuery('/orders', filters))
}

export function exportOrders(filters = {}) {
  return downloadCsv(withQuery('/orders/export', filters), 'orders_export.csv')
}

export function createWalkInOrder(payload) {
  return apiRequest('/orders/walk-in', { method: 'POST', body: payload })
}

export function getTickets(filters = {}) {
  return apiRequest(withQuery('/tickets', filters))
}

export function exportTickets(filters = {}) {
  return downloadCsv(withQuery('/tickets/export', filters), 'tickets_export.csv')
}

export function updateTicketStatus(ticketId, status) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export function getSlots(params = {}) {
  return apiRequest(withQuery('/slots', params))
}

export function getTicketTypes(enabledOnly = false) {
  return apiRequest(withQuery('/ticket-types', { enabledOnly }))
}

export function getUsers(params = {}) {
  return apiRequest(withQuery('/users', params))
}

export function getLogs(filters = {}) {
  return apiRequest(withQuery('/logs', filters))
}

export function checkInTicket(code) {
  return apiRequest('/scanner/check-in', { method: 'POST', body: { code } })
}

export function getRecentScans(minutes = 20) {
  return apiRequest(withQuery('/scanner/recent', { minutes }))
}

async function downloadCsv(path, filename) {
  const blob = await apiRequest(path)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
