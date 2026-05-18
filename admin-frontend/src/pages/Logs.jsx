import { useState, useMemo } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { useLogsQuery } from '../hooks/queries'
import { exportLogs, getLog } from '../api/adminApi'
import { useAdminMutation } from '../hooks/useAdminApi'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, AdminPagination, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import { ApplyFiltersButton, DateRangeFilter, ResetFiltersButton, SelectFilter, TextFilter } from '../components/FilterControls'

const ACTION_TYPES = ['Login', 'Create', 'Update', 'Batch Update', 'Check In', 'Restock', 'Void', 'Activate', 'Deactivate', 'Export', 'Other']
const ACTION_COLORS = {
  Login: 'badge-blue', Create: 'badge-green', Update: 'badge-orange', 'Batch Update': 'badge-purple',
  'Check In': 'badge-teal', Restock: 'badge-orange', Void: 'badge-gray', Activate: 'badge-green',
  Deactivate: 'badge-red', Export: 'badge-gray', Other: 'badge-gray'
}
const TARGET_TYPES = ['Order', 'Ticket', 'Ticket Type', 'Slot', 'Event', 'Coupon', 'Admin', 'User']
const TARGET_ICONS = { Order: 'fa-shopping-cart', Ticket: 'fa-ticket', 'Ticket Type': 'fa-tags', Slot: 'fa-calendar', Event: 'fa-star', Coupon: 'fa-tag', Admin: 'fa-user-shield', User: 'fa-user' }

const PAGE_SIZE = 10

function IPModal({ ip, onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
        IP Location Lookup
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 10 }}>
          <i className="fa fa-times" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div><strong>IP Address:</strong> {ip}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Logs() {
  const { lang } = useLang()
  const t = useT(lang)

  const [filters, setFilters] = useState({
    admin: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    actionTypes: ACTION_TYPES.slice(),
    targetTypes: TARGET_TYPES.slice(),
  })
  const [appliedFilters, setAppliedFilters] = useState({
    admin: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    actionTypes: ACTION_TYPES.slice(),
    targetTypes: TARGET_TYPES.slice(),
  })
  const [page, setPage] = useState(1)
  const [ipModal, setIpModal] = useState(null)
  const [detailLog, setDetailLog] = useState(null)
  const { data: logsData, error: loadError, loading: loadingLogs } = useLogsQuery(
    {
      page: 1,
      pageSize: 200,
      admin: appliedFilters.admin,
      search: appliedFilters.search,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      actionType: appliedFilters.actionTypes.length === ACTION_TYPES.length ? undefined : appliedFilters.actionTypes,
      targetType: appliedFilters.targetTypes.length === TARGET_TYPES.length ? undefined : appliedFilters.targetTypes,
    },
    { initialData: { items: [], total: 0 } }
  )
  const { mutate: exportLogsMutation, loading: exporting } = useAdminMutation(exportLogs, {
    successMessage: 'Logs exported.',
  })
  const { mutate: getLogMutation } = useAdminMutation(getLog)
  const logs = logsData?.items || []
  const adminNames = ['all', ...Array.from(new Set(logs.map(a => a.admin).filter(Boolean)))]

  function toggleActionType(at) {
    setFilters(f => ({
      ...f,
      actionTypes: f.actionTypes.includes(at) ? f.actionTypes.filter(x => x !== at) : [...f.actionTypes, at]
    }))
  }

  function toggleTargetType(tt) {
    setFilters(f => ({
      ...f,
      targetTypes: f.targetTypes.includes(tt) ? f.targetTypes.filter(x => x !== tt) : [...f.targetTypes, tt]
    }))
  }

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (appliedFilters.admin !== 'all' && log.admin !== appliedFilters.admin) return false
      const detailsText = typeof log.actionDetails === 'string' ? log.actionDetails : JSON.stringify(log.actionDetails || {})
      if (appliedFilters.search && !detailsText.toLowerCase().includes(appliedFilters.search.toLowerCase())) return false
      if (appliedFilters.actionTypes.length > 0 && !appliedFilters.actionTypes.includes(log.actionType)) return false
      if (appliedFilters.targetTypes.length > 0 && !appliedFilters.targetTypes.includes(log.targetType)) return false
      const timestamp = log.timestamp || log.time || ''
      if (appliedFilters.dateFrom && timestamp.slice(0, 10) < appliedFilters.dateFrom) return false
      if (appliedFilters.dateTo && timestamp.slice(0, 10) > appliedFilters.dateTo) return false
      return true
    })
  }, [appliedFilters, logs])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function openLogDetail(logId) {
    const log = await getLogMutation(logId)
    setDetailLog(log)
  }

  async function exportCurrentLogs() {
    await exportLogsMutation({
      page: 1,
      pageSize: 200,
      admin: appliedFilters.admin,
      search: appliedFilters.search,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      actionType: appliedFilters.actionTypes.length === ACTION_TYPES.length ? undefined : appliedFilters.actionTypes,
      targetType: appliedFilters.targetTypes.length === TARGET_TYPES.length ? undefined : appliedFilters.targetTypes,
    })
  }

  function applyFilters() {
    setAppliedFilters(filters)
    setPage(1)
  }

  function resetFilters() {
    const empty = { admin: 'all', search: '', dateFrom: '', dateTo: '', actionTypes: ACTION_TYPES.slice(), targetTypes: TARGET_TYPES.slice() }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  if (loadingLogs) {
    return <LoadingIndicator label="Loading live activity logs..." />
  }

  return (
    <div>
      {ipModal && <IPModal ip={ipModal} onClose={() => setIpModal(null)} />}
      {loadError && (
        <AdminAlert tone="warning">
          Backend logs could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      {detailLog && (
        <Dialog open onClose={() => setDetailLog(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
            Log #{detailLog.id} Details
            <IconButton aria-label="Close" onClick={() => setDetailLog(null)} sx={{ position: 'absolute', right: 12, top: 10 }}>
              <i className="fa fa-times" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
              {typeof detailLog.actionDetails === 'string' ? detailLog.actionDetails : JSON.stringify(detailLog.actionDetails || {}, null, 2)}
            </pre>
          </DialogContent>
        </Dialog>
      )}

      <PageHeader
        icon="fa-history"
        title={t.activityLogs}
        subtitle="View all administrator operation records"
        actions={
        <Button variant="outlined" size="small" disabled={exporting} onClick={exportCurrentLogs} startIcon={<i className="fa fa-file-export" />}>
          Export Logs
        </Button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 0.8fr) minmax(220px, 1.2fr) minmax(310px, 1fr) auto', gap: 12, alignItems: 'end', marginBottom: 14 }}>
          <SelectFilter
            label={t.admin}
            value={filters.admin}
            onChange={value => setFilters(f => ({ ...f, admin: value }))}
            options={adminNames.map(a => ({ value: a, label: a === 'all' ? t.allAdmins : a }))}
          />
          <TextFilter
            label="Search Action Details"
            placeholder="Search action details..."
            value={filters.search}
            onChange={value => setFilters(f => ({ ...f, search: value }))}
          />
          <DateRangeFilter
            label="Date Range"
            from={filters.dateFrom}
            to={filters.dateTo}
            onFromChange={value => setFilters(f => ({ ...f, dateFrom: value }))}
            onToChange={value => setFilters(f => ({ ...f, dateTo: value }))}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <ApplyFiltersButton onClick={applyFilters} />
            <ResetFiltersButton label={t.reset} onClick={resetFilters} />
          </div>
        </div>

        {/* Action Type filter */}
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 90 }}>Action Type:</span>
          {ACTION_TYPES.map(at => (
            <Chip
              key={at}
              label={at}
              size="small"
              color={filters.actionTypes.includes(at) ? 'primary' : 'default'}
              variant={filters.actionTypes.includes(at) ? 'filled' : 'outlined'}
              onClick={() => toggleActionType(at)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>

        {/* Target Type filter */}
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" gap={1}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 90 }}>Target Type:</span>
          {TARGET_TYPES.map(tt => (
            <Chip
              key={tt}
              label={tt}
              size="small"
              icon={<i className={`fa ${TARGET_ICONS[tt] || 'fa-circle'}`} />}
              color={filters.targetTypes.includes(tt) ? 'primary' : 'default'}
              variant={filters.targetTypes.includes(tt) ? 'filled' : 'outlined'}
              onClick={() => toggleTargetType(tt)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Admin</th>
                <th>Action Type</th>
                <th>Target Type</th>
                <th>Target ID</th>
                <th>Action Details</th>
                <th>Login Info</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <EmptyTableRow colSpan={8}>{t.noLogsFound}</EmptyTableRow>
              ) : paged.map(log => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: '#6366f1', fontFamily: 'monospace', fontSize: 13 }}>#{log.id}</td>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{log.admin}</td>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.actionType] || 'badge-gray'}`}>{log.actionType}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <i className={`fa ${TARGET_ICONS[log.targetType] || 'fa-circle'}`} style={{ color: '#6b7280' }} />
                      {log.targetType}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{log.targetId ?? '-'}</td>
                  <td>
                    <Button
                      onClick={() => openLogDetail(log.id)}
                      variant="outlined"
                      size="small"
                      sx={{ maxWidth: 180, justifyContent: 'flex-start', fontFamily: 'monospace', fontSize: 12, textTransform: 'none' }}
                      title="Click to view full details"
                    >
                      {(typeof log.actionDetails === 'string' ? log.actionDetails : JSON.stringify(log.actionDetails || {})).slice(0, 40)}...
                    </Button>
                  </td>
                  <td>
                    {log.loginInfo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.loginInfo}
                        </span>
                        <Button
                          onClick={() => setIpModal(log.loginInfo)}
                          variant="contained"
                          size="small"
                          sx={{ minWidth: 28, px: 0.75, py: 0.25 }}
                        >
                          <i className="fa fa-search" />
                        </Button>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#374151' }}>{log.timestamp || log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </TableShell>
    </div>
  )
}
