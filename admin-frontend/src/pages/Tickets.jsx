import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MuiPagination from '@mui/material/Pagination'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { batchUpdateTicketStatus, exportTickets, regenerateTicketQr, updateTicketStatus } from '../api/adminApi'
import { useAdminMutation } from '../hooks/useAdminApi'
import { useTicketsQuery } from '../hooks/tickets'
import { useTicketTypesQuery } from '../hooks/catalog'
import LoadingIndicator from '../components/LoadingIndicator'
import QrCodeDialog from '../components/QrCodeDialog'
import { AdminAlert, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import { ApplyFiltersButton, DateRangeFilter, ResetFiltersButton, SelectFilter, TextFilter } from '../components/FilterControls'
import { localizeCatalogName, localizeTicketTypeName } from '../utils/localization'

const PAGE_SIZE = 10
const TICKET_STATUS_FILTERS = ['all', 'not_used', 'used', 'voided']

function statusFilterFromQuery(value) {
  return TICKET_STATUS_FILTERS.includes(value) ? value : 'all'
}
const ADMIN_TIME_ZONE = 'America/Vancouver'
function adminTodayDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
const THEME = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primarySoft: '#eef2ff',
  primaryBorder: '#c7d2fe',
  primaryText: '#4f46e5',
  utilityBg: '#f3f4f6',
  utilityBorder: '#e5e7eb',
  utilityText: '#374151',
  warning: '#f59e0b',
}

function shortDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function normalizeTicketTypeLabel(label) {
  return String(label || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(/g, ' (')
    .replace(/\s*\)/g, ')')
}

function ExportConfirmDialog({ title, message, filters, onCancel, onConfirm, t }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 520, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: THEME.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            !
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937' }}>{title}</h2>
        </div>
        <div style={{ paddingLeft: 46, color: '#6b7280', fontSize: 18, lineHeight: 1.55 }}>
          <div style={{ marginBottom: 28 }}>{message}</div>
          <div style={{ marginBottom: 6 }}>{t.currentFilters}</div>
          <div style={{ fontSize: 16 }}>
            {filters.map((item, index) => (
              <div key={index}>· {item}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 }}>
          <button className="btn-secondary" onClick={onCancel} style={{ padding: '9px 22px', fontSize: 14, borderRadius: 8 }}>
            {t.cancel}
          </button>
          <button className="btn-primary" onClick={onConfirm} style={{ padding: '9px 22px', fontSize: 14, borderRadius: 8 }}>
            {t.confirmBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, total, pageSize, onPage }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <div className="flex justify-end p-3">
      <MuiPagination count={pages} page={page} onChange={(_, value) => onPage(value)} color="primary" shape="rounded" size="small" />
    </div>
  )
}

export default function Tickets() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()
  const { orderId: routeOrderId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const linkedOrderId = routeOrderId || searchParams.get('orderId') || ''
  const linkedTicketCode = searchParams.get('code') || ''
  const linkedStatus = statusFilterFromQuery(searchParams.get('status'))
  const linkedSlotDate = searchParams.get('slotDate') || ''

  const [filters, setFilters] = useState({
    code: linkedTicketCode, orderId: linkedOrderId, status: linkedStatus,
    slotDateFrom: linkedSlotDate, slotDateTo: linkedSlotDate,
    verifiedFrom: '', verifiedTo: '',
    types: [],
  })
  const [appliedFilters, setAppliedFilters] = useState({
    code: linkedTicketCode, orderId: linkedOrderId, status: linkedStatus,
    slotDateFrom: linkedSlotDate, slotDateTo: linkedSlotDate,
    verifiedFrom: '', verifiedTo: '',
    types: [],
  })
  const [page, setPage] = useState(1)
  const ticketQueryFilters = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    code: appliedFilters.code,
    orderId: appliedFilters.orderId,
    status: appliedFilters.status,
    slotDateFrom: appliedFilters.slotDateFrom,
    slotDateTo: appliedFilters.slotDateTo,
    verifiedFrom: appliedFilters.verifiedFrom,
    verifiedTo: appliedFilters.verifiedTo,
    ticketType: appliedFilters.types,
  }), [appliedFilters, page])
  const { data: ticketsData, error: loadError, loading: loadingTickets, setData: setTicketsData } = useTicketsQuery(
    ticketQueryFilters,
    { initialData: { items: [], total: 0 } }
  )
  const { data: ticketTypes = [] } = useTicketTypesQuery(false, { initialData: [] })
  const { mutate: updateStatusMutation } = useAdminMutation(updateTicketStatus, {
    successMessage: 'Ticket status updated.',
  })
  const { mutate: exportTicketsMutation, loading: exporting } = useAdminMutation(exportTickets, {
    successMessage: 'Tickets exported.',
  })
  const { mutate: batchStatusMutation } = useAdminMutation(batchUpdateTicketStatus, {
    successMessage: 'Ticket batch updated.',
  })
  const { mutate: regenerateQrMutation } = useAdminMutation(regenerateTicketQr, {
    successMessage: 'Ticket QR regenerated.',
  })
  const tickets = ticketsData?.items || []
  const ticketTypeOptions = useMemo(
    () => [...new Set(ticketTypes.map(type => normalizeTicketTypeLabel(type.name)).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map(value => ({ value, label: localizeTicketTypeName(value, lang) })),
    [ticketTypes, lang]
  )
  const [qrTicket, setQrTicket] = useState(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  function toggleType(type) {
    setFilters(f => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter(x => x !== type) : [...f.types, type]
    }))
  }

  async function toggleStatus(id) {
    const ticket = tickets.find(t => t.id === id)
    const nextStatus = ticket?.status === 'used' ? 'not_used' : 'used'
    const updated = await updateStatusMutation(id, nextStatus)
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(t => t.id === id ? updated : t),
    }))
  }

  async function voidTicket(id) {
    const updated = await updateStatusMutation(id, 'voided')
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(t => t.id === id ? updated : t),
    }))
  }

  async function unvoidTicket(id) {
    const updated = await updateStatusMutation(id, 'not_used')
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(t => t.id === id ? updated : t),
    }))
  }

  function toggleSelected(id) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }

  async function batchStatus(status) {
    if (!selectedIds.length) return
    await batchStatusMutation(selectedIds, status)
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(ticket => selectedIds.includes(ticket.id) ? { ...ticket, status } : ticket),
    }))
    setSelectedIds([])
  }

  async function regenerateQr(ticket) {
    const reason = window.prompt('Reason for regenerating QR', 'Admin requested QR regeneration') || 'Admin requested QR regeneration'
    const updated = await regenerateQrMutation(ticket.id, { reason })
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(item => item.id === ticket.id ? updated : item),
    }))
    setQrTicket(updated.code)
  }

  const paged = tickets

  function resetFilters() {
    const empty = { code: '', orderId: '', status: 'all', slotDateFrom: '', slotDateTo: '', verifiedFrom: '', verifiedTo: '', types: [] }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  function applyFilters() {
    setAppliedFilters(filters)
    setPage(1)
  }

  function setTodaySlotFilter() {
    const today = adminTodayDateKey()
    const next = { ...filters, slotDateFrom: today, slotDateTo: today }
    setFilters(next)
    setAppliedFilters(next)
    setPage(1)
  }

  function setTodayVerifiedFilter() {
    const today = adminTodayDateKey()
    const next = {
      ...filters,
      status: 'used',
      slotDateFrom: '',
      slotDateTo: '',
      verifiedFrom: today,
      verifiedTo: today,
    }
    setFilters(next)
    setAppliedFilters(next)
    setPage(1)
  }

  async function exportCSV() {
    await exportTicketsMutation({
      code: appliedFilters.code,
      orderId: appliedFilters.orderId,
      status: appliedFilters.status,
      slotDateFrom: appliedFilters.slotDateFrom,
      slotDateTo: appliedFilters.slotDateTo,
      verifiedFrom: appliedFilters.verifiedFrom,
      verifiedTo: appliedFilters.verifiedTo,
      ticketType: appliedFilters.types,
    })
    setShowExportConfirm(false)
  }

  function ticketExportFilters() {
    const statusLabels = { all: t.allStatus, not_used: t.notUsed, used: t.used, voided: t.voided }
    const items = []
    if (appliedFilters.code) items.push(`Verification Code: ${appliedFilters.code}`)
    if (appliedFilters.orderId) items.push(`Order ID: ${appliedFilters.orderId}`)
    items.push(`Ticket Status: ${statusLabels[appliedFilters.status] || appliedFilters.status}`)
    items.push(`Slot Date Range: ${appliedFilters.slotDateFrom || 'No limit'} - ${appliedFilters.slotDateTo || 'No limit'}`)
    if (appliedFilters.verifiedFrom || appliedFilters.verifiedTo) items.push(`Verified Date Range: ${appliedFilters.verifiedFrom || 'No limit'} - ${appliedFilters.verifiedTo || 'No limit'}`)
    if (appliedFilters.types.length) items.push(`Ticket Type: ${appliedFilters.types.join(', ')}`)
    return items
  }

  const inlineGroup = { display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap', verticalAlign: 'middle' }
  const truncate = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const iconButton = {
    width: 24, height: 24, border: 'none', borderRadius: 6, flexShrink: 0,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, lineHeight: 1,
  }
  const actionButton = {
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }
  const statusMeta = {
    used: { label: t.used, badge: 'badge-blue' },
    not_used: { label: t.notUsed, badge: 'badge-green' },
    voided: { label: t.voided, badge: 'badge-red' },
  }

  if (loadingTickets) {
    return <LoadingIndicator label={t.loadingTickets} />
  }

  return (
    <div>
      {qrTicket && <QrCodeDialog title={t.ticketQRCode} value={qrTicket} subtitle={t.scanInAdminScanner} onClose={() => setQrTicket(null)} />}
      {loadError && (
        <AdminAlert tone="warning">
          Backend tickets could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      {showExportConfirm && (
        <ExportConfirmDialog
          title={t.confirmAction}
          message={t.exportTicketsConfirm}
          filters={ticketExportFilters()}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={exportCSV}
          t={t}
        />
      )}

      <PageHeader
        icon="fa-ticket"
        title={t.ticketsManagement}
        subtitle={t.manageTickets}
        actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" disabled={!selectedIds.length} onClick={() => batchStatus('used')}>{t.batchUsed}</Button>
          <Button variant="outlined" size="small" disabled={!selectedIds.length} onClick={() => batchStatus('not_used')}>{t.batchUnused}</Button>
          <Button variant="outlined" color="warning" size="small" disabled={!selectedIds.length} onClick={() => batchStatus('voided')}>{t.batchVoid}</Button>
          <Button variant="outlined" size="small" onClick={() => setShowExportConfirm(true)} disabled={exporting} startIcon={<i className="fa fa-file-export" />}>
            {t.exportCSV}
          </Button>
        </div>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1fr_1.4fr_1.4fr_auto] mb-3">
          <TextFilter label={t.verificationCode} placeholder="Enter verification code..." value={filters.code} onChange={value => setFilters(f => ({ ...f, code: value }))} />
          <TextFilter label={t.orderID} placeholder="Enter order ID..." value={filters.orderId} onChange={value => setFilters(f => ({ ...f, orderId: value }))} />
          <SelectFilter
            label={t.ticketStatus}
            value={filters.status}
            onChange={value => setFilters(f => ({ ...f, status: value }))}
            options={[
              { value: 'all', label: t.allStatus },
              { value: 'not_used', label: t.notUsed },
              { value: 'used', label: t.used },
              { value: 'voided', label: t.voided },
            ]}
          />
          <DateRangeFilter label={t.slotDateRange} from={filters.slotDateFrom} to={filters.slotDateTo} onFromChange={value => setFilters(f => ({ ...f, slotDateFrom: value }))} onToChange={value => setFilters(f => ({ ...f, slotDateTo: value }))} />
          <DateRangeFilter label={t.verifiedDateRange} from={filters.verifiedFrom} to={filters.verifiedTo} onFromChange={value => setFilters(f => ({ ...f, verifiedFrom: value }))} onToChange={value => setFilters(f => ({ ...f, verifiedTo: value }))} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <ApplyFiltersButton onClick={applyFilters} />
            <ResetFiltersButton onClick={resetFilters} label={t.reset} />
          </div>
        </div>
      </FilterCard>

      {/* Quick filter */}
      <FilterCard className="py-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.quickFilter}:</span>
          <Button size="small" variant="contained" onClick={setTodaySlotFilter} startIcon={<i className="fa fa-calendar" />}>
            {t.todayScreeningSlots}
          </Button>
          <Button size="small" variant="contained" onClick={setTodayVerifiedFilter} startIcon={<i className="fa fa-check-circle" />}>
            {t.todayVerifiedTickets}
          </Button>
        </div>
      </FilterCard>

      {/* Ticket type filter */}
      <FilterCard className="py-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.ticketType}:</span>
          {ticketTypeOptions.map(type => (
            <Chip
              key={type.value}
              label={type.label}
              color={filters.types.includes(type.value) ? 'primary' : 'default'}
              variant={filters.types.includes(type.value) ? 'filled' : 'outlined'}
              icon={<i className="fa fa-ticket" />}
              onClick={() => toggleType(type.value)}
              sx={{ fontWeight: 700 }}
            />
          ))}
          <Button size="small" variant="contained" onClick={applyFilters} startIcon={<i className="fa fa-check" />}>
            {t.apply}
          </Button>
        </div>
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container tickets-table-container" style={{ overflowX: 'auto' }}>
          <table className="tickets-table" style={{ tableLayout: 'auto', minWidth: 1100, whiteSpace: 'nowrap' }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Select</th>
                <th>{t.verificationCode}</th>
                <th>{t.orderID}</th>
                <th>{t.remarks}</th>
                <th>{t.ticketType}</th>
                <th>{t.slotInfo}</th>
                <th>{t.status}</th>
                <th>{t.verifiedAt}</th>
                <th>{t.orderCreatedAt}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <EmptyTableRow colSpan={11}>{t.noTicketsFound}</EmptyTableRow>
              ) : paged.map((tk, idx) => (
                <tr key={tk.id}>
                  <td style={{ color: '#9ca3af', fontSize: 13 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(tk.id)} onChange={() => toggleSelected(tk.id)} />
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: THEME.primaryText, fontWeight: 800, background: THEME.primarySoft, borderRadius: 6, padding: '5px 8px' }}>
                        {tk.code}
                      </span>
                      <button
                        title={t.qrCode}
                        onClick={() => setQrTicket(tk.code)}
                        style={{ ...actionButton, background: THEME.utilityBg, color: THEME.utilityText, border: `1px solid ${THEME.utilityBorder}` }}
                      >
                        <i className="fa fa-qrcode" />
                        {t.qrCode}
                      </button>
                      <button
                        title={t.regenerateQR}
                        onClick={() => regenerateQr(tk)}
                        style={{ ...actionButton, background: THEME.utilityBg, color: THEME.utilityText, border: `1px solid ${THEME.utilityBorder}` }}
                      >
                        <i className="fa fa-sync" />
                        {t.reissue}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={inlineGroup}>
                          <span style={{ fontWeight: 800, color: '#344155', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>#{tk.orderId}</span>
                          <button
                            title={t.viewOrder}
                            onClick={() => navigate(`/orders/${encodeURIComponent(tk.orderId)}`)}
                            style={{ ...actionButton, background: THEME.primary, color: '#fff', padding: '6px 9px' }}
                          >
                            <i className="fa fa-external-link-alt" />
                            {t.view}
                          </button>
                        </div>
                        {tk.orderUser && <div style={{ ...truncate, fontSize: 12, color: '#4b5563', marginTop: 2 }}>{tk.orderUser}</div>}
                        {tk.orderEmail && <div style={{ ...truncate, fontSize: 11, color: '#6b7280' }}>{tk.orderEmail}</div>}
                        {tk.orderPayment && <div style={{ ...truncate, fontSize: 11, color: THEME.primaryText, fontWeight: 800 }}>{tk.orderPayment}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#4b5563' }}><div style={truncate}>{tk.remarks || '-'}</div></td>
                  <td style={{ fontSize: 13, color: '#374151' }}><div style={truncate} title={tk.ticketType}>{localizeTicketTypeName(tk.ticketType, lang)}</div></td>
                  <td style={{ fontSize: 13 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, color: '#374151' }}>{shortDate(tk.slotDate)}</div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{tk.slotStart}-{tk.slotEnd}</div>
                        {tk.eventName && <div style={{ color: '#6366f1', fontSize: 11 }}>{localizeCatalogName(tk.eventName, lang)}</div>}
                      </div>
                      <button
                        title={t.viewSlot}
                        onClick={() => navigate(`/slots?date=${encodeURIComponent(tk.slotDate)}&start=${encodeURIComponent(tk.slotStart)}`)}
                        style={{ ...iconButton, background: THEME.primary, color: '#fff' }}
                      >
                        <i className="fa fa-calendar" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={inlineGroup}>
                      <span className={`badge ${statusMeta[tk.status]?.badge || 'badge-gray'}`} style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>
                        {statusMeta[tk.status]?.label || tk.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#374151' }}><div style={truncate}>{tk.verifiedAt || '-'}</div></td>
                  <td style={{ fontSize: 12, color: '#374151' }}><div style={truncate}>{tk.createdAt}</div></td>
                  <td>
                    <div style={inlineGroup}>
                      {tk.status === 'voided' ? (
                        <button
                          title={t.unvoidTicket}
                          onClick={() => unvoidTicket(tk.id)}
                          style={{ ...actionButton, background: THEME.primary, color: '#fff' }}
                        >
                          <i className="fa fa-undo" />
                          {t.unvoidTicket}
                        </button>
                      ) : (
                        <button
                          title={t.voidTicket}
                          onClick={() => voidTicket(tk.id)}
                          style={{ ...actionButton, background: THEME.warning, color: '#fff' }}
                        >
                          <i className="fa fa-ban" />
                          {t.voidTicket}
                        </button>
                      )}
                      {tk.status !== 'voided' && (
                        <button
                          title={tk.status === 'used' ? t.markAsUnused : t.markAsUsed}
                          onClick={() => toggleStatus(tk.id)}
                          style={{ ...actionButton, background: THEME.primary, color: '#fff' }}
                        >
                          <i className={`fa ${tk.status === 'used' ? 'fa-undo' : 'fa-check'}`} />
                          {tk.status === 'used' ? t.markAsUnused : t.markAsUsed}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      <Pagination page={page} total={ticketsData?.total || 0} pageSize={PAGE_SIZE} onPage={setPage} />
      </TableShell>
    </div>
  )
}
