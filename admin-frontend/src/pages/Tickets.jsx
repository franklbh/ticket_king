import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { TICKETS_DATA } from '../data/mockData'

const TICKET_TYPES_FILTER = ['Regular', 'Child (7-15)', 'Senior (65+)', 'Family Bundle (max. 2 adults)', 'Group Ticket (min. 6 people)', 'VIP', 'Early Bird']
const PAGE_SIZE = 10

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

  const [filters, setFilters] = useState({
    code: '', orderId: '', status: 'all',
    slotDateFrom: '2026-05-13', slotDateTo: '2026-05-13',
    verifiedFrom: '', verifiedTo: '',
    types: [],
  })
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState(TICKETS_DATA)
  const [qrTicket, setQrTicket] = useState(null)

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

  const filtered = useMemo(() => {
    return tickets.filter(tk => {
      if (filters.code && !tk.code.includes(filters.code)) return false
      if (filters.orderId && !tk.orderId.includes(filters.orderId)) return false
      if (filters.status !== 'all' && tk.status !== filters.status) return false
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
    setFilters(f => ({ ...f, slotDateFrom: '2026-05-13', slotDateTo: '2026-05-13' }))
    setPage(1)
  }

  function setTodayVerifiedFilter() {
    setFilters(f => ({ ...f, status: 'used', slotDateFrom: '2026-05-13', slotDateTo: '2026-05-13' }))
    setPage(1)
  }

  return (
    <div>
      {qrTicket && <QRModal code={qrTicket} onClose={() => setQrTicket(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-ticket" style={{ color: '#7b2020' }} />
            {t.ticketsManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage all tickets</p>
        </div>
        <button className="btn-secondary btn-sm">
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
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Ticket Status</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
              <option value="all">{t.allStatus}</option>
              <option value="used">{t.used}</option>
              <option value="not_used">{t.notUsed}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Slot Date Range</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="form-input" type="date" value={filters.slotDateFrom} onChange={e => setFilters(f => ({ ...f, slotDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.slotDateTo} onChange={e => setFilters(f => ({ ...f, slotDateTo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Verified Date Range</label>
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

        {/* Quick filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.quickFilter}:</span>
          <button className="btn-sm" onClick={setTodaySlotFilter} style={{ background: '#7b2020', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            <i className="fa fa-calendar" /> {t.todayScreeningSlots}
          </button>
          <button className="btn-sm" onClick={setTodayVerifiedFilter} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            <i className="fa fa-check-circle" /> {t.todayVerifiedTickets}
          </button>
        </div>

        {/* Ticket type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Ticket Type:</span>
          {TICKET_TYPES_FILTER.map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} style={{ width: 14, height: 14 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa fa-ticket" style={{ color: '#7b2020', fontSize: 10 }} />
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
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
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No tickets found</td></tr>
              ) : paged.map((tk, idx) => (
                <tr key={tk.id}>
                  <td style={{ color: '#9ca3af', fontSize: 13 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#7b2020', fontWeight: 600 }}>
                        {tk.code.slice(0, 6)}...{tk.code.slice(-6)}
                      </span>
                      <button
                        onClick={() => setQrTicket(tk.code)}
                        style={{ background: '#7b2020', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                      >
                        <i className="fa fa-qrcode" /> QR Code
                      </button>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: '#7b2020', fontFamily: 'monospace', fontSize: 12 }}>#{tk.orderId}</span>
                      <button style={{ marginLeft: 4, background: '#f3f4f6', border: 'none', borderRadius: 3, padding: '1px 6px', fontSize: 11, cursor: 'pointer' }}>
                        <i className="fa fa-external-link-alt" /> View
                      </button>
                    </div>
                    {tk.orderUser && <div style={{ fontSize: 12, color: '#374151' }}>{tk.orderUser}</div>}
                    {tk.orderEmail && <div style={{ fontSize: 11, color: '#9ca3af' }}>{tk.orderEmail}</div>}
                    {tk.orderPayment && <div style={{ fontSize: 11, color: '#7b2020', fontWeight: 500 }}>{tk.orderPayment}</div>}
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{tk.remarks || '-'}</td>
                  <td style={{ fontSize: 13 }}>{tk.ticketType}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {tk.slotDate.slice(5)}<br />{tk.slotStart}-{tk.slotEnd}
                      <button style={{ background: '#7b2020', color: '#fff', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa fa-calendar" style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${tk.status === 'used' ? 'badge-blue' : 'badge-gray'}`}>
                      {tk.status === 'used' ? t.used : t.notUsed}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#374151' }}>{tk.verifiedAt || '-'}</td>
                  <td style={{ fontSize: 12, color: '#374151' }}>{tk.createdAt}</td>
                  <td>
                    <button
                      onClick={() => toggleStatus(tk.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 4, border: '1px solid #d1d5db',
                        background: '#f9fafb', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <i className="fa fa-undo" />
                      {tk.status === 'used' ? t.markAsUnused : t.markAsUsed}
                    </button>
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
