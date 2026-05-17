import { getOrder, getOrders } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export const orderQueryKeys = {
  all: ['orders'],
  list: filters => ['orders', filters],
  detail: orderId => ['orders', 'detail', orderId],
}

export function useOrdersQuery(filters = {}, options = {}) {
  return useAdminQuery(
    () => getOrders(filters),
    [filters],
    { queryKey: orderQueryKeys.list(filters), ...options }
  )
}

export function useOrderQuery(orderId, options = {}) {
  return useAdminQuery(
    () => getOrder(orderId),
    [orderId],
    { queryKey: orderQueryKeys.detail(orderId), enabled: Boolean(orderId), ...options }
  )
}
