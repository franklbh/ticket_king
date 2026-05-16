import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { createSlot, updateSlot } from '../api/adminApi'
import { AdminAlert, AdminPagination, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import { adminQueryKeys } from '../hooks/queries'
import { useEventsQuery, useSlotsQuery } from '../hooks/catalog'
import { useAdminMutation } from '../hooks/useAdminApi'
import { addDays, formatDateWithDay, todayIso } from '../utils/date'

const PAGE_SIZE = 15
const TODAY = todayIso()

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

function SlotModal({ slot, events, onClose, onSave }) {
  const [form, setForm] = useState(slot || {
    event: events[0]?.id || 1, date: '', startTime: '', endTime: '', price: 37.95, totalSeats: 20, status: 'active'
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
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
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

export default function Slots() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkedDate = searchParams.get('date')
  const linkedStart = searchParams.get('start')
  const [filters, setFilters] = useState({
    event: 'all',
    dateFrom: linkedDate || TODAY, dateTo: linkedDate || addDays(TODAY, 180),
    status: 'all', todayOnly: false, hideUnsold: false
  })

  const slotParams = useMemo(() => ({
    dateFrom: filters.dateFrom || linkedDate || TODAY,
    dateTo: filters.dateTo || addDays(TODAY, 180),
  }), [filters.dateFrom, filters.dateTo, linkedDate])

  const { data: loadedSlots, error: loadError, loading: loadingSlots, reload } = useSlotsQuery(
    slotParams,
    { initialData: [] }
  )
  const { data: events = [] } = useEventsQuery({ initialData: [] })
  const slots = loadedSlots || []

  const saveSlot = useAdminMutation(
    async (form, existing) => {
      const payload = {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        totalSeats: form.totalSeats,
        price: form.price,
        status: form.status,
      }
      if (existing?.id) return updateSlot(existing.id, payload)
      return createSlot(payload)
    },
    { invalidateQueries: adminQueryKeys.slots, successMessage: 'Slot saved.' }
  )
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  const filtered = useMemo(() => {
    return slots.filter(s => {
      if (filters.event !== 'all' && s.event !== Number(filters.event)) return false
      if (filters.dateFrom && s.date < filters.dateFrom) return false
      if (filters.dateTo && s.date > filters.dateTo) return false
      if (linkedStart && s.startTime !== linkedStart) return false
      if (filters.status !== 'all' && s.status !== filters.status) return false
      if (filters.todayOnly && s.date !== TODAY) return false
      if (filters.hideUnsold && s.websiteSeats === 0 && s.inStoreSeats === 0) return false
      return true
    })
  }, [slots, filters, linkedStart])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loadingSlots) {
    return <LoadingIndicator label="Loading live slots..." />
  }

  async function handleSave(form) {
    const existing = modal === 'create' ? null : modal
    await saveSlot.mutate(form, existing)
    setModal(null)
    reload()
  }

  async function toggleSlotStatus(slot) {
    const nextStatus = slot.status === 'active' ? 'disabled' : 'active'
    await updateSlot(slot.id, {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalSeats: slot.totalSeats,
      price: slot.price,
      status: nextStatus,
    })
    reload()
  }

  return (
    <div>
      {modal && (
        <SlotModal
          slot={modal === 'create' ? null : modal}
          events={events}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {loadError && (
        <AdminAlert tone="warning">
          Backend slots could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      <PageHeader
        icon="fa-calendar"
        title={t.timeSlotsManagement}
        subtitle="Manage all event slots"
        actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary">
            <i className="fa fa-edit" /> {t.batchEdit}
          </button>
          <button className="btn-primary" onClick={() => setModal('create')}>
            {t.createSlot}
          </button>
        </div>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.event}</label>
            <select className="form-select" value={filters.event} onChange={e => setFilters(f => ({ ...f, event: e.target.value }))} style={{ width: '100%' }}>
              <option value="all">{t.allEvents}</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
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
      </FilterCard>

      {/* Table */}
      <TableShell>
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
                <EmptyTableRow colSpan={8}>{t.noSlotsFound}</EmptyTableRow>
              ) : paged.map(s => {
                const { day } = formatDateWithDay(s.date)
                const sold = s.websiteSeats + s.inStoreSeats
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: '#6366f1', fontFamily: 'monospace', fontSize: 13 }}>#{s.id}</td>
                    <td style={{ fontSize: 13, maxWidth: 250 }}>
                      {events.find(e => e.id === s.event)?.name}
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
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{sold}/{s.totalSeats}</span>
                        <button
                          onClick={() => navigate(`/orders?slotDate=${encodeURIComponent(s.date)}&slotStart=${encodeURIComponent(s.startTime)}`)}
                          style={{
                            background: '#eef2ff',
                            border: '1px solid #c7d2fe',
                            color: '#4f46e5',
                            borderRadius: 4,
                            padding: '1px 6px',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <i className="fa fa-eye" /> View
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-disabled'}`} style={{ gap: 5, whiteSpace: 'nowrap' }}>
                        {s.status !== 'active' && <i className="fa fa-ban" style={{ fontSize: 10 }} />}
                        {s.status === 'active' ? t.active : t.disabled}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary btn-sm" onClick={() => setModal(s)}>
                          <i className="fa fa-edit" /> {t.edit}
                        </button>
                        <button
                          onClick={() => toggleSlotStatus(s)}
                          className="btn-sm"
                          style={{
                            background: s.status === 'active' ? '#f59e0b' : '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <i className={`fa fa-${s.status === 'active' ? 'ban' : 'check'}`} />
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
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </TableShell>
    </div>
  )
}
