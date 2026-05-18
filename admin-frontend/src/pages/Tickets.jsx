import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MuiPagination from '@mui/material/Pagination'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { exportTickets, regenerateTicketQr, updateTicketStatus } from '../api/adminApi'
import { useAdminMutation } from '../hooks/useAdminApi'
import { useTicketsQuery } from '../hooks/tickets'
import { useTicketTypesQuery } from '../hooks/catalog'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import { DateRangeFilter, ResetFiltersButton, SelectFilter, TextFilter } from '../components/FilterControls'

const PAGE_SIZE = 10
const TODAY = new Date().toISOString().slice(0, 10)
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

function QRModal({ code, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>QR Code</div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          {/* Simple QR code placeholder using grid pattern */}
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: 'block', margin: '0 auto' }}>
            <rect width="160" height="160" fill="white" />
            {/* Corner squares */}
            <rect x="10" y="10" width="40" height="40" fill="none" stroke="#111" strokeWidth="4" />
            <rect x="16" y="16" width="28" height="28" fill="#111" />
            <rect x="110" y="10" width="40" height="40" fill="none" stroke="#111" strokeWidth="4" />
            <rect x="116" y="16" width="28" height="28" fill="#111" />
            <rect x="10" y="110" width="40" height="40" fill="none" stroke="#111" strokeWidth="4" />
            <rect x="16" y="116" width="28" height="28" fill="#111" />
            {/* Random dots for QR feel */}
            {code.split('').map((c, i) => {
              const x = (i % 7) * 10 + 58
              const y = Math.floor(i / 7) * 10 + 58
              return c.charCodeAt(0) % 2 === 0 ? <rect key={i} x={x} y={y} width="8" height="8" fill="#111" /> : null
            })}
          </svg>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#374151', wordBreak: 'break-all', marginBottom: 16 }}>{code}</div>
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function ExportConfirmDialog({ title, message, filters, onCancel, onConfirm }) {
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
          <div style={{ marginBottom: 6 }}>Current filters:</div>
          <div style={{ fontSize: 16 }}>
            {filters.map((item, index) => (
              <div key={index}>· {item}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 }}>
          <button className="btn-secondary" onClick={onCancel} style={{ padding: '9px 22px', fontSize: 14, borderRadius: 8 }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm} style={{ padding: '9px 22px', fontSize: 14, borderRadius: 8 }}>
            Confirm
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

  const [filters, setFilters] = useState({
    code: '', orderId: '', status: 'all',
    slotDateFrom: '', slotDateTo: '',
    verifiedFrom: '', verifiedTo: '',
    types: [],
  })
  const [page, setPage] = useState(1)
  const ticketQueryFilters = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    code: filters.code,
    orderId: filters.orderId,
    status: filters.status,
    slotDateFrom: filters.slotDateFrom,
    slotDateTo: filters.slotDateTo,
    verifiedFrom: filters.verifiedFrom,
    verifiedTo: filters.verifiedTo,
    ticketType: filters.types,
  }), [filters, page])
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
  const { mutate: regenerateQrMutation } = useAdminMutation(regenerateTicketQr, {
    successMessage: 'QR code regenerated.',
  })
  const tickets = ticketsData?.items || []
  const ticketTypeOptions = useMemo(
    () => ticketTypes.map(type => type.name).filter(Boolean).sort(),
    [ticketTypes]
  )
  const [qrTicket, setQrTicket] = useState(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)

  function toggleType(type) {
    setFilters(f => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter(x => x !== type) : [...f.types, type]
    }))
    setPage(1)
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

  async function generateQr(id) {
    const updated = await regenerateQrMutation(id, { reason: 'Manual admin regeneration' })
    setTicketsData(prev => ({
      ...prev,
      items: (prev?.items || []).map(t => t.id === id ? updated : t),
    }))
    setQrTicket(updated.qrCode || updated.code)
  }

  const paged = tickets

  function resetFilters() {
    setFilters({ code: '', orderId: '', status: 'all', slotDateFrom: '', slotDateTo: '', verifiedFrom: '', verifiedTo: '', types: [] })
    setPage(1)
  }

  function setTodaySlotFilter() {
    setFilters(f => ({ ...f, slotDateFrom: TODAY, slotDateTo: TODAY }))
    setPage(1)
  }

  function setTodayVerifiedFilter() {
    setFilters(f => ({ ...f, status: 'used', verifiedFrom: TODAY, verifiedTo: TODAY }))
    setPage(1)
  }

  async function exportCSV() {
    await exportTicketsMutation({
      code: filters.code,
      orderId: filters.orderId,
      status: filters.status,
      slotDateFrom: filters.slotDateFrom,
      slotDateTo: filters.slotDateTo,
      verifiedFrom: filters.verifiedFrom,
      verifiedTo: filters.verifiedTo,
      ticketType: filters.types,
    })
    setShowExportConfirm(false)
  }

  function ticketExportFilters() {
    const statusLabels = { all: t.allStatus, not_used: t.notUsed, used: t.used, voided: t.voided }
    const items = []
    if (filters.code) items.push(`Verification Code: ${filters.code}`)
    if (filters.orderId) items.push(`Order ID: ${filters.orderId}`)
    items.push(`Ticket Status: ${statusLabels[filters.status] || filters.status}`)
    items.push(`Slot Date Range: ${filters.slotDateFrom || 'No limit'} - ${filters.slotDateTo || 'No limit'}`)
    if (filters.verifiedFrom || filters.verifiedTo) items.push(`Verified Date Range: ${filters.verifiedFrom || 'No limit'} - ${filters.verifiedTo || 'No limit'}`)
    if (filters.types.length) items.push(`Ticket Type: ${filters.types.join(', ')}`)
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
    return <LoadingIndicator label="Loading live tickets..." />
  }

  return (
    <div>
      {qrTicket && <QRModal code={qrTicket} onClose={() => setQrTicket(null)} />}
      {loadError && (
        <AdminAlert tone="warning">
          Backend tickets could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      {showExportConfirm && (
        <ExportConfirmDialog
          title="Confirm Action"
          message="You are about to export ticket data"
          filters={ticketExportFilters()}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={exportCSV}
        />
      )}

      <PageHeader
        icon="fa-ticket"
        title={t.ticketsManagement}
        subtitle={t.manageTickets}
        actions={
        <Button variant="outlined" size="small" onClick={() => setShowExportConfirm(true)} disabled={exporting} startIcon={<i className="fa fa-file-export" />}>
          {t.exportCSV}
        </Button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1fr_1.4fr_1.4fr_auto] mb-3">
          <TextFilter label={t.verificationCode} placeholder="Enter verification code..." value={filters.code} onChange={value => { setFilters(f => ({ ...f, code: value })); setPage(1) }} />
          <TextFilter label={t.orderID} placeholder="Enter order ID..." value={filters.orderId} onChange={value => { setFilters(f => ({ ...f, orderId: value })); setPage(1) }} />
          <SelectFilter
            label={t.ticketStatus}
            value={filters.status}
            onChange={value => { setFilters(f => ({ ...f, status: value })); setPage(1) }}
            options={[
              { value: 'all', label: t.allStatus },
              { value: 'not_used', label: t.notUsed },
              { value: 'used', label: t.used },
              { value: 'voided', label: t.voided },
            ]}
          />
          <DateRangeFilter label={t.slotDateRange} from={filters.slotDateFrom} to={filters.slotDateTo} onFromChange={value => { setFilters(f => ({ ...f, slotDateFrom: value })); setPage(1) }} onToChange={value => { setFilters(f => ({ ...f, slotDateTo: value })); setPage(1) }} />
          <DateRangeFilter label={t.verifiedDateRange} from={filters.verifiedFrom} to={filters.verifiedTo} onFromChange={value => { setFilters(f => ({ ...f, verifiedFrom: value })); setPage(1) }} onToChange={value => { setFilters(f => ({ ...f, verifiedTo: value })); setPage(1) }} />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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
              key={type}
              label={type}
              color={filters.types.includes(type) ? 'primary' : 'default'}
              variant={filters.types.includes(type) ? 'filled' : 'outlined'}
              icon={<i className="fa fa-ticket" />}
              onClick={() => toggleType(type)}
              sx={{ fontWeight: 700 }}
            />
          ))}
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
                <EmptyTableRow colSpan={10}>{t.noTicketsFound}</EmptyTableRow>
              ) : paged.map((tk, idx) => (
                <tr key={tk.id}>
                  <td style={{ color: '#9ca3af', fontSize: 13 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: THEME.primaryText, fontWeight: 800, background: THEME.primarySoft, borderRadius: 6, padding: '5px 8px' }}>
                        {tk.code.slice(0, 6)}...{tk.code.slice(-6)}
                      </span>
                      <button
                        title={t.qrCode}
                        onClick={() => setQrTicket(tk.qrCode || tk.code)}
                        style={{ ...actionButton, background: THEME.utilityBg, color: THEME.utilityText, border: `1px solid ${THEME.utilityBorder}` }}
                      >
                        <i className="fa fa-qrcode" />
                        {t.qrCode}
                      </button>
                      <button
                        title={t.generateQR}
                        onClick={() => generateQr(tk.id)}
                        style={{ ...actionButton, background: THEME.primary, color: '#fff' }}
                      >
                        <i className="fa fa-sync" />
                        {t.generateQR}
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
                            onClick={() => navigate(`/orders?orderId=${encodeURIComponent(tk.orderId)}`)}
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
                  <td style={{ fontSize: 13, color: '#374151' }}><div style={truncate} title={tk.ticketType}>{tk.ticketType}</div></td>
                  <td style={{ fontSize: 13 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, color: '#374151' }}>{shortDate(tk.slotDate)}</div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{tk.slotStart}-{tk.slotEnd}</div>
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
