import { getTicket, getTickets } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export const ticketQueryKeys = {
  all: ['tickets'],
  list: filters => ['tickets', filters],
  detail: ticketId => ['tickets', 'detail', ticketId],
}

export function useTicketsQuery(filters = {}, options = {}) {
  return useAdminQuery(
    () => getTickets(filters),
    [filters],
    { queryKey: ticketQueryKeys.list(filters), ...options }
  )
}

export function useTicketQuery(ticketId, options = {}) {
  return useAdminQuery(
    () => getTicket(ticketId),
    [ticketId],
    { queryKey: ticketQueryKeys.detail(ticketId), enabled: Boolean(ticketId), ...options }
  )
}
