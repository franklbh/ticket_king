export const API_URL = (
  import.meta.env.VITE_BACKEND_BASE
  || import.meta.env.VITE_API_URL
  || 'http://localhost:8000'
).replace(/\/$/, '')
