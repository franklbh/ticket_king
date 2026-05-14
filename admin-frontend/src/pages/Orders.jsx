import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { ORDERS_DATA } from '../data/mockData'

const STATUS_LIST = ['completed', 'paid', 'pending', 'cancelled', 'refunded', 'expired_unpaid', 'user_cancelled']
const STATUS_LABELS = { completed: 'Completed', paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled', refunded: 'Refunded', expired_unpaid: 'Expired Unpaid', user_cancelled: 'User Cancelled' }
const STATUS_COLORS = { completed: 'badge-green', paid: 'badge-blue', pending: 'badge-orange', cancelled: 'badge-gray', refunded: 'badge-red', expired_unpaid: 'badge-yellow', user_cancelled: 'badge-purple' }

const PAGE_SIZE = 10

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_COLORS[status] || 'badge-gray'}`}>{STATUS_LABELS[status] || status}</span>
}

function Pagination({ page, total, pageSize, onPage }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = i + 1
        return (
          <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )
      })}
      <button className="page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

export default function Orders() {
  const { lang } = useLang()
  const t = useT(lang)

  const [filters, setFilters] = useState({
    orderId: '', userInfo: '',
    orderDateFrom: '', orderDateTo: '',
    slotDateFrom: '2026-05-13', slotDateTo: '',
    statuses: ['completed', 'paid'],
  })
  const [page, setPage] = useState(1)
  const [detailOrder, setDetailOrder] = useState(null)

  function toggleStatus(s) {
    setFilters(f => ({
      ...f,
      statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s]
    }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    return ORDERS_DATA.filter(o => {
      if (filters.orderId && !o.id.includes(filters.orderId)) return false
      if (filters.userInfo) {
        const q = filters.userInfo.toLowerCase()
        if (!o.user.name?.toLowerCase().includes(q) && !o.user.email?.toLowerCase().includes(q) && !o.user.phone?.includes(q)) return false
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(o.status)) return false
      return true
    })
  }, [filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() {
    setFilters({ orderId: '', userInfo: '', orderDateFrom: '', orderDateTo: '', slotDateFrom: '', slotDateTo: '', statuses: [] })
    setPage(1)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-shopping-cart" style={{ color: '#7b2020' }} />
            {t.ordersManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage all order information</p>
        </div>
        <button className="btn-secondary btn-sm">
          <i className="fa fa-file-export" /> {t.exportCSV}
        </button>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.orderID}</label>
            <input className="form-input" placeholder="Enter order ID..." value={filters.orderId} onChange={e => setFilters(f => ({ ...f, orderId: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.userInfo}</label>
            <input className="form-input" placeholder="Enter name/phone/email..." value={filters.userInfo} onChange={e => setFilters(f => ({ ...f, userInfo: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.orderDateRange}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" type="date" value={filters.orderDateFrom} onChange={e => setFilters(f => ({ ...f, orderDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.orderDateTo} onChange={e => setFilters(f => ({ ...f, orderDateTo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.slotDateRange}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" type="date" value={filters.slotDateFrom} onChange={e => setFilters(f => ({ ...f, slotDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.slotDateTo} onChange={e => setFilters(f => ({ ...f, slotDateTo: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary btn-sm" onClick={resetFilters}>
              <i className="fa fa-redo" /> {t.reset}
            </button>
          </div>
        </div>

        {/* Status checkboxes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginRight: 4 }}>{t.status}:</span>
          {STATUS_LIST.map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={filters.statuses.includes(s)}
                onChange={() => toggleStatus(s)}
                style={{ width: 14, height: 14 }}
              />
              <span className={`badge ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
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
                <th>{t.orderID}</th>
                <th>{t.userInfo}</th>
                <th>{t.emailStatus}</th>
                <th>{t.slotInfo}</th>
                <th>{t.ticketCount}</th>
                <th>{t.amount}</th>
                <th>{t.coupon}</th>
                <th>{t.remarks}</th>
                <th>{t.status}</th>
                <th>{t.paymentMethod}</th>
                <th>{t.createdAt}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No orders found</td></tr>
              ) : paged.map(o => (
                <tr key={o.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: '#7b2020', fontFamily: 'monospace', fontSize: 13 }}>#{o.id}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{o.user.name}</div>
                    {o.user.email && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{o.user.email}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${o.emailStatus === 'sent' ? 'badge-green' : 'badge-gray'}`}>
                      {o.emailStatus === 'sent' ? <><i className="fa fa-check" /> {t.sent}</> : t.notSent}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {o.slot.date.slice(5)} {o.slot.startTime}-{o.slot.endTime}
                    </div>
                  </td>
                  <td>
                    {o.ticketCount.notUsed > 0 ? (
                      <span className="badge badge-orange">{o.ticketCount.notUsed} Not Used (Total {o.ticketCount.total})</span>
                    ) : (
                      <span className="badge badge-green"><i className="fa fa-check" /> Completed (Total {o.ticketCount.total})</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>${o.amount.toFixed(2)}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.couponDiscount < 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 500 }}>${o.couponDiscount.toFixed(2)}</span>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 100 }}>
                    {o.remarks || '-'}
                  </td>
                  <td>
                    <select
                      value={o.status}
                      onChange={() => {}}
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: 12, minWidth: 110 }}
                    >
                      {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {o.paymentMethod === 'Instore Credit' && <i className="fa fa-credit-card" style={{ color: '#7b2020', fontSize: 12 }} />}
                      {o.paymentMethod}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <div>{o.createdAt}</div>
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>By {o.createdBy.split('(')[0].trim()}</div>
                    <button
                      title={o.ip}
                      style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer', marginTop: 2 }}
                    >
                      IP
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
