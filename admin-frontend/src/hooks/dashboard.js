import { getDashboard, getHealth, getIncomeByEvent } from '../api/adminApi'
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

export function useIncomeByEventQuery(range, options = {}) {
  return useAdminQuery(
    () => getIncomeByEvent(range),
    [range],
    { queryKey: ['dashboard', 'income-by-event', range], ...options }
  )
}
