import { getEvents, getSlots, getTicketTypes } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export const catalogQueryKeys = {
  events: ['events'],
  slots: params => ['slots', params],
  ticketTypes: enabledOnly => ['ticket-types', enabledOnly],
}

export function useEventsQuery(options = {}) {
  return useAdminQuery(
    () => getEvents(),
    [],
    { queryKey: catalogQueryKeys.events, ...options }
  )
}

export function useSlotsQuery(params = {}, options = {}) {
  return useAdminQuery(
    () => getSlots(params),
    [params],
    { queryKey: catalogQueryKeys.slots(params), ...options }
  )
}

export function useTicketTypesQuery(enabledOnly = false, options = {}) {
  return useAdminQuery(
    () => getTicketTypes(enabledOnly),
    [enabledOnly],
    { queryKey: catalogQueryKeys.ticketTypes(enabledOnly), ...options }
  )
}
