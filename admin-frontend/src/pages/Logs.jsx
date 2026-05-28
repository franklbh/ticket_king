import { useState, useMemo } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
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
const LOG_LABELS = {
  en: {
    exportLogs: 'Export Logs',
    actionTypes: { Login: 'Login', Create: 'Create', Update: 'Update', 'Batch Update': 'Batch Update', 'Check In': 'Check In', Restock: 'Restock', Void: 'Void', Activate: 'Activate', Deactivate: 'Deactivate', Export: 'Export', Other: 'Other' },
    targetTypes: { Order: 'Order', Ticket: 'Ticket', 'Ticket Type': 'Ticket Type', Slot: 'Slot', Event: 'Event', Coupon: 'Coupon', Admin: 'Admin', User: 'User' },
  },
  'zh-Hans': {
    exportLogs: '导出日志',
    actionTypes: { Login: '登录', Create: '创建', Update: '更新', 'Batch Update': '批量更新', 'Check In': '核销', Restock: '补库存', Void: '作废', Activate: '启用', Deactivate: '停用', Export: '导出', Other: '其他' },
    targetTypes: { Order: '订单', Ticket: '门票', 'Ticket Type': '票型', Slot: '场次', Event: '项目', Coupon: '优惠券', Admin: '管理员', User: '用户' },
  },
  'zh-Hant': {
    exportLogs: '匯出日誌',
    actionTypes: { Login: '登入', Create: '建立', Update: '更新', 'Batch Update': '批量更新', 'Check In': '核銷', Restock: '補庫存', Void: '作廢', Activate: '啟用', Deactivate: '停用', Export: '匯出', Other: '其他' },
    targetTypes: { Order: '訂單', Ticket: '門票', 'Ticket Type': '票型', Slot: '場次', Event: '項目', Coupon: '優惠券', Admin: '管理員', User: '使用者' },
  },
}

const PAGE_SIZE = 10

const detailPreviewStyle = {
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#1d4ed8',
  borderRadius: 999,
  padding: '7px 11px',
  maxWidth: 260,
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
}

const detailPreviewTextStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
}

function stringifyDetails(details, spacing = 0) {
  if (typeof details === 'string') return details
  try {
    return JSON.stringify(details || {}, null, spacing)
  } catch {
    return String(details || '')
  }
}

function truncateText(value, max = 76) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}...`
}

function summarizeChanges(changes) {
  if (!changes || typeof changes !== 'object') return ''
  const keys = Object.keys(changes)
  if (keys.length === 0) return ''
  return `Changed ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ` +${keys.length - 3}` : ''}`
}

function summarizeActionDetails(details) {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) return 'No details'
  if (typeof details === 'string') return truncateText(details)

  const parts = []
  const orderNumber = details.order_number || details.orderNumber

  if (details.email) parts.push(`Email: ${details.email}`)
  if (details.name) parts.push(`Name: ${details.name}`)
  if (details.code) parts.push(`Code: ${details.code}`)
  if (orderNumber) parts.push(`Order: ${orderNumber}`)
  if (details.status) parts.push(`Status: ${details.status}`)
  if (details.profile?.name) {
    parts.push(`Profile: ${details.profile.name}${details.profile.status ? ` (${details.profile.status})` : ''}`)
  }

  const changeSummary = summarizeChanges(details.changes)
  if (changeSummary) parts.push(changeSummary)

  return truncateText(parts.length ? parts.join(' - ') : stringifyDetails(details), 86)
}

function IPModal({ ip, onClose }) {
  const { lang } = useLang()
  const t = useT(lang)
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
        {t.ipLocationLookup}
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 10 }}>
          <i className="fa fa-times" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div><strong>{t.ipAddress}:</strong> {ip}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Logs() {
  const { lang } = useLang()
  const t = useT(lang)
  const logLabels = LOG_LABELS[lang] || LOG_LABELS.en

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
      const detailsText = stringifyDetails(log.actionDetails)
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
    return <LoadingIndicator label={t.loadingLogs} />
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
            Log #{detailLog.id} {t.details}
            <IconButton aria-label="Close" onClick={() => setDetailLog(null)} sx={{ position: 'absolute', right: 12, top: 10 }}>
              <i className="fa fa-times" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                {t.summary}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                {summarizeActionDetails(detailLog.actionDetails)}
              </div>
            </div>
            <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {stringifyDetails(detailLog.actionDetails, 2)}
            </pre>
          </DialogContent>
        </Dialog>
      )}

      <PageHeader
        icon="fa-history"
        title={t.activityLogs}
        subtitle={t.viewLogs}
        actions={
        <Button variant="outlined" size="small" disabled={exporting} onClick={exportCurrentLogs} startIcon={<i className="fa fa-file-export" />}>
          {logLabels.exportLogs}
        </Button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="logs-filter-grid">
          <SelectFilter
            label={t.admin}
            value={filters.admin}
            onChange={value => setFilters(f => ({ ...f, admin: value }))}
            options={adminNames.map(a => ({ value: a, label: a === 'all' ? t.allAdmins : a }))}
          />
          <TextFilter
            label={t.searchActionDetails}
            placeholder={t.searchActionDetails}
            value={filters.search}
            onChange={value => setFilters(f => ({ ...f, search: value }))}
          />
          <DateRangeFilter
            label={t.dateRange}
            from={filters.dateFrom}
            to={filters.dateTo}
            onFromChange={value => setFilters(f => ({ ...f, dateFrom: value }))}
            onToChange={value => setFilters(f => ({ ...f, dateTo: value }))}
          />
          <div className="logs-filter-actions">
            <ApplyFiltersButton label={t.apply} onClick={applyFilters} />
            <ResetFiltersButton label={t.reset} onClick={resetFilters} />
          </div>
        </div>

        {/* Action Type filter */}
        <div className="logs-chip-grid">
          <span className="logs-chip-label">{t.actionType}:</span>
          {ACTION_TYPES.map(at => (
            <Chip
              key={at}
              label={logLabels.actionTypes[at] || at}
              size="small"
              color={filters.actionTypes.includes(at) ? 'primary' : 'default'}
              variant={filters.actionTypes.includes(at) ? 'filled' : 'outlined'}
              onClick={() => toggleActionType(at)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </div>

        {/* Target Type filter */}
        <div className="logs-chip-grid">
          <span className="logs-chip-label">{t.targetType}:</span>
          {TARGET_TYPES.map(tt => (
            <Chip
              key={tt}
              label={logLabels.targetTypes[tt] || tt}
              size="small"
              icon={<i className={`fa ${TARGET_ICONS[tt] || 'fa-circle'}`} />}
              color={filters.targetTypes.includes(tt) ? 'primary' : 'default'}
              variant={filters.targetTypes.includes(tt) ? 'filled' : 'outlined'}
              onClick={() => toggleTargetType(tt)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </div>
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t.admin}</th>
                <th>{t.actionType}</th>
                <th>{t.targetType}</th>
                <th>{t.targetID}</th>
                <th>{t.actionDetails}</th>
                <th>{t.loginInfo}</th>
                <th>{t.time}</th>
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
                    <span className={`badge ${ACTION_COLORS[log.actionType] || 'badge-gray'}`}>{logLabels.actionTypes[log.actionType] || log.actionType}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <i className={`fa ${TARGET_ICONS[log.targetType] || 'fa-circle'}`} style={{ color: '#6b7280' }} />
                      {logLabels.targetTypes[log.targetType] || log.targetType}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{log.targetId ?? '-'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openLogDetail(log.id)}
                      style={detailPreviewStyle}
                      title="Click to view full details"
                    >
                      <i className="fa fa-file-alt" style={{ flex: '0 0 auto' }} />
                      <span style={detailPreviewTextStyle}>{summarizeActionDetails(log.actionDetails)}</span>
                    </button>
                  </td>
                  <td>
                    {log.loginInfo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    ) : <span style={{ color: '#9ca3af', fontWeight: 800 }}>-</span>}
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
