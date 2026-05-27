import { getReport } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export function useReportQuery(filters, options = {}) {
  return useAdminQuery(
    () => getReport(filters),
    [JSON.stringify(filters)],
    { queryKey: ['report', filters], enabled: false, ...options }
  )
}
