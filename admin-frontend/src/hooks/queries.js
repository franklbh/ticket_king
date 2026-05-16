import {
  getCoupons,
  getDashboard,
  getEvents,
  getLogs,
  getMarketingRecords,
  getMarketingSettings,
  getOrders,
  getRecentScans,
  getSlots,
  getTickets,
  getTicketTypes,
  getUsers,
} from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export function useDashboardQuery(range, options = {}) {
  return useAdminQuery(
    () => getDashboard(range),
    [range],
    { queryKey: ['dashboard', range], ...options }
  )
}

export function useOrdersQuery(filters = {}, options = {}) {
  return useAdminQuery(
    () => getOrders(filters),
    [filters],
    { queryKey: ['orders', filters], ...options }
  )
}

export function useTicketsQuery(filters = {}, options = {}) {
  return useAdminQuery(
    () => getTickets(filters),
    [filters],
    { queryKey: ['tickets', filters], ...options }
  )
}

export function useSlotsQuery(params = {}, options = {}) {
  return useAdminQuery(
    () => getSlots(params),
    [params],
    { queryKey: ['slots', params], ...options }
  )
}

export function useTicketTypesQuery(enabledOnly = false, options = {}) {
  return useAdminQuery(
    () => getTicketTypes(enabledOnly),
    [enabledOnly],
    { queryKey: ['ticket-types', enabledOnly], ...options }
  )
}

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

export function useRecentScansQuery(minutes = 20, options = {}) {
  return useAdminQuery(
    () => getRecentScans(minutes),
    [minutes],
    { queryKey: ['scanner', 'recent', minutes], ...options }
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

export function useEventsQuery(options = {}) {
  return useAdminQuery(
    () => getEvents(),
    [],
    { queryKey: ['events'], ...options }
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
