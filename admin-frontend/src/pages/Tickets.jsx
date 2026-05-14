import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { TICKETS_DATA } from '../data/mockData'

const TICKET_TYPES_FILTER = ['Regular', 'Child (7-15)', 'Senior (65+)', 'Family Bundle (max. 2 adults)', 'Group Ticket (min. 6 people)', 'VIP', 'Early Bird']
const PAGE_SIZE = 10
const TODAY = '2026-05-14'
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
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => (
        <button key={i + 1} className={`page-btn ${i + 1 === page ? 'active' : ''}`} onClick={() => onPage(i + 1)}>{i + 1}</button>
      ))}
      <button className="page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

export default function Tickets() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    code: '', orderId: '', status: 'all',
    slotDateFrom: TODAY, slotDateTo: TODAY,
    verifiedFrom: '', verifiedTo: '',
    types: [],
  })
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState(TICKETS_DATA)
  const [qrTicket, setQrTicket] = useState(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)

  function toggleType(type) {
    setFilters(f => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter(x => x !== type) : [...f.types, type]
    }))
    setPage(1)
  }

  function toggleStatus(id) {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'used' ? 'not_used' : 'used', verifiedAt: t.status === 'used' ? null : new Date().toISOString().slice(0, 19).replace('T', ' ') } : t
    ))
  }

  function voidTicket(id) {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'voided', verifiedAt: null } : t
    ))
  }

  function unvoidTicket(id) {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'not_used', verifiedAt: null } : t
    ))
  }

  const filtered = useMemo(() => {
    return tickets.filter(tk => {
      if (filters.code && !tk.code.includes(filters.code)) return false
      if (filters.orderId && !tk.orderId.includes(filters.orderId)) return false
      if (filters.status !== 'all' && tk.status !== filters.status) return false
      if (filters.slotDateFrom && tk.slotDate < filters.slotDateFrom) return false
      if (filters.slotDateTo && tk.slotDate > filters.slotDateTo) return false
      if (filters.verifiedFrom && (!tk.verifiedAt || tk.verifiedAt.slice(0, 10) < filters.verifiedFrom)) return false
      if (filters.verifiedTo && (!tk.verifiedAt || tk.verifiedAt.slice(0, 10) > filters.verifiedTo)) return false
      if (filters.types.length > 0 && !filters.types.includes(tk.ticketType)) return false
      return true
    })
  }, [filters, tickets])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  function exportCSV() {
    const headers = ['Verification Code', 'Order ID', 'Customer', 'Email', 'Payment Method', 'Remarks', 'Ticket Type', 'Slot Date', 'Slot Time', 'Status', 'Verified At', 'Created At']
    const rows = filtered.map(tk => [
      tk.code,
      tk.orderId,
      tk.orderUser || '',
      tk.orderEmail || '',
      tk.orderPayment || '',
      tk.remarks || '',
      tk.ticketType,
      tk.slotDate,
      `${tk.slotStart}-${tk.slotEnd}`,
      statusMeta[tk.status]?.label || tk.status,
      tk.verifiedAt || '',
      tk.createdAt || '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  return (
    <div>
      {qrTicket && <QRModal code={qrTicket} onClose={() => setQrTicket(null)} />}
      {showExportConfirm && (
        <ExportConfirmDialog
          title="Confirm Action"
          message="You are about to export ticket data"
          filters={ticketExportFilters()}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={exportCSV}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-ticket" style={{ color: THEME.primary }} />
            {t.ticketsManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{t.manageTickets}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setShowExportConfirm(true)}>
          <i className="fa fa-file-export" /> {t.exportCSV}
        </button>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.verificationCode}</label>
            <input className="form-input" placeholder="Enter verification code (last 4+ digits)..." value={filters.code} onChange={e => setFilters(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.orderID}</label>
            <input className="form-input" placeholder="Enter order ID..." value={filters.orderId} onChange={e => setFilters(f => ({ ...f, orderId: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.ticketStatus}</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
              <option value="all">{t.allStatus}</option>
              <option value="not_used">{t.notUsed}</option>
              <option value="used">{t.used}</option>
              <option value="voided">{t.voided}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.slotDateRange}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="form-input" type="date" value={filters.slotDateFrom} onChange={e => setFilters(f => ({ ...f, slotDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.slotDateTo} onChange={e => setFilters(f => ({ ...f, slotDateTo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.verifiedDateRange}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="form-input" type="date" value={filters.verifiedFrom} onChange={e => setFilters(f => ({ ...f, verifiedFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.verifiedTo} onChange={e => setFilters(f => ({ ...f, verifiedTo: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary btn-sm" onClick={resetFilters}>
              <i className="fa fa-redo" /> {t.reset}
            </button>
          </div>
        </div>
      </div>

      {/* Quick filter */}
      <div className="filter-card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.quickFilter}:</span>
          <button className="btn-sm" onClick={setTodaySlotFilter} style={{ background: THEME.primary, color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            <i className="fa fa-calendar" /> {t.todayScreeningSlots}
          </button>
          <button className="btn-sm" onClick={setTodayVerifiedFilter} style={{ background: THEME.primary, color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            <i className="fa fa-check-circle" /> {t.todayVerifiedTickets}
          </button>
        </div>
      </div>

      {/* Ticket type filter */}
      <div className="filter-card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.ticketType}:</span>
          {TICKET_TYPES_FILTER.map(type => (
            <label key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, background: THEME.primarySoft, border: `1px solid ${THEME.primaryBorder}`, borderRadius: 8, padding: '8px 10px', maxWidth: '100%' }}>
              <input type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} style={{ width: 14, height: 14 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, whiteSpace: 'nowrap', color: THEME.primaryText, fontWeight: 600 }}>
                <i className="fa fa-ticket" style={{ color: THEME.primary, fontSize: 10 }} />
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>{t.noTicketsFound}</td></tr>
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
                        onClick={() => setQrTicket(tk.code)}
                        style={{ ...actionButton, background: THEME.utilityBg, color: THEME.utilityText, border: `1px solid ${THEME.utilityBorder}` }}
                      >
                        <i className="fa fa-qrcode" />
                        {t.qrCode}
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
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>
    </div>
  )
}
