import { getDashboard, getHealth } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export function useHealthQuery(options = {}) {
  return useAdminQuery(
    () => getHealth(),
    [],
    { queryKey: ['health'], ...options }
  )
}

export function useDashboardQuery(range, options = {}) {
  return useAdminQuery(
    () => getDashboard(range),
    [range],
    { queryKey: ['dashboard', range], ...options }
  )
}
