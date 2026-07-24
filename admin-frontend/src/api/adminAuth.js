const backendBase = (import.meta.env.VITE_BACKEND_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const adminApiBase = (import.meta.env.VITE_ADMIN_API_URL || `${backendBase}/api/v1/admin`).replace(/\/$/, '')
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export function missingAdminAuthEnvVars() {
  return [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabasePublishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)
}

export async function loginAdminWithPassword(email, password) {
  const missing = missingAdminAuthEnvVars()
  if (missing.length) {
    throw new Error(`Missing admin auth env: ${missing.join(', ')}`)
  }

  const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const authData = await readJson(authResponse)
  if (!authResponse.ok) {
    throw new Error(authData?.msg || authData?.error_description || authData?.error || 'Invalid email or password')
  }

  const accessToken = authData.access_token
  if (!accessToken) {
    throw new Error('Supabase did not return an access token.')
  }

  const admin = await fetchCurrentAdmin(accessToken)
  await recordAdminLogin(accessToken).catch(() => null)

  return {
    admin: {
      ...admin,
      username: admin.username || admin.name || admin.email,
    },
    accessToken,
    refreshToken: authData.refresh_token,
    expiresAt: getExpiresAt(authData),
  }
}

export async function refreshAdminSession(refreshToken) {
  const missing = missingAdminAuthEnvVars()
  if (missing.length) {
    throw new Error(`Missing admin auth env: ${missing.join(', ')}`)
  }
  if (!refreshToken) {
    throw new Error('Admin refresh token is missing.')
  }

  const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  const authData = await readJson(authResponse)
  if (!authResponse.ok) {
    throw new Error(authData?.msg || authData?.error_description || authData?.error || 'Could not refresh admin session.')
  }

  const accessToken = authData.access_token
  if (!accessToken) {
    throw new Error('Supabase did not return a refreshed access token.')
  }

  const admin = await fetchCurrentAdmin(accessToken)
  return {
    admin: {
      ...admin,
      username: admin.username || admin.name || admin.email,
    },
    accessToken,
    refreshToken: authData.refresh_token || refreshToken,
    expiresAt: getExpiresAt(authData),
  }
}

export async function fetchCurrentAdmin(accessToken) {
  const adminResponse = await fetch(`${adminApiBase}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const admin = await readJson(adminResponse)
  if (!adminResponse.ok) {
    throw new Error(admin?.detail || 'This account does not have admin access.')
  }
  return {
    ...admin,
    username: admin.username || admin.name || admin.email,
  }
}

async function recordAdminLogin(accessToken) {
  await fetch(`${adminApiBase}/users/me/login-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getExpiresAt(authData) {
  if (authData?.expires_at) return authData.expires_at
  if (authData?.expires_in) return Math.floor(Date.now() / 1000) + Number(authData.expires_in)
  return null
}
