const DEFAULT_ADMIN_API_URL = 'http://localhost:8000/api/v1/admin'
const backendBase = (import.meta.env.VITE_BACKEND_BASE || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_URL ||
  (backendBase ? `${backendBase}/api/v1/admin` : DEFAULT_ADMIN_API_URL)
).replace(/\/$/, '')

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
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
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

export function getIncomeByEvent(range) {
  return apiRequest(withQuery('/dashboard/income-by-event', { range }))
}

export function getReport(filters = {}) {
  return apiRequest(withQuery('/reports/comprehensive', filters))
}

export function getHealth() {
  return apiRequest('/health')
}

export function getOrders(filters = {}) {
  return apiRequest(withQuery('/orders', filters))
}

export function getOrder(orderId) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}`)
}

export function exportOrders(filters = {}) {
  return downloadCsv(withQuery('/orders/export', filters), 'orders_export.csv')
}

export function createWalkInOrder(payload) {
  return apiRequest('/orders/walk-in', { method: 'POST', body: payload })
}

export function updateOrderStatus(orderId, status) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export function updateOrderCustomer(orderId, payload) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/customer`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateOrderSlot(orderId, slotId) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/slot`, {
    method: 'PATCH',
    body: { slotId },
  })
}

export function applyOrderCoupon(orderId, payload) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/coupon`, { method: 'POST', body: payload })
}

export function removeOrderCoupon(orderId) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/coupon`, { method: 'DELETE' })
}

export function resendOrderEmail(orderId, payload = {}) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/resend-email`, { method: 'POST', body: payload })
}

export function getTickets(filters = {}) {
  return apiRequest(withQuery('/tickets', filters))
}

export function getTicket(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}`)
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

export function batchUpdateTicketStatus(ticketIds, status) {
  return apiRequest('/tickets/batch/status', {
    method: 'PATCH',
    body: { ticketIds, status },
  })
}

export function regenerateTicketQr(ticketId, payload = {}) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/regenerate-qr`, { method: 'POST', body: payload })
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

export function getUser(userId) {
  return apiRequest(`/users/${encodeURIComponent(userId)}`)
}

export function getLogs(filters = {}) {
  return apiRequest(withQuery('/logs', filters))
}

export function checkInTicket(code) {
  return apiRequest('/scanner/check-in', { method: 'POST', body: { code } })
}

export function overrideCheckInTicket(payload) {
  return apiRequest('/scanner/override-check-in', { method: 'POST', body: payload })
}

export function getRecentScans(minutes = 20) {
  return apiRequest(withQuery('/scanner/recent', { minutes }))
}

export function getEvents() {
  return apiRequest('/events')
}

export function createEvent(payload) {
  return apiRequest('/events', { method: 'POST', body: payload })
}

export function updateEvent(eventId, payload) {
  return apiRequest(`/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: payload })
}

export function archiveEvent(eventId) {
  return apiRequest(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

export function getSlot(slotId) {
  return apiRequest(`/slots/${encodeURIComponent(slotId)}`)
}

export function createSlot(payload) {
  return apiRequest('/slots', { method: 'POST', body: payload })
}

export function createSlotsBatch(payload) {
  return apiRequest('/slots/batch', { method: 'POST', body: payload })
}

export function updateSlot(slotId, payload) {
  return apiRequest(`/slots/${encodeURIComponent(slotId)}`, { method: 'PATCH', body: payload })
}

export function updateSlotStatus(slotId, status) {
  return apiRequest(`/slots/${encodeURIComponent(slotId)}/status`, { method: 'PATCH', body: { status } })
}

export function updateSlotCapacity(slotId, payload) {
  return apiRequest(`/slots/${encodeURIComponent(slotId)}/capacity`, { method: 'PATCH', body: payload })
}

export function createTicketType(payload) {
  return apiRequest('/ticket-types', { method: 'POST', body: payload })
}

export function updateTicketType(typeId, payload) {
  return apiRequest(`/ticket-types/${encodeURIComponent(typeId)}`, { method: 'PATCH', body: payload })
}

export function validateTicketType(payload) {
  return apiRequest('/ticket-types/validate', { method: 'POST', body: payload })
}

export function bulkUpdateTicketTypePrices(payload) {
  return apiRequest('/ticket-types/bulk-price', { method: 'PATCH', body: payload })
}

export function updateTicketTypeStatus(typeId, status) {
  return apiRequest(`/ticket-types/${encodeURIComponent(typeId)}/status`, { method: 'PATCH', body: { status } })
}

export function archiveTicketType(typeId) {
  return apiRequest(`/ticket-types/${encodeURIComponent(typeId)}`, { method: 'DELETE' })
}

export function getCoupons(params = {}) {
  return apiRequest(withQuery('/coupons', params))
}

export function createCoupon(payload) {
  return apiRequest('/coupons', { method: 'POST', body: payload })
}

export function updateCoupon(couponId, payload) {
  return apiRequest(`/coupons/${encodeURIComponent(couponId)}`, { method: 'PATCH', body: payload })
}

export function validateCoupon(payload) {
  return apiRequest('/coupons/validate', { method: 'POST', body: payload })
}

export function archiveCoupon(couponId) {
  return apiRequest(`/coupons/${encodeURIComponent(couponId)}`, { method: 'DELETE' })
}

export function getCouponQr(couponId) {
  return apiRequest(`/coupons/${encodeURIComponent(couponId)}/qr`)
}

export function getCouponOrders(couponId, params = {}) {
  return apiRequest(withQuery(`/coupons/${encodeURIComponent(couponId)}/orders`, params))
}

export function getMarketingSettings() {
  return apiRequest('/marketing/settings')
}

export function updateMarketingSettings(payload) {
  return apiRequest('/marketing/settings', { method: 'PUT', body: payload })
}

export function getMarketingRecords(params = {}) {
  return apiRequest(withQuery('/marketing/records', params))
}

export function createMarketingRecord(payload) {
  return apiRequest('/marketing/records', { method: 'POST', body: payload })
}

export function cancelMarketingRecord(recordId, payload = {}) {
  return apiRequest(`/marketing/records/${encodeURIComponent(recordId)}/cancel`, { method: 'POST', body: payload })
}

export function retryMarketingRecord(recordId, payload = {}) {
  return apiRequest(`/marketing/records/${encodeURIComponent(recordId)}/retry`, { method: 'POST', body: payload })
}

export function testSendMarketing(payload) {
  return apiRequest('/marketing/test-send', { method: 'POST', body: payload })
}

export function exportLogs(filters = {}) {
  return downloadCsv(withQuery('/logs/export', filters), 'activity_logs_export.csv')
}

export function getLog(logId) {
  return apiRequest(`/logs/${encodeURIComponent(logId)}`)
}

export function updateStaffProfile(userId, payload) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/staff-profile`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateUserRole(userId, role) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

export function deactivateUser(userId) {
  return apiRequest(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function requestUserPasswordReset(userId) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/password-reset`, { method: 'POST' })
}

export function updateUserPassword(userId, password) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/password`, {
    method: 'PATCH',
    body: { password },
  })
}

export function getUserLoginHistory(userId, params = {}) {
  return apiRequest(withQuery(`/users/${encodeURIComponent(userId)}/login-history`, params))
}

export function createAdminAccount(payload) {
  return apiRequest('/users/admins', { method: 'POST', body: payload })
}

export function bootstrapOwner(payload, bootstrapToken) {
  return apiRequest('/users/bootstrap-owner', {
    method: 'POST',
    headers: bootstrapToken ? { 'X-Bootstrap-Token': bootstrapToken } : {},
    body: payload,
  })
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
