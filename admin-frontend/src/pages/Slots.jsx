import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { createSlot, updateSlot } from '../api/adminApi'
import { AdminAlert, AdminPagination, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import { adminQueryKeys } from '../hooks/queries'
import { useEventsQuery, useSlotsQuery } from '../hooks/catalog'
import { useAdminMutation } from '../hooks/useAdminApi'
import { addDays, formatDateWithDay, todayIso } from '../utils/date'
import { DateRangeFilter, ResetFiltersButton, SelectFilter } from '../components/FilterControls'

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
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{slot ? 'Edit Slot' : 'Create Slot'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Select size="small" value={form.event} onChange={e => setForm(f => ({ ...f, event: Number(e.target.value) }))}>
            {events.map(ev => <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>)}
          </Select>
          <TextField size="small" type="date" label="Date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
          <div className="grid grid-cols-2 gap-3">
            <TextField size="small" type="time" label="Start Time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="time" label="End Time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField size="small" type="number" label="Price ($)" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            <TextField size="small" type="number" label="Total Seats" value={form.totalSeats} onChange={e => setForm(f => ({ ...f, totalSeats: Number(e.target.value) }))} />
          </div>
          <Select size="small" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{'Cancel'}</Button>
        <Button variant="contained" onClick={() => onSave(form)}>Save</Button>
      </DialogActions>
    </Dialog>
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
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<i className="fa fa-edit" />}>{t.batchEdit}</Button>
          <Button variant="contained" size="small" onClick={() => setModal('create')}>{t.createSlot}</Button>
        </Stack>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_2fr_1fr_auto] mb-3">
          <SelectFilter label={t.event} value={filters.event} onChange={value => setFilters(f => ({ ...f, event: value }))} options={[{ value: 'all', label: t.allEvents }, ...events.map(ev => ({ value: String(ev.id), label: ev.name }))]} />
          <DateRangeFilter label="Date Range" from={filters.dateFrom} to={filters.dateTo} onFromChange={value => setFilters(f => ({ ...f, dateFrom: value }))} onToChange={value => setFilters(f => ({ ...f, dateTo: value }))} />
          <SelectFilter label={t.status} value={filters.status} onChange={value => setFilters(f => ({ ...f, status: value }))} options={[{ value: 'all', label: t.allStatus }, { value: 'active', label: t.active }, { value: 'disabled', label: t.disabled }]} />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <ResetFiltersButton onClick={() => setFilters({ event: 'all', dateFrom: '', dateTo: '', status: 'all', todayOnly: false, hideUnsold: false })} label={t.reset} />
          </div>
        </div>
        <Stack direction="row" spacing={2}>
          <FormControlLabel control={<Checkbox checked={filters.todayOnly} onChange={e => setFilters(f => ({ ...f, todayOnly: e.target.checked }))} />} label={t.todaySlotsOnly} />
          <FormControlLabel control={<Checkbox checked={filters.hideUnsold} onChange={e => setFilters(f => ({ ...f, hideUnsold: e.target.checked }))} />} label={t.hideUnsoldSlots} />
        </Stack>
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
                        <Button
                          onClick={() => navigate(`/orders?slotDate=${encodeURIComponent(s.date)}&slotStart=${encodeURIComponent(s.startTime)}`)}
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: 11 }}
                          startIcon={<i className="fa fa-eye" />}
                        >
                          View
                        </Button>
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
                        <Button variant="contained" size="small" onClick={() => setModal(s)} startIcon={<i className="fa fa-edit" />}>{t.edit}</Button>
                        <Button
                          onClick={() => toggleSlotStatus(s)}
                          variant="contained"
                          color={s.status === 'active' ? 'warning' : 'success'}
                          size="small"
                          startIcon={<i className={`fa fa-${s.status === 'active' ? 'ban' : 'check'}`} />}
                        >
                          {s.status === 'active' ? t.disable : t.enable}
                        </Button>
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
