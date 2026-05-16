import {
  getCoupons,
  getLogs,
  getMarketingRecords,
  getMarketingSettings,
  getUsers,
} from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'
export { useDashboardQuery, useHealthQuery } from './dashboard'
export { useOrderQuery, useOrdersQuery } from './orders'
export { useTicketQuery, useTicketsQuery } from './tickets'
export { useEventsQuery, useSlotsQuery, useTicketTypesQuery } from './catalog'
export { useRecentScansQuery } from './scanner'

export function useUsersQuery(params = {}, options = {}) {
  return useAdminQuery(
    () => getUsers(params),
    [params],
    { queryKey: ['users', params], ...options }
  )
}

export function useLogsQuery(filters = {}, options = {}) {
  return useAdminQuery(
    () => getLogs(filters),
    [filters],
    { queryKey: ['logs', filters], ...options }
  )
}

export function useCouponsQuery(params = {}, options = {}) {
  return useAdminQuery(
    () => getCoupons(params),
    [params],
    { queryKey: ['coupons', params], ...options }
  )
}

export function useMarketingSettingsQuery(options = {}) {
  return useAdminQuery(
    () => getMarketingSettings(),
    [],
    { queryKey: ['marketing', 'settings'], ...options }
  )
}

export function useMarketingRecordsQuery(params = {}, options = {}) {
  return useAdminQuery(
    () => getMarketingRecords(params),
    [params],
    { queryKey: ['marketing', 'records', params], ...options }
  )
}

export const adminQueryKeys = {
  coupons: ['coupons'],
  slots: ['slots'],
  ticketTypes: ['ticket-types'],
  users: ['users'],
  events: ['events'],
  marketingSettings: ['marketing', 'settings'],
  marketingRecords: ['marketing', 'records'],
}
