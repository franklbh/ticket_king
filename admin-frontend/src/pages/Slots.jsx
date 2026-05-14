import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { SLOTS_DATA, EVENTS } from '../data/mockData'

const PAGE_SIZE = 15

function SeatBar({ website, inStore, total }) {
  const sold = website + inStore
  const pct = total > 0 ? (sold / total) * 100 : 0
  const webPct = total > 0 ? (website / total) * 100 : 0
  const inStorePct = total > 0 ? (inStore / total) * 100 : 0
  return (
    <div>
      <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden', position: 'relative', marginBottom: 4 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${webPct}%`, background: '#6366f1' }} />
        <div style={{ position: 'absolute', left: `${webPct}%`, top: 0, height: '100%', width: `${inStorePct}%`, background: '#10b981' }} />
      </div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>
        <span style={{ color: '#6366f1' }}>Website: {website}</span>
        {' · '}
        <span style={{ color: '#10b981' }}>In-store: {inStore}</span>
      </div>
    </div>
  )
}

function SlotModal({ slot, onClose, onSave }) {
  const [form, setForm] = useState(slot || {
    event: 1, date: '', startTime: '', endTime: '', price: 37.95, totalSeats: 20, status: 'active'
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{slot ? 'Edit Slot' : 'Create Slot'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Event</label>
            <select className="form-select" value={form.event} onChange={e => setForm(f => ({ ...f, event: Number(e.target.value) }))} style={{ width: '100%' }}>
              {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Start Time</label>
              <input className="form-input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>End Time</label>
              <input className="form-input" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Price ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Total Seats</label>
              <input className="form-input" type="number" value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save</button>
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateWithDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return { date: dateStr, day: DAYS[d.getDay()] }
}

export default function Slots() {
  const { lang } = useLang()
  const t = useT(lang)
  const [slots, setSlots] = useState(SLOTS_DATA)
  const [filters, setFilters] = useState({
    event: 'all',
    dateFrom: '2026-05-13', dateTo: '2026-11-13',
    status: 'all', todayOnly: false, hideUnsold: false
  })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  const filtered = useMemo(() => {
    return slots.filter(s => {
      if (filters.event !== 'all' && s.event !== Number(filters.event)) return false
      if (filters.dateFrom && s.date < filters.dateFrom) return false
      if (filters.dateTo && s.date > filters.dateTo) return false
      if (filters.status !== 'all' && s.status !== filters.status) return false
      if (filters.todayOnly && s.date !== '2026-05-13') return false
      if (filters.hideUnsold && s.websiteSeats === 0 && s.inStoreSeats === 0) return false
      return true
    })
  }, [slots, filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSave(form) {
    if (modal === 'create') {
      setSlots(prev => [...prev, { ...form, id: Math.max(...prev.map(s => s.id)) + 1, websiteSeats: 0, inStoreSeats: 0 }])
    } else {
      setSlots(prev => prev.map(s => s.id === modal.id ? { ...s, ...form } : s))
    }
    setModal(null)
  }

  function toggleSlotStatus(id) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'disabled' : 'active' } : s))
  }

  return (
    <div>
      {modal && <SlotModal slot={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-calendar" style={{ color: '#7b2020' }} />
            {t.timeSlotsManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage all event slots</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary">
            <i className="fa fa-edit" /> {t.batchEdit}
          </button>
          <button className="btn-primary" onClick={() => setModal('create')}>
            {t.createSlot}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.event}</label>
            <select className="form-select" value={filters.event} onChange={e => setFilters(f => ({ ...f, event: e.target.value }))} style={{ width: '100%' }}>
              <option value="all">{t.allEvents}</option>
              {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date Range</label>
            <input className="form-input" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div style={{ marginTop: 20 }}>
            <input className="form-input" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.status}</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
              <option value="all">{t.allStatus}</option>
              <option value="active">{t.active}</option>
              <option value="disabled">{t.disabled}</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary btn-sm" onClick={() => setFilters({ event: 'all', dateFrom: '', dateTo: '', status: 'all', todayOnly: false, hideUnsold: false })}>
              <i className="fa fa-redo" /> {t.reset}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.todayOnly} onChange={e => setFilters(f => ({ ...f, todayOnly: e.target.checked }))} style={{ width: 14, height: 14 }} />
            {t.todaySlotsOnly}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.hideUnsold} onChange={e => setFilters(f => ({ ...f, hideUnsold: e.target.checked }))} style={{ width: 14, height: 14 }} />
            {t.hideUnsoldSlots}
          </label>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Event</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No slots found</td></tr>
              ) : paged.map(s => {
                const { day } = formatDateWithDay(s.date)
                const sold = s.websiteSeats + s.inStoreSeats
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: '#7b2020', fontFamily: 'monospace', fontSize: 13 }}>#{s.id}</td>
                    <td style={{ fontSize: 13, maxWidth: 250 }}>
                      {EVENTS.find(e => e.id === s.event)?.name}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                      <div>{s.date}</div>
                      <div style={{ color: '#6b7280' }}>{day}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{s.startTime}:00 - {s.endTime}:00</td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>${s.price.toFixed(2)}</span>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <SeatBar website={s.websiteSeats} inStore={s.inStoreSeats} total={s.totalSeats} />
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{sold}/{s.totalSeats}</span>
                        <button style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 6px', fontSize: 11, cursor: 'pointer' }}>
                          <i className="fa fa-eye" /> View
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {s.status === 'active' ? t.active : t.disabled}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary btn-sm" onClick={() => setModal(s)}>
                          <i className="fa fa-edit" /> {t.edit}
                        </button>
                        <button
                          onClick={() => toggleSlotStatus(s.id)}
                          className="btn-sm"
                          style={{ background: s.status === 'active' ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}
                        >
                          {s.status === 'active' ? t.disable : t.enable}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>
    </div>
  )
}
