export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'administrator',
  CUSTOMER: 'customer',
}

export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'orders:modify_fees',
    'orders:export',
    'tickets:read',
    'tickets:write',
    'tickets:export',
    'scanner:use',
    'catalog:read',
    'catalog:write',
    'coupons:read',
    'coupons:write',
    'marketing:read',
    'marketing:write',
    'users:read',
    'users:write',
    'logs:read',
    'health:read',
  ],
  [ROLES.ADMIN]: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'orders:modify_fees',
    'orders:export',
    'tickets:read',
    'tickets:write',
    'tickets:export',
    'scanner:use',
    'catalog:read',
    'catalog:write',
    'coupons:read',
    'coupons:write',
    'marketing:read',
    'health:read',
  ],
  [ROLES.CUSTOMER]: [],
}

export function normalizeRole(role) {
  const normalized = String(role || ROLES.CUSTOMER).trim().toLowerCase()
  if (normalized === 'admin') return ROLES.ADMIN
  if (normalized === 'administrator') return ROLES.ADMIN
  if (normalized === 'super_admin' || normalized === 'superadmin') return ROLES.OWNER
  if (normalized === ROLES.OWNER || normalized === ROLES.ADMIN) return normalized
  return ROLES.CUSTOMER
}

export function permissionsForAdmin(admin) {
  if (Array.isArray(admin?.permissions)) return new Set(admin.permissions)
  return new Set(ROLE_PERMISSIONS[normalizeRole(admin?.role)] || [])
}

export function can(admin, permission) {
  if (!permission) return true
  return permissionsForAdmin(admin).has(permission)
}

export function canAny(admin, permissions) {
  return permissions.some(permission => can(admin, permission))
}

export function firstAllowedPath(admin) {
  const ordered = [
    ['/dashboard', 'dashboard:read'],
    ['/orders', 'orders:read'],
    ['/tickets', 'tickets:read'],
    ['/coupons', 'coupons:read'],
    ['/marketing', 'marketing:read'],
    ['/slots', 'catalog:read'],
    ['/ticket-types', 'catalog:read'],
    ['/create-order', 'orders:write'],
    ['/admins', 'users:read'],
    ['/logs', 'logs:read'],
    ['/reports', 'reports:read'],
  ]
  return ordered.find(([, permission]) => can(admin, permission))?.[0] || '/login'
}
