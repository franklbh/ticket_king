import { useState, useMemo } from 'react'
import Button from '@mui/material/Button'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { createTicketType, updateTicketType } from '../api/adminApi'
import { AdminAlert, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import { ResetFiltersButton, SelectFilter, TextFilter } from '../components/FilterControls'
import { adminQueryKeys } from '../hooks/queries'
import { useEventsQuery, useTicketTypesQuery } from '../hooks/catalog'
import { useAdminMutation } from '../hooks/useAdminApi'

function ticketTypePayload(form) {
  const name = typeof form.name === 'string' ? form.name : form.name?.en || ''
  return {
    event: form.event,
    name,
    priceType: 'fixed',
    price: form.price,
    priceAdj: form.priceAdj ?? 0,
    weekdays: form.weekdays,
    validFrom: form.validFrom,
    validTo: form.validTo,
    timeStart: form.timeStart,
    timeEnd: form.timeEnd,
    remarks: form.remarks,
    status: form.status || (form.enabled ? 'enabled' : 'disabled'),
  }
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TYPE_META = {
  'Adult':                      { icon: 'fa-user',   desc: 'Standard adult admission' },
  'Child (7-15)':               { icon: 'fa-child',  desc: 'Ages 7–15' },
  'Senior (65+)':               { icon: 'fa-user',   desc: 'Ages 65 and above' },
  'Group (6+ people)':          { icon: 'fa-users',  desc: 'Minimum 6 people, per person' },
  'Family (2 adults + 1 child)':{ icon: 'fa-home',   desc: '2 adults + 1 child, per person' },
  'Early Bird':                 { icon: 'fa-clock',  desc: 'Limited period offer' },
  'VIP':                        { icon: 'fa-star',   desc: 'VIP Lounge add-on experience' },
}

const LANGS = [
  { key: 'en', label: 'English' },
  { key: 'zhHans', label: '简体中文' },
  { key: 'zhHant', label: '繁體中文' },
]

function LangTabs({ active, onSelect }) {
  return (
    <div style={{ display: 'flex', marginBottom: 6 }}>
      {LANGS.map((l, i) => (
        <button key={l.key} type="button" onClick={() => onSelect(l.key)} style={{
          padding: '4px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          border: '1px solid #e5e7eb',
          borderRight: i < LANGS.length - 1 ? 'none' : '1px solid #e5e7eb',
          borderRadius: i === 0 ? '4px 0 0 4px' : i === LANGS.length - 1 ? '0 4px 4px 0' : 0,
          background: active === l.key ? '#6366f1' : '#fff',
          color: active === l.key ? '#fff' : '#374151',
        }}>{l.label}</button>
      ))}
    </div>
  )
}

function TypeModal({ type, events, onClose, onSave }) {
  const initName = typeof type?.name === 'object' ? type.name : { en: type?.name || '', zhHans: '', zhHant: '' }
  const [form, setForm] = useState({
    event: type?.event || 1,
    name: initName,
    notice: type?.notice || { en: '', zhHans: '', zhHant: '' },
    remarks: type?.remarks || '',
    price: type?.price || 0,
    priceAdj: type?.priceAdj || 0,
    validFrom: type?.validFrom || '2000-01-01',
    validTo: type?.validTo || '2099-12-31',
    timeStart: type?.timeStart || '00:00',
    timeEnd: type?.timeEnd || '23:59',
    discount: type?.discount || { percent: 0, start: '', end: '', message: { en: '', zhHans: '', zhHant: '' } },
    weekdays: type?.weekdays || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    enabled: type ? type.status !== 'disabled' : true,
  })
  const [nameLang, setNameLang] = useState('en')
  const [noticeLang, setNoticeLang] = useState('en')
  const [discMsgLang, setDiscMsgLang] = useState('en')

  function toggleDay(d) {
    setForm(f => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d] }))
  }

  function handleSave() {
    onSave({ ...form, name: form.name.en, status: form.enabled ? 'enabled' : 'disabled' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{type ? 'Edit Ticket Type Rule' : 'Create Ticket Type Rule'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>
              Event <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select className="form-select" value={form.event} onChange={e => setForm(f => ({ ...f, event: Number(e.target.value) }))}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>

          {/* Ticket Name */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Ticket Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <LangTabs active={nameLang} onSelect={setNameLang} />
            <input className="form-input" value={form.name[nameLang]} onChange={e => setForm(f => ({ ...f, name: { ...f.name, [nameLang]: e.target.value } }))} placeholder="Enter ticket name..." />
          </div>

          {/* Notice / Hint */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Notice / Hint</label>
            <LangTabs active={noticeLang} onSelect={setNoticeLang} />
            <input className="form-input" value={form.notice[noticeLang]} onChange={e => setForm(f => ({ ...f, notice: { ...f.notice, [noticeLang]: e.target.value } }))} placeholder="Optional notice shown to customers..." />
          </div>

          {/* Remarks */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>
              Remarks
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>Internal use only — not shown to customers</span>
            </label>
            <textarea className="form-input" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Off-peak tier, admin notes..." style={{ resize: 'vertical' }} />
          </div>

          {/* Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Fixed Price ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Base ticket price</div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Float Price (±)</label>
              <input className="form-input" type="number" step="0.01" value={form.priceAdj} onChange={e => setForm(f => ({ ...f, priceAdj: Number(e.target.value) }))} placeholder="0.00" />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Dynamic adjustment amount</div>
            </div>
          </div>

          {/* Valid From / Until */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid From</label>
              <input className="form-input" type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || '2000-01-01' }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid Until</label>
              <input className="form-input" type="date" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value || '2099-12-31' }))} />
            </div>
          </div>

          {/* Time Range */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Start Time</label>
                <input className="form-input" type="time" value={form.timeStart} onChange={e => setForm(f => ({ ...f, timeStart: e.target.value || '00:00' }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>End Time</label>
                <input className="form-input" type="time" value={form.timeEnd} onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value || '23:59' }))} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Available time range (inclusive start, exclusive end)</div>
          </div>

          {/* Discount Settings */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <i className="fa fa-tag" style={{ color: '#d97706' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>Discount Settings</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Discount Percentage</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="form-input" type="number" min="0" max="100" step="1" value={form.discount.percent} onChange={e => setForm(f => ({ ...f, discount: { ...f.discount, percent: Number(e.target.value) } }))} style={{ maxWidth: 100 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#d97706' }}>%</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>e.g. enter 25 for 25% off</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Discount Start</label>
                  <input className="form-input" type="datetime-local" value={form.discount.start} onChange={e => setForm(f => ({ ...f, discount: { ...f.discount, start: e.target.value } }))} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Discount End</label>
                  <input className="form-input" type="datetime-local" value={form.discount.end} onChange={e => setForm(f => ({ ...f, discount: { ...f.discount, end: e.target.value } }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Discount Message</label>
                <LangTabs active={discMsgLang} onSelect={setDiscMsgLang} />
                <input className="form-input" value={form.discount.message[discMsgLang]} onChange={e => setForm(f => ({ ...f, discount: { ...f.discount, message: { ...f.discount.message, [discMsgLang]: e.target.value } } }))} placeholder="e.g. Summer Sale" />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Leave empty to not display</div>
              </div>
            </div>
          </div>

          {/* Weekdays */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Available Weekdays <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {ALL_DAYS.map(d => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.weekdays.includes(d)} onChange={() => toggleDay(d)} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{d}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Enable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f5f3ff', borderRadius: 8, border: '1px solid #e0e7ff' }}>
            <input type="checkbox" id="enabled-check" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} style={{ accentColor: '#6366f1', width: 16, height: 16 }} />
            <label htmlFor="enabled-check" style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', cursor: 'pointer', margin: 0 }}>Enable this ticket type</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

const SCHEDULE_TIERS = [
  {
    key: 'off-peak', label: 'Off-Peak',
    color: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
    rules: ['Mon – Thu · 10:00 – 19:30', 'Fri · 10:00 – 14:00'],
  },
  {
    key: 'peak', label: 'Peak',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    rules: ['Fri · 14:00 – 20:30', 'Sat – Sun · 10:00 – 20:30'],
  },
]

function PriceCell({ price, color, bg, border, editing, editValue, onStart, onChange, onCommit, onCancel }) {
  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>$</span>
        <input
          autoFocus
          type="number" step="0.01" min="0"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{ width: 72, padding: '5px 6px', border: `1px solid ${color}`, borderRadius: 6, fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none', color }}
        />
      </div>
    )
  }
  if (price == null) return <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
  return (
    <button type="button" onClick={onStart} style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 7,
      padding: '7px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 16, fontWeight: 800, color,
    }}>
      ${price.toFixed(2)}
      <i className="fa fa-pencil-alt" style={{ fontSize: 10, opacity: 0.5 }} />
    </button>
  )
}

export default function TicketTypes() {
  const { lang } = useLang()
  const t = useT(lang)
  const { data: loadedTypes, error: loadError, loading: loadingTypes, reload } = useTicketTypesQuery(
    false,
    { initialData: [] }
  )
  const { data: events = [] } = useEventsQuery({ initialData: [] })
  const types = loadedTypes || []

  const saveType = useAdminMutation(
    async (form, existing) => {
      const payload = ticketTypePayload(form)
      if (existing?.id) return updateTicketType(existing.id, payload)
      return createTicketType(payload)
    },
    { invalidateQueries: adminQueryKeys.ticketTypes, successMessage: 'Ticket type saved.' }
  )
  const [filters, setFilters] = useState({ search: '', status: 'all' })
  const [modal, setModal] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { name, tier }
  const [editValue, setEditValue] = useState('')

  const rows = useMemo(() => {
    const seen = new Set()
    const names = types.filter(tp => { if (seen.has(tp.name)) return false; seen.add(tp.name); return true }).map(tp => tp.name)
    return names
      .filter(name => {
        if (filters.search && !name.toLowerCase().includes(filters.search.toLowerCase())) return false
        const nr = types.filter(tp => tp.name === name)
        if (filters.status !== 'all' && !nr.some(r => r.status === filters.status)) return false
        return true
      })
      .map(name => {
        const nr = types.filter(tp => tp.name === name)
        const offPeakRows = nr.filter(r => r.remarks?.toLowerCase().includes('off-peak'))
        const peakRows = nr.filter(r => r.remarks?.toLowerCase().includes('peak') && !r.remarks?.toLowerCase().includes('off-peak'))
        return {
          name,
          offPeakPrice: offPeakRows[0]?.price ?? null,
          peakPrice: peakRows[0]?.price ?? null,
          singlePrice: (!offPeakRows.length && !peakRows.length) ? nr[0]?.price ?? null : null,
          anyEnabled: nr.some(r => r.status === 'enabled'),
          meta: TYPE_META[name] || { icon: 'fa-tag', desc: '' },
          firstRow: nr[0],
        }
      })
  }, [types, filters])

  async function handleSave(form) {
    const existing = modal === 'create' ? null : modal
    await saveType.mutate(form, existing)
    setModal(null)
    reload()
  }

  async function toggleStatus(name) {
    const rows = types.filter(tp => tp.name === name)
    const anyEnabled = rows.some(r => r.status === 'enabled')
    const nextStatus = anyEnabled ? 'disabled' : 'enabled'
    await Promise.all(rows.map(row => updateTicketType(row.id, { ...ticketTypePayload(row), status: nextStatus })))
    reload()
  }

  function startEdit(name, tier, price) {
    setEditingCell({ name, tier })
    setEditValue(price?.toFixed(2) ?? '0.00')
  }

  async function commitEdit() {
    if (!editingCell) return
    const newPrice = parseFloat(editValue)
    if (!isNaN(newPrice) && newPrice >= 0) {
      const isOffPeak = editingCell.tier === 'off-peak'
      let targets = types.filter(tp => {
        if (tp.name !== editingCell.name) return false
        const remarks = tp.remarks?.toLowerCase() ?? ''
        return isOffPeak
          ? remarks.includes('off-peak')
          : remarks.includes('peak') && !remarks.includes('off-peak')
      })
      if (!targets.length) {
        targets = types.filter(tp => tp.name === editingCell.name)
      }
      await Promise.all(
        targets.map(row => updateTicketType(row.id, { ...ticketTypePayload({ ...row, price: newPrice }), price: newPrice }))
      )
      reload()
    }
    setEditingCell(null)
  }

  if (loadingTypes) {
    return <LoadingIndicator label="Loading live ticket types..." />
  }

  return (
    <div>
      {modal && (
        <TypeModal
          type={modal === 'create' ? null : modal}
          events={events}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {loadError && (
        <AdminAlert tone="warning">
          Backend ticket types could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      <PageHeader
        icon="fa-tags"
        title={t.ticketTypesManagement}
        subtitle="Click any price to edit inline"
        actions={
          <Button variant="contained" onClick={() => setModal('create')} startIcon={<i className="fa fa-plus" />}>
            {t.createTicketType}
          </Button>
        }
      />

      {/* Schedule reference */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {SCHEDULE_TIERS.map(s => (
          <div key={s.key} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              <i className="fa fa-clock" style={{ marginRight: 5 }} />{s.label} Schedule
            </div>
            {s.rules.map(rule => (
              <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', marginBottom: 2 }}>
                <i className="fa fa-circle" style={{ fontSize: 4, color: s.color }} />
                {rule}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterCard className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(180px, 240px) auto', gap: 12, alignItems: 'end' }}>
          <TextFilter
            label="Search"
            placeholder="Search ticket type..."
            value={filters.search}
            onChange={value => setFilters(f => ({ ...f, search: value }))}
          />
          <SelectFilter
            label={t.status}
            value={filters.status}
            onChange={value => setFilters(f => ({ ...f, status: value }))}
            options={[
              { value: 'all', label: t.allStatus },
              { value: 'enabled', label: t.enabled },
              { value: 'disabled', label: t.disabled },
            ]}
          />
          <ResetFiltersButton label={t.reset} onClick={() => setFilters({ search: '', status: 'all' })} />
        </div>
      </FilterCard>

      {/* Price Matrix Table */}
      <TableShell>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f8fafc', borderBottom: '2px solid #e5e7eb', width: '35%' }}>
                Ticket Type
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', background: '#f0fdf4', borderBottom: '2px solid #86efac', borderLeft: '1px solid #d1fae5' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#059669' }}>
                  <i className="fa fa-moon" />Off-Peak
                </span>
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', background: '#fffbeb', borderBottom: '2px solid #fbbf24', borderLeft: '1px solid #fde68a' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                  <i className="fa fa-sun" />Peak
                </span>
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f8fafc', borderBottom: '2px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>
                Status
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f8fafc', borderBottom: '2px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyTableRow colSpan={5}>{t.noTicketTypesFound}</EmptyTableRow>
            ) : rows.map((row, idx) => (
              <tr key={row.name} style={{
                borderBottom: idx < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
                opacity: row.anyEnabled ? 1 : 0.55,
                background: row.anyEnabled ? '#fff' : '#fafafa',
              }}>
                {/* Type info */}
                <td style={{ padding: '13px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: row.anyEnabled ? '#eef2ff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fa ${row.meta.icon}`} style={{ color: row.anyEnabled ? '#6366f1' : '#9ca3af', fontSize: 14 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{row.meta.desc}</div>
                    </div>
                  </div>
                </td>

                {/* Off-Peak price */}
                <td style={{ padding: '13px 18px', textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                  <PriceCell
                    price={row.offPeakPrice ?? row.singlePrice}
                    color="#059669" bg="#f0fdf4" border="#bbf7d0"
                    editing={editingCell?.name === row.name && editingCell?.tier === 'off-peak'}
                    editValue={editValue}
                    onStart={() => startEdit(row.name, 'off-peak', row.offPeakPrice ?? row.singlePrice)}
                    onChange={setEditValue}
                    onCommit={commitEdit}
                    onCancel={() => setEditingCell(null)}
                  />
                </td>

                {/* Peak price */}
                <td style={{ padding: '13px 18px', textAlign: 'center', borderLeft: '1px solid #fde68a' }}>
                  <PriceCell
                    price={row.peakPrice}
                    color="#d97706" bg="#fffbeb" border="#fde68a"
                    editing={editingCell?.name === row.name && editingCell?.tier === 'peak'}
                    editValue={editValue}
                    onStart={() => startEdit(row.name, 'peak', row.peakPrice)}
                    onChange={setEditValue}
                    onCommit={commitEdit}
                    onCancel={() => setEditingCell(null)}
                  />
                </td>

                {/* Status */}
                <td style={{ padding: '13px 18px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                  <span className={`badge ${row.anyEnabled ? 'badge-green' : 'badge-disabled'}`}>
                    {row.anyEnabled ? t.enabled : t.disabled}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '13px 18px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <Button variant="contained" size="small" onClick={() => setModal(row.firstRow)} startIcon={<i className="fa fa-edit" />}>
                      {t.edit}
                    </Button>
                    <Button
                      onClick={() => toggleStatus(row.name)}
                      size="small"
                      variant="contained"
                      color={row.anyEnabled ? 'warning' : 'success'}
                      startIcon={<i className={`fa fa-${row.anyEnabled ? 'ban' : 'check'}`} />}
                    >
                      {row.anyEnabled ? t.disable : t.enable}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  )
}
