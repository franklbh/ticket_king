import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { exportOrders, getOrders, getSlots } from '../api/adminApi'
import { useAdminMutation, useAdminQuery } from '../hooks/useAdminApi'

const STATUS_LIST = ['paid', 'completed', 'refunded', 'cancelled']
const STATUS_BADGE = { paid: 'badge-blue', completed: 'badge-green', refunded: 'badge-red', cancelled: 'badge-gray' }
const STATUS_T = { paid: 'paid', completed: 'completed', refunded: 'refunded', cancelled: 'cancelled' }
const TODAY = new Date().toISOString().slice(0, 10)
const PAGE_SIZE = 10

// ── data helpers ─────────────────────────────────────────────────────────────

function addDays(date, days) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function splitName(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length <= 1
    ? { firstName: name, lastName: '' }
    : { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) }
}

function dateWeekday(dateStr) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T12:00:00').getDay()]
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${dateWeekday(dateStr)})`
}

function getOrderConstraints() {
  return { weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], timeStart: null, timeEnd: null }
}

function getTicketItems(order) {
  const details = Array.isArray(order.ticketDetails) ? order.ticketDetails : []
  return details.map(item => ({
    type: item.ticket_type || item.ticketType || item.name || 'Ticket',
    count: Number(item.quantity || item.count || 0),
    price: Number(item.unit_price || item.price || 0),
  })).filter(item => item.count > 0)
}

function getAmountBreakdown(order) {
  const base = order.amount / 1.05
  return {
    ticketPrice: base + Math.abs(order.couponDiscount),
    coupon: order.couponDiscount,
    gst: order.amount - base,
    total: order.amount,
  }
}

function getAvailableDates(slots) {
  const { weekdays } = getOrderConstraints()
  return [...new Set(slots.filter(s => s.date >= TODAY && s.status === 'active').map(s => s.date))]
    .sort()
    .filter(d => weekdays.includes(dateWeekday(d)))
}

function getAvailableTimes(slots, date) {
  if (!date) return []
  const { timeStart, timeEnd } = getOrderConstraints()
  return slots
    .filter(s => s.date === date && s.status === 'active')
    .filter(s => (!timeStart || s.startTime >= timeStart) && (!timeEnd || s.startTime < timeEnd))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

// ── ui atoms ──────────────────────────────────────────────────────────────────

function IconBtn({ icon, onClick, title, color = '#6b7280', bg = '#f3f4f6', brand, amber }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 24, height: 24, border: 'none', borderRadius: 6, flexShrink: 0,
        background: brand ? '#6366f1' : amber ? '#fef3c7' : bg,
        color: brand ? '#fff' : amber ? '#d97706' : color,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1,
      }}
    >
      <i className={`fa ${icon}`} />
    </button>
  )
}

function Popover({ rect, onClose, width = 280, children }) {
  const ref = useRef()
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
  const top = Math.min(rect.bottom + 6, window.innerHeight - 320)
  return (
    <div ref={ref} style={{
      position: 'fixed', top, left, width, zIndex: 1000,
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 16,
    }}>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 12, width, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
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
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
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
  const items = Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1)
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      {items.map(p => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

// ── popover contents ──────────────────────────────────────────────────────────

function EmailHistoryContent({ order, t }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t.sendHistory}</span>
        <button className="btn-primary btn-sm" style={{ padding: '4px 10px' }}>
          <i className="fa fa-redo" style={{ marginRight: 4 }} />{t.resend}
        </button>
      </div>
      <div style={{ height: 1, background: '#f3f4f6', marginBottom: 12 }} />
      <div style={{ paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <i className="fa fa-check-circle" style={{ color: '#10b981' }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>{t.sent}</span>
          <span style={{ fontSize: 11, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, color: '#6b7280' }}>{t.latest}</span>
        </div>
        {order.user.email && (
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>
            <span style={{ color: '#9ca3af' }}>Email: </span>{order.user.email}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#374151' }}>
          <span style={{ color: '#9ca3af' }}>{t.sentAt}: </span>{order.createdAt}
        </div>
      </div>
    </div>
  )
}

function TicketDetailContent({ order, t }) {
  const items = getTicketItems(order)
  if (!items.length) {
    return (
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{t.ticketDetails}</div>
        <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{t.noTicketsData}</div>
      </div>
    )
  }
  const subtotal = items.reduce((s, it) => s + it.price * it.count, 0)
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{t.ticketDetails}</div>
      <div style={{ height: 2, background: '#f59e0b', borderRadius: 1, marginBottom: 12 }} />
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 13 }}>
          <span style={{ flex: 1, color: '#374151' }}>{it.type}</span>
          <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>${it.price.toFixed(2)} × {it.count}</span>
          <span style={{ fontWeight: 600, color: '#10b981', minWidth: 52, textAlign: 'right' }}>${(it.price * it.count).toFixed(2)}</span>
        </div>
      ))}
      <div style={{ height: 2, background: '#f59e0b', borderRadius: 1, margin: '10px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
        <span>{t.subtotal}</span>
        <span style={{ color: '#f59e0b' }}>${subtotal.toFixed(2)}</span>
      </div>
    </div>
  )
}

function AmountDetailContent({ order, t }) {
  const { ticketPrice, coupon, gst, total } = getAmountBreakdown(order)
  const rows = [
    { label: t.ticketPrice, value: `+$${ticketPrice.toFixed(2)}`, color: '#10b981' },
    ...(coupon < 0 ? [{
      label: order.couponCode ? `${t.couponDiscountLabel} (${order.couponCode})` : t.couponDiscountLabel,
      value: `$${coupon.toFixed(2)}`, color: '#dc2626'
    }] : []),
    { label: t.gstLabel, value: `+$${gst.toFixed(2)}`, color: '#10b981' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t.amountDetails}</span>
        <button className="btn-primary btn-sm" style={{ padding: '4px 10px' }}>
          <i className="fa fa-pen" style={{ marginRight: 4 }} />{t.edit}
        </button>
      </div>
      <div style={{ height: 1, background: '#f3f4f6', marginBottom: 12 }} />
      {rows.map(({ label, value, color }, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: '#374151' }}>{label}</span>
          <span style={{ fontWeight: 500, color }}>{value}</span>
        </div>
      ))}
      <div style={{ height: 1, background: '#f3f4f6', margin: '10px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
        <span>{t.total}</span>
        <span style={{ color: '#10b981' }}>${total.toFixed(2)}</span>
      </div>
    </div>
  )
}

function CouponContent({ order }) {
  const { coupon } = getAmountBreakdown(order)
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Coupon Details</div>
      <div style={{ height: 1, background: '#f3f4f6', marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: '#9ca3af' }}>Code</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{order.couponCode}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: '#9ca3af' }}>Discount</span>
        <span style={{ fontWeight: 600, color: '#dc2626' }}>{coupon.toFixed(2)}</span>
      </div>
    </div>
  )
}

function IpContent({ order, t, copiedId, onCopy }) {
  const isCopied = copiedId === order.id
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{t.ipAddress}</div>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
        {order.ip || '—'}
      </div>
      {order.ip && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onCopy(order.id, order.ip)}
            style={{ flex: 1, padding: '6px 10px', background: isCopied ? '#10b981' : '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <i className={`fa ${isCopied ? 'fa-check' : 'fa-copy'}`} />
            {isCopied ? t.copied : t.copyIP}
          </button>
          <a
            href={`https://ip-api.com/#${order.ip}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '6px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="fa fa-location-dot" />
            {t.ipLocationLookup}
          </a>
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Orders() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkedSlotDate = searchParams.get('slotDate') || ''
  const linkedSlotStart = searchParams.get('slotStart') || ''

  const { data: ordersData, error: loadError, loading: loadingOrders, setData: setOrdersData } = useAdminQuery(
    () => getOrders({ page: 1, pageSize: 200 }),
    [],
    { initialData: { items: [], total: 0 } }
  )
  const { data: slots = [] } = useAdminQuery(
    () => getSlots({ dateFrom: TODAY, dateTo: addDays(TODAY, 180) }),
    [],
    { initialData: [] }
  )
  const { mutate: exportOrdersMutation, loading: exporting } = useAdminMutation(exportOrders)
  const [filters, setFilters] = useState({
    orderId: searchParams.get('orderId') || '', userInfo: '',
    couponCode: searchParams.get('couponCode') || '',
    orderDateFrom: '', orderDateTo: '',
    slotDateFrom: linkedSlotDate || '2026-05-13', slotDateTo: linkedSlotDate || '',
    slotStart: linkedSlotStart,
    statuses: ['completed', 'paid'],
  })
  const [page, setPage] = useState(1)
  const [popover, setPopover] = useState(null) // { type, orderId, rect }
  const [modal, setModal] = useState(null)     // { type, order }
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [slotPick, setSlotPick] = useState({ date: null, slot: null, resend: true })
  const [copiedId, setCopiedId] = useState(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const orders = ordersData?.items || []

  function openPopover(type, orderId, e) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover(prev => (prev?.type === type && prev?.orderId === orderId) ? null : { type, orderId, rect })
  }

  function openModal(type, order) {
    if (type === 'editUser') {
      const { firstName, lastName } = splitName(order.user.name)
      setEditForm({ firstName, lastName, phone: order.user.phone || '', email: order.user.email || '' })
    }
    if (type === 'changeSlot') setSlotPick({ date: null, slot: null, resend: true })
    setModal({ type, order })
    setPopover(null)
  }

  function saveUser() {
    if (!modal) return
    const name = [editForm.firstName, editForm.lastName].filter(Boolean).join(' ')
    setOrdersData(prev => ({ ...prev, items: (prev?.items || []).map(o => o.id === modal.order.id
      ? { ...o, user: { ...o.user, name, phone: editForm.phone || null, email: editForm.email || null } }
      : o) }))
    setModal(null)
  }

  function saveSlot() {
    if (!slotPick.slot) return
    setOrdersData(prev => ({ ...prev, items: (prev?.items || []).map(o => o.id === modal.order.id
      ? { ...o, slot: { date: slotPick.date, startTime: slotPick.slot.startTime, endTime: slotPick.slot.endTime } }
      : o) }))
    setModal(null)
  }

  function updateStatus(orderId, status) {
    setOrdersData(prev => ({ ...prev, items: (prev?.items || []).map(o => o.id === orderId ? { ...o, status } : o) }))
  }

  function copyIp(orderId, ip) {
    navigator.clipboard?.writeText(ip).catch(() => {})
    setCopiedId(orderId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function exportCSV() {
    await exportOrdersMutation({
      orderId: filters.orderId,
      userInfo: filters.userInfo,
      orderDateFrom: filters.orderDateFrom,
      orderDateTo: filters.orderDateTo,
      slotDateFrom: filters.slotDateFrom,
      slotDateTo: filters.slotDateTo,
      status: filters.statuses,
    })
    setShowExportConfirm(false)
  }

  function orderExportFilters() {
    const items = []
    if (filters.orderId) items.push(`Order ID: ${filters.orderId}`)
    if (filters.userInfo) items.push(`User Info: ${filters.userInfo}`)
    if (filters.couponCode) items.push(`Coupon Code: ${filters.couponCode}`)
    items.push(`Order Status: ${filters.statuses.length ? filters.statuses.map(s => t[STATUS_T[s]] || s).join(', ') : 'All'}`)
    items.push(`Slot Date Range: ${filters.slotDateFrom || 'No limit'} - ${filters.slotDateTo || 'No limit'}`)
    if (filters.slotStart) items.push(`Slot Start: ${filters.slotStart}`)
    if (filters.orderDateFrom || filters.orderDateTo) items.push(`Order Date Range: ${filters.orderDateFrom || 'No limit'} - ${filters.orderDateTo || 'No limit'}`)
    return items
  }

  function toggleStatus(s) {
    setFilters(f => ({ ...f, statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s] }))
    setPage(1)
  }

  function resetFilters() {
    setFilters({ orderId: '', userInfo: '', couponCode: '', orderDateFrom: '', orderDateTo: '', slotDateFrom: '', slotDateTo: '', slotStart: '', statuses: [] })
    setPage(1)
  }

  const filtered = useMemo(() => orders.filter(o => {
    if (filters.orderId && !o.id.includes(filters.orderId)) return false
    if (filters.couponCode && o.couponCode?.toLowerCase() !== filters.couponCode.toLowerCase()) return false
    if (filters.orderDateFrom && o.createdAt.slice(0, 10) < filters.orderDateFrom) return false
    if (filters.orderDateTo && o.createdAt.slice(0, 10) > filters.orderDateTo) return false
    if (filters.slotDateFrom && o.slot.date < filters.slotDateFrom) return false
    if (filters.slotDateTo && o.slot.date > filters.slotDateTo) return false
    if (filters.slotStart && o.slot.startTime !== filters.slotStart) return false
    if (filters.userInfo) {
      const q = filters.userInfo.toLowerCase()
      if (!o.user.name?.toLowerCase().includes(q) && !o.user.email?.toLowerCase().includes(q) && !o.user.phone?.includes(q)) return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(o.status)) return false
    return true
  }), [orders, filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const popoverOrder = popover ? orders.find(o => o.id === popover.orderId) : null

  const labelStyle = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }
  const inlineActions = { display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', verticalAlign: 'middle' }

  return (
    <div onClick={() => setPopover(null)}>
      {showExportConfirm && (
        <ExportConfirmDialog
          title="Confirm Action"
          message="You are about to export order data"
          filters={orderExportFilters()}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={exportCSV}
        />
      )}
      {/* Header */}
      {loadError && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Backend orders could not be loaded: {loadError.message}
        </div>
      )}
      {loadingOrders && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Loading live orders...</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-shopping-cart" style={{ color: '#6366f1' }} />
            {t.ordersManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{t.manageOrders}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setShowExportConfirm(true)} disabled={exporting}>
          <i className="fa fa-file-export" /> {t.exportCSV}
        </button>
      </div>

      {/* Filters */}
      <div className="filter-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>{t.orderID}</label>
            <input className="form-input" placeholder="Enter order ID..." value={filters.orderId} onChange={e => setFilters(f => ({ ...f, orderId: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>{t.userInfo}</label>
            <input className="form-input" placeholder="Enter name/phone/email..." value={filters.userInfo} onChange={e => setFilters(f => ({ ...f, userInfo: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>{t.couponCode}</label>
            <input className="form-input" placeholder={t.couponCode} value={filters.couponCode} onChange={e => setFilters(f => ({ ...f, couponCode: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>{t.orderDateRange}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" type="date" value={filters.orderDateFrom} onChange={e => setFilters(f => ({ ...f, orderDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.orderDateTo} onChange={e => setFilters(f => ({ ...f, orderDateTo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t.slotDateRange}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" type="date" value={filters.slotDateFrom} onChange={e => setFilters(f => ({ ...f, slotDateFrom: e.target.value }))} />
              <input className="form-input" type="date" value={filters.slotDateTo} onChange={e => setFilters(f => ({ ...f, slotDateTo: e.target.value }))} />
            </div>
            {filters.slotStart && (
              <div style={{ marginTop: 5, fontSize: 12, color: '#4f46e5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Slot start: {filters.slotStart}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary btn-sm" onClick={resetFilters}>
              <i className="fa fa-redo" /> {t.reset}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginRight: 4 }}>{t.status}:</span>
          {STATUS_LIST.map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={filters.statuses.includes(s)} onChange={() => toggleStatus(s)} style={{ width: 14, height: 14 }} />
              <span className={`badge ${STATUS_BADGE[s]}`}>{t[STATUS_T[s]]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="orders-table-container" style={{ overflowX: 'auto' }}>
          <table className="orders-table" style={{ tableLayout: 'auto', minWidth: 1420, whiteSpace: 'nowrap' }}>
            <colgroup>
              <col style={{ width: 130 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 175 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 95 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 160 }} />
            </colgroup>
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
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>{t.noOrdersFound}</td></tr>
              ) : paged.map(o => (
                <tr key={o.id} onClick={e => e.stopPropagation()}>
                  {/* Order ID */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', fontSize: 12 }}>#{o.id}</span>
                  </td>

                  {/* User Info */}
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>{o.user.name}</div>
                        {o.user.email && <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{o.user.email}</div>}
                        {o.user.phone && <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{o.user.phone}</div>}
                      </div>
                      <IconBtn icon="fa-pen" onClick={() => openModal('editUser', o)} title={t.editOrderInfo} color="#6366f1" bg="#eef2ff" />
                    </div>
                  </td>

                  {/* Email Status */}
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span className={`badge ${o.emailStatus === 'sent' ? 'badge-green' : 'badge-gray'}`}>
                        {o.emailStatus === 'sent' ? <><i className="fa fa-check" style={{ marginRight: 3 }} />{t.sent}</> : t.notSent}
                      </span>
                      {o.emailStatus === 'sent' && (
                        <IconBtn icon="fa-info-circle" onClick={e => openPopover('email', o.id, e)} title={t.sendHistory} color="#6366f1" bg="#eef2ff" />
                      )}
                    </div>
                  </td>

                  {/* Slot Info */}
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {o.slot.date.slice(5)} {o.slot.startTime}–{o.slot.endTime}
                      </span>
                      <IconBtn icon="fa-calendar" onClick={() => navigate('/slots')} title={t.viewSlot} color="#6366f1" bg="#eef2ff" />
                      <IconBtn icon="fa-exchange-alt" onClick={() => openModal('changeSlot', o)} title={t.changeOrderSlot} amber />
                    </div>
                  </td>

                  {/* Ticket Count */}
                  <td>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {o.ticketCount.notUsed > 0 ? (
                          <span className="badge badge-orange" style={{ whiteSpace: 'nowrap' }}>{o.ticketCount.notUsed} {t.notUsed}</span>
                        ) : (
                          <span className="badge badge-green"><i className="fa fa-check" style={{ marginRight: 3 }} />{t.completed}</span>
                        )}
                        <IconBtn icon="fa-info-circle" onClick={e => openPopover('ticket', o.id, e)} title={t.ticketDetails} color="#6366f1" bg="#eef2ff" />
                        <IconBtn icon="fa-eye" onClick={() => navigate('/tickets')} title={t.viewTickets} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{t.total}: {o.ticketCount.total}</div>
                    </div>
                  </td>

                  {/* Amount */}
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600 }}>${o.amount.toFixed(2)}</span>
                      <IconBtn icon="fa-info-circle" onClick={e => openPopover('amount', o.id, e)} title={t.amountDetails} color="#6366f1" bg="#eef2ff" />
                    </div>
                  </td>

                  {/* Coupon */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.couponDiscount < 0 ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: '#dc2626', fontWeight: 500, fontSize: 13 }}>{o.couponDiscount.toFixed(2)}</span>
                        <IconBtn icon="fa-tag" onClick={e => openPopover('coupon', o.id, e)} title="Coupon Details" color="#6366f1" bg="#eef2ff" />
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>

                  {/* Remarks */}
                  <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'normal', maxWidth: 120 }}>{o.remarks || '-'}</td>

                  {/* Status */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <select
                      value={STATUS_LIST.includes(o.status) ? o.status : STATUS_LIST[0]}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: 12, width: 'auto', minWidth: 110 }}
                    >
                      {STATUS_LIST.map(s => <option key={s} value={s}>{t[STATUS_T[s]]}</option>)}
                    </select>
                  </td>

                  {/* Payment Method */}
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <div style={inlineActions}>
                      {o.paymentMethod === 'Instore Credit' && <i className="fa fa-store" style={{ color: '#6366f1', fontSize: 11 }} />}
                      {o.paymentMethod}
                    </div>
                  </td>

                  {/* Created At / IP */}
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <div>
                        <div style={{ fontSize: 12 }}>{o.createdAt}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>By {o.createdBy.split('(')[0].trim()}</div>
                      </div>
                      <IconBtn icon="fa-info-circle" onClick={e => openPopover('ip', o.id, e)} title={t.ipAddress} color="#6366f1" bg="#eef2ff" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {/* Popover */}
      {popover && popoverOrder && (
        <Popover rect={popover.rect} onClose={() => setPopover(null)} width={popover.type === 'ip' ? 300 : popover.type === 'coupon' ? 220 : 280}>
          {popover.type === 'email' && <EmailHistoryContent order={popoverOrder} t={t} />}
          {popover.type === 'ticket' && <TicketDetailContent order={popoverOrder} t={t} />}
          {popover.type === 'amount' && <AmountDetailContent order={popoverOrder} t={t} />}
          {popover.type === 'ip' && <IpContent order={popoverOrder} t={t} copiedId={copiedId} onCopy={copyIp} />}
          {popover.type === 'coupon' && <CouponContent order={popoverOrder} />}
        </Popover>
      )}

      {/* Edit User Modal */}
      {modal?.type === 'editUser' && (
        <Modal title={<><i className="fa fa-pen" />{t.editOrderInfo}</>} onClose={() => setModal(null)}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>{t.firstName}</label>
                <input className="form-input" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>{t.lastName}</label>
                <input className="form-input" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t.phone}</label>
              <input className="form-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>{t.email}</label>
              <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid #f3f4f6' }}>
            <button className="btn-secondary" onClick={() => setModal(null)}>{t.cancel}</button>
            <button className="btn-primary" onClick={saveUser}><i className="fa fa-save" style={{ marginRight: 4 }} />{t.save}</button>
          </div>
        </Modal>
      )}

      {/* Change Slot Modal */}
      {modal?.type === 'changeSlot' && (() => {
        const order = modal.order
        const constraints = getOrderConstraints(order)
        const availDates = getAvailableDates(slots)
        const availTimes = getAvailableTimes(slots, slotPick.date)
        return (
          <Modal title={<><i className="fa fa-exchange-alt" />{t.changeOrderSlot}</>} onClose={() => setModal(null)} width={640}>
            {/* Constraints box */}
            <div style={{ margin: '16px 16px 0', padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6, fontSize: 13 }}>
                <div><span style={{ color: '#6b7280' }}>{t.ticketCount}: </span><strong>{order.ticketCount.total}</strong></div>
                <div><span style={{ color: '#6b7280' }}>{t.allowedDays}: </span><strong>{constraints.weekdays.join(', ')}</strong></div>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#6b7280' }}>{t.allowedTime}: </span>
                <strong>{constraints.timeStart ? `${constraints.timeStart} – ${constraints.timeEnd}` : t.noTimeRestriction}</strong>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa fa-info-circle" />
                {t.constraintsNote}
              </div>
            </div>

            {/* Date / Time panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', margin: 16, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {/* Left: dates */}
              <div style={{ borderRight: '1px solid #e5e7eb' }}>
                <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6, background: '#fafafa' }}>
                  <i className="fa fa-calendar" style={{ color: '#6366f1' }} />{t.selectDate}
                </div>
                <div style={{ maxHeight: 260, overflow: 'auto' }}>
                  {availDates.length === 0 ? (
                    <div style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>{t.noSlotsFound}</div>
                  ) : availDates.map(d => (
                    <div
                      key={d}
                      onClick={() => setSlotPick(p => ({ ...p, date: d, slot: null }))}
                      style={{
                        padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: slotPick.date === d ? '#eef2ff' : 'transparent',
                        color: slotPick.date === d ? '#6366f1' : '#374151',
                        fontWeight: slotPick.date === d ? 600 : 400,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {formatDateShort(d)}
                      <i className="fa fa-chevron-right" style={{ fontSize: 10, color: '#9ca3af' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: times */}
              <div>
                <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6, background: '#fafafa' }}>
                  <i className="fa fa-clock" style={{ color: '#6366f1' }} />{t.selectTime}
                </div>
                <div style={{ maxHeight: 260, overflow: 'auto' }}>
                  {!slotPick.date ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 16 }}>
                      <i className="fa fa-calendar-times" style={{ fontSize: 28, marginBottom: 10, opacity: 0.35 }} />
                      {t.pleaseSelectDate}
                    </div>
                  ) : availTimes.length === 0 ? (
                    <div style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>{t.noSlotsFound}</div>
                  ) : availTimes.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSlotPick(p => ({ ...p, slot: s }))}
                      style={{
                        padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: slotPick.slot?.id === s.id ? '#eef2ff' : 'transparent',
                        color: slotPick.slot?.id === s.id ? '#6366f1' : '#374151',
                        fontWeight: slotPick.slot?.id === s.id ? 600 : 400,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <span>{s.startTime} – {s.endTime}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {s.inStoreSeats + s.websiteSeats} / {s.totalSeats}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resend checkbox */}
            <div style={{ margin: '0 16px 16px', padding: '10px 14px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={slotPick.resend}
                  onChange={e => setSlotPick(p => ({ ...p, resend: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: '#6366f1' }}
                />
                <i className="fa fa-envelope" style={{ color: '#d97706' }} />
                <span style={{ fontWeight: 500, color: '#92400e' }}>{t.resendEmailAfterChange}</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
              <button className="btn-secondary" onClick={() => setModal(null)}>{t.cancel}</button>
              <button
                className="btn-primary"
                onClick={saveSlot}
                disabled={!slotPick.slot}
                style={{ opacity: slotPick.slot ? 1 : 0.5, cursor: slotPick.slot ? 'pointer' : 'not-allowed' }}
              >
                <i className="fa fa-exchange-alt" style={{ marginRight: 4 }} />{t.confirmChange}
              </button>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
