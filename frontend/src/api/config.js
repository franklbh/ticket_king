const configuredApiUrl = import.meta.env.VITE_BACKEND_BASE || import.meta.env.VITE_API_URL || ''
const isBrowser = typeof window !== 'undefined'
const isLocalPage = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredApiUrl)

if (configuredApiUrl && isLocalApiUrl && !isLocalPage) {
  throw new Error('Production frontend is configured with a localhost API URL. Set VITE_BACKEND_BASE to the deployed backend URL.')
}

export const API_URL = (configuredApiUrl || 'http://localhost:8000').replace(/\/$/, '')
