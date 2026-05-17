import { getRecentScans } from '../api/adminApi'
import { useAdminQuery } from './useAdminApi'

export function useRecentScansQuery(minutes = 20, options = {}) {
  return useAdminQuery(
    () => getRecentScans(minutes),
    [minutes],
    { queryKey: ['scanner', 'recent', minutes], ...options }
  )
}
