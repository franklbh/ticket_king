import { Fragment, useState, useMemo } from 'react'
import Button from '@mui/material/Button'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { createEvent, createTicketType, updateTicketType } from '../api/adminApi'
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

const EVENT_STYLE_PALETTE = [
  { icon: 'fa-ticket-alt', accent: '#059669', tint: '#ecfdf5' },
  { icon: 'fa-ticket-alt', accent: '#2563eb', tint: '#eff6ff' },
  { icon: 'fa-ticket-alt', accent: '#7c3aed', tint: '#f5f3ff' },
  { icon: 'fa-ticket-alt', accent: '#0891b2', tint: '#ecfeff' },
  { icon: 'fa-ticket-alt', accent: '#be123c', tint: '#fff1f2' },
  { icon: 'fa-ticket-alt', accent: '#4f46e5', tint: '#eef2ff' },
]

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

function priceTierFromRemarks(remarks = '') {
  const normalized = String(remarks).toLowerCase()
  if (normalized.includes('higher') || (normalized.includes('peak') && !normalized.includes('off-peak'))) return 'higher'
  return 'lower'
}

function stripPriceTierRemark(remarks = '') {
  return String(remarks)
    .replace(/^(lower price|higher price|off-peak|peak)\s*(·|-)?\s*[^,;]*\s*/i, '')
    .trim()
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function eventStyle(index = 0) {
  return EVENT_STYLE_PALETTE[index % EVENT_STYLE_PALETTE.length]
}

function eventToGroup(event, index = 0) {
  const style = eventStyle(index)
  return {
    key: `event-${event.id}`,
    label: event.name,
    icon: style.icon,
    accent: style.accent,
    tint: style.tint,
    primaryEventId: event.id,
    eventIds: [String(event.id)],
    rows: [],
    periods: { lower: [], higher: [] },
  }
}

function TypeModal({ type, events, eventGroups, onClose, onSave, onCreateEvent }) {
  const [extraEventGroups, setExtraEventGroups] = useState([])
  const availableEventGroups = [...eventGroups, ...extraEventGroups.filter(extra => !eventGroups.some(group => group.key === extra.key))]
  const eventOptions = events
    .map(event => ({
      ...event,
      id: String(event.id),
      rawId: event.id,
      displayName: event.name,
      groupKey: availableEventGroups.find(group => group.eventIds.includes(String(event.id)))?.key || `event-${event.id}`,
    }))
  const initName = typeof type?.name === 'object' ? type.name : { en: type?.name || '', zhHans: '', zhHant: '' }
  const initialTier = priceTierFromRemarks(type?.remarks)
  const initialEventOption = eventOptions.find(event => event.id === String(type?.event)) || eventOptions[0]
  const initialGroup = availableEventGroups.find(group => group.key === initialEventOption?.groupKey) || availableEventGroups[0]
  const initialPeriod = firstPeriod(initialGroup, initialTier)
  const initialEvent = type?.event || initialEventOption?.id || initialPeriod?.eventId || initialGroup?.primaryEventId || 1
  const [form, setForm] = useState({
    event: initialEvent,
    eventGroupKey: initialEventOption?.groupKey || initialGroup?.key || '',
    name: initName,
    notice: type?.notice || { en: '', zhHans: '', zhHant: '' },
    priceTier: initialTier,
    remarks: stripPriceTierRemark(type?.remarks || ''),
    price: type?.price == null ? '' : String(type.price),
    priceAdj: type?.priceAdj == null ? '' : String(type.priceAdj),
    validFrom: type?.validFrom || '2000-01-01',
    validTo: type?.validTo || '2099-12-31',
    timeStart: type?.timeStart || initialPeriod?.timeStart || '00:00',
    timeEnd: type?.timeEnd || initialPeriod?.timeEnd || '23:59',
    discount: type?.discount || { percent: 0, start: '', end: '', message: { en: '', zhHans: '', zhHant: '' } },
    weekdays: type?.weekdays || initialPeriod?.weekdays || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    enabled: type ? type.status !== 'disabled' : true,
  })
  const [nameLang, setNameLang] = useState('en')
  const [noticeLang, setNoticeLang] = useState('en')
  const [discMsgLang, setDiscMsgLang] = useState('en')
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: '', slug: '' })
  const [creatingEvent, setCreatingEvent] = useState(false)

  function toggleDay(d) {
    setForm(f => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d] }))
  }

  const selectedGroup = availableEventGroups.find(group => group.key === form.eventGroupKey)
  const selectedPeriod = firstPeriod(selectedGroup, form.priceTier)

  function periodSummary(period) {
    return period ? period.label : 'Custom schedule'
  }

  function setEvent(eventId) {
    setForm(f => {
      const option = eventOptions.find(item => item.id === String(eventId))
      const group = availableEventGroups.find(item => item.key === option?.groupKey)
      const period = firstPeriod(group, f.priceTier)
      return {
        ...f,
        eventGroupKey: option?.groupKey || '',
        event: option?.rawId || eventId,
        ...(period ? {
          weekdays: period.weekdays,
          timeStart: period.timeStart,
          timeEnd: period.timeEnd,
        } : {}),
      }
    })
  }

  function setPriceTier(priceTier) {
    setForm(f => {
      const group = availableEventGroups.find(item => item.key === f.eventGroupKey)
      const period = firstPeriod(group, priceTier)
      return {
        ...f,
        priceTier,
        ...(period ? {
          weekdays: period.weekdays,
          timeStart: period.timeStart,
          timeEnd: period.timeEnd,
        } : {}),
      }
    })
  }

  function handleSave() {
    const tierLabel = form.priceTier === 'higher' ? 'Higher price' : 'Lower price'
    const remarks = [tierLabel, selectedGroup?.label, form.remarks].filter(Boolean).join(' · ')
    onSave({
      ...form,
      price: form.price === '' ? 0 : Number(form.price),
      priceAdj: form.priceAdj === '' ? 0 : Number(form.priceAdj),
      remarks,
      name: form.name.en,
      status: form.enabled ? 'enabled' : 'disabled',
    })
  }

  async function handleCreateEvent() {
    const name = newEvent.name.trim()
    if (!name) return
    setCreatingEvent(true)
    try {
      const event = await onCreateEvent({
        name,
        slug: newEvent.slug.trim() || slugify(name),
        status: 'active',
      })
      const group = eventToGroup(event)
      setExtraEventGroups(groups => [...groups.filter(item => item.key !== group.key), group])
      setForm(f => ({
        ...f,
        event: event.id,
        eventGroupKey: group.key,
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        timeStart: '10:00',
        timeEnd: '19:00',
      }))
      setNewEvent({ name: '', slug: '' })
      setShowNewEvent(false)
    } finally {
      setCreatingEvent(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ticket-type-modal-box" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{type ? 'Edit Ticket Type Rule' : 'Create Ticket Type Rule'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Event */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
                Event <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewEvent(value => !value)}
                style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                {showNewEvent ? 'Cancel New Event' : '+ New Event'}
              </button>
            </div>
            <select className="form-select" value={String(form.event)} onChange={e => setEvent(e.target.value)}>
              {eventOptions.map(event => (
                <option key={event.id} value={event.id}>
                  {event.displayName}
                </option>
              ))}
            </select>
            {showNewEvent && (
              <div style={{ marginTop: 10, border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 8, padding: 12 }}>
                <div className="ticket-type-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Event Name</label>
                    <input
                      className="form-input"
                      value={newEvent.name}
                      onChange={e => setNewEvent(value => ({ ...value, name: e.target.value, slug: value.slug || slugify(e.target.value) }))}
                      placeholder="e.g. New VR Show"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Slug</label>
                    <input
                      className="form-input"
                      value={newEvent.slug}
                      onChange={e => setNewEvent(value => ({ ...value, slug: slugify(e.target.value) }))}
                      placeholder="new-vr-show"
                    />
                  </div>
                </div>
                <div className="ticket-type-new-event-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowNewEvent(false)}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={handleCreateEvent} disabled={creatingEvent || !newEvent.name.trim()}>
                    {creatingEvent ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </div>
            )}
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

          {/* Pricing Period */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Pricing Period <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="ticket-type-modal-tier-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setPriceTier('lower')}
                style={{
                  border: form.priceTier === 'lower' ? '2px solid #059669' : '1px solid #bbf7d0',
                  background: form.priceTier === 'lower' ? '#dcfce7' : '#f0fdf4',
                  color: '#047857',
                  borderRadius: 8,
                  padding: '12px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Lower Price</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#065f46' }}>
                  {periodSummary(firstPeriod(selectedGroup, 'lower'))}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPriceTier('higher')}
                style={{
                  border: form.priceTier === 'higher' ? '2px solid #d97706' : '1px solid #fde68a',
                  background: form.priceTier === 'higher' ? '#fef3c7' : '#fffbeb',
                  color: '#b45309',
                  borderRadius: 8,
                  padding: '12px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Higher Price</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                  {periodSummary(firstPeriod(selectedGroup, 'higher'))}
                </div>
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
              Choose one of the available time windows for this event. This also decides which price column the rule appears in.
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>
              Internal Notes
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>Internal use only — not shown to customers</span>
            </label>
            <textarea className="form-input" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional admin notes..." style={{ resize: 'vertical' }} />
          </div>

          {/* Price */}
          <div className="ticket-type-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Fixed Price ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Base ticket price</div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Float Price (±)</label>
              <input className="form-input" type="number" step="0.01" value={form.priceAdj} onChange={e => setForm(f => ({ ...f, priceAdj: e.target.value }))} placeholder="0.00" />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Dynamic adjustment amount</div>
            </div>
          </div>

          {/* Valid From / Until */}
          <div className="ticket-type-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid From</label>
              <input className="form-input" type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || '2000-01-01' }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid Until</label>
              <input className="form-input" type="date" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value || '2099-12-31' }))} />
            </div>
          </div>

          {selectedGroup && selectedPeriod ? (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>Selected Time Window</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{periodSummary(selectedPeriod)}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Saved as {form.weekdays.join(', ')} · {form.timeStart}–{form.timeEnd}
              </div>
            </div>
          ) : (
            <div>
              <div className="ticket-type-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          )}

          {/* Discount Settings */}
          <div className="ticket-type-discount-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16 }}>
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
              <div className="ticket-type-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

          {(!selectedGroup || !selectedPeriod) && (
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
          )}

          {/* Enable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f5f3ff', borderRadius: 8, border: '1px solid #e0e7ff' }}>
            <input type="checkbox" id="enabled-check" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} style={{ accentColor: '#6366f1', width: 16, height: 16 }} />
            <label htmlFor="enabled-check" style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', cursor: 'pointer', margin: 0 }}>Enable this ticket type</label>
          </div>
        </div>

        <div className="ticket-type-modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

const TIER_STYLES = {
  lower: { label: 'Lower Price', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  higher: { label: 'Higher Price', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

function PriceCell({ price, suffix = '', color, bg, border, editing, editValue, onStart, onChange, onCommit, onCancel, missingLabel, onCreateMissing, creatingMissing }) {
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
  if (price == null) {
    if (onCreateMissing) {
      return (
        <button type="button" onClick={onCreateMissing} disabled={creatingMissing} style={{
          background: '#fff',
          border: `1px dashed ${border}`,
          borderRadius: 7,
          padding: '7px 12px',
          cursor: creatingMissing ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 800,
          color,
          whiteSpace: 'nowrap',
          opacity: creatingMissing ? 0.6 : 1,
        }}>
          <i className="fa fa-plus" style={{ fontSize: 10 }} />
          {creatingMissing ? 'Creating...' : missingLabel}
        </button>
      )
    }
    return <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
  }
  return (
    <button type="button" onClick={onStart} style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 7,
      padding: '7px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 16, fontWeight: 800, color, whiteSpace: 'nowrap', minWidth: 96, justifyContent: 'center',
    }}>
      ${price.toFixed(2)}{suffix}
      <i className="fa fa-pencil-alt" style={{ fontSize: 10, opacity: 0.5 }} />
    </button>
  )
}

function normalizeTime(value) {
  return String(value || '').slice(0, 5)
}

function isActiveEvent(event) {
  return String(event?.status || 'active').toLowerCase() === 'active'
}

function isLowerRule(row) {
  const remarks = String(row?.remarks || '').toLowerCase()
  return remarks.includes('lower') || remarks.includes('off-peak')
}

function isHigherRule(row) {
  const remarks = String(row?.remarks || '').toLowerCase()
  return remarks.includes('higher') || (remarks.includes('peak') && !remarks.includes('off-peak'))
}

function rowTier(row) {
  if (isHigherRule(row)) return 'higher'
  return 'lower'
}

function formatWeekdays(days = []) {
  const set = new Set(days)
  if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(day => set.has(day)) && set.size === 5) return 'Mon–Fri'
  if (['Sat', 'Sun'].every(day => set.has(day)) && set.size === 2) return 'Sat–Sun'
  if (['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].every(day => set.has(day)) && set.size === 5) return 'Sun–Thu'
  if (['Fri', 'Sat'].every(day => set.has(day)) && set.size === 2) return 'Fri–Sat'
  return days.join(', ')
}

function periodKeyFromRow(row) {
  return `${rowTier(row)}|${[...(row.weekdays || [])].sort().join(',')}|${normalizeTime(row.timeStart)}|${normalizeTime(row.timeEnd)}`
}

function periodFromRow(row) {
  const tier = rowTier(row)
  const timeStart = normalizeTime(row.timeStart)
  const timeEnd = normalizeTime(row.timeEnd)
  return {
    key: periodKeyFromRow(row),
    tier,
    eventId: row.event,
    weekdays: row.weekdays || [],
    timeStart,
    timeEnd,
    label: `${formatWeekdays(row.weekdays || [])} ${timeStart}–${timeEnd}`,
  }
}

function uniquePeriods(rows, tier) {
  const periods = new Map()
  rows.filter(row => rowTier(row) === tier).forEach(row => {
    const period = periodFromRow(row)
    if (!periods.has(period.key)) periods.set(period.key, period)
  })
  return [...periods.values()]
}

function firstPeriod(group, tier) {
  return group?.periods?.[tier]?.[0] || null
}

function ruleForTier(rows, tier) {
  return rows.find(row => rowTier(row) === tier)
}

function buildEventGroups(events, ticketTypes) {
  const groups = new Map()
  events.filter(isActiveEvent).forEach((event, index) => {
    const style = eventStyle(index)
    const key = `event-${event.id}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: event.name,
        icon: style.icon,
        accent: style.accent,
        tint: style.tint,
        primaryEventId: event.id,
        eventIds: [],
        rows: [],
        periods: { lower: [], higher: [] },
      })
    }
    groups.get(key).eventIds.push(String(event.id))
  })

  groups.forEach(group => {
    const eventRows = ticketTypes.filter(row => group.eventIds.includes(String(row.event)) && row.status !== 'archived')
    const enabledRows = eventRows.filter(row => row.status === 'enabled')
    group.periods = {
      lower: uniquePeriods(enabledRows, 'lower'),
      higher: uniquePeriods(enabledRows, 'higher'),
    }

    const names = [...new Set(eventRows.map(row => row.name).filter(Boolean))]
    group.rows = names.map(name => {
      const liveRows = eventRows.filter(row => row.name === name)
      const lowerRule = ruleForTier(liveRows, 'lower')
      const higherRule = ruleForTier(liveRows, 'higher')
      const anyEnabled = liveRows.some(row => row.status === 'enabled')
      return {
        name,
        key: `${group.key}-${name}`,
        event: { id: lowerRule?.event || higherRule?.event || group.primaryEventId },
        group,
        lowerRule,
        higherRule,
        lowerPeriod: lowerRule ? periodFromRow(lowerRule) : firstPeriod(group, 'lower'),
        higherPeriod: higherRule ? periodFromRow(higherRule) : firstPeriod(group, 'higher'),
        lowerPrice: lowerRule?.price ?? null,
        higherPrice: higherRule?.price ?? null,
        liveRows,
        status: liveRows.length ? (anyEnabled ? 'enabled' : 'disabled') : 'missing',
        anyEnabled,
        firstRow: lowerRule || higherRule || liveRows[0],
        perPerson: /group|family/i.test(name),
      }
    })
  })

  return [...groups.values()]
}

function ticketRulePayloadFromPeriod(group, ticket, tier, eventId, period, price) {
  return {
    event: eventId,
    name: ticket.name,
    priceType: 'fixed',
    price,
    priceAdj: 0,
    weekdays: period?.weekdays || [],
    validFrom: null,
    validTo: null,
    timeStart: period?.timeStart || null,
    timeEnd: period?.timeEnd || null,
    remarks: `${tier === 'lower' ? 'Lower price' : 'Higher price'} · ${group.label}`,
    status: 'enabled',
  }
}

export default function TicketTypes() {
  const { lang } = useLang()
  const t = useT(lang)
  const { data: loadedTypes, error: loadError, loading: loadingTypes, reload } = useTicketTypesQuery(
    false,
    { initialData: [] }
  )
  const { data: events = [], reload: reloadEvents } = useEventsQuery({ initialData: [] })
  const types = loadedTypes || []

  const saveType = useAdminMutation(
    async (form, existing) => {
      const payload = ticketTypePayload(form)
      if (existing?.id) return updateTicketType(existing.id, payload)
      return createTicketType(payload)
    },
    { invalidateQueries: adminQueryKeys.ticketTypes, successMessage: 'Ticket type saved.' }
  )
  const saveEvent = useAdminMutation(
    payload => createEvent(payload),
    { invalidateQueries: adminQueryKeys.events, successMessage: 'Event created.' }
  )
  const [filters, setFilters] = useState({ search: '', status: 'all' })
  const [modal, setModal] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { name, tier }
  const [editValue, setEditValue] = useState('')

  const eventGroups = useMemo(() => buildEventGroups(events, types), [events, types])

  const groups = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return eventGroups
      .map(group => ({
        ...group,
        rows: group.rows.filter(row => {
          if (filters.status !== 'all' && row.status !== filters.status) return false
          if (!search) return true
          return `${group.label} ${row.name}`.toLowerCase().includes(search)
        }),
      }))
      .filter(group => {
        if (group.rows.length) return true
        if (filters.status !== 'all') return false
        if (!search) return true
        return group.label.toLowerCase().includes(search)
      })
  }, [eventGroups, filters])

  const visibleCount = groups.reduce((total, group) => total + group.rows.length, 0)

  async function handleSave(form) {
    const existing = modal === 'create' ? null : modal
    await saveType.mutate(form, existing)
    setModal(null)
    reload()
  }

  async function handleCreateEvent(payload) {
    const event = await saveEvent.mutate(payload)
    await reloadEvents()
    return event
  }

  async function openCreateModal() {
    await reloadEvents()
    setModal('create')
  }

  const createMissingRule = useAdminMutation(
    async (row, tier) => {
      const copyPrice = tier === 'lower' ? row.higherPrice : row.lowerPrice
      const period = tier === 'lower' ? row.lowerPeriod : row.higherPeriod
      return createTicketType(ticketRulePayloadFromPeriod(row.group, row, tier, period?.eventId || row.group.primaryEventId, period, copyPrice ?? 0))
    },
    {
      invalidateQueries: adminQueryKeys.ticketTypes,
      successMessage: 'Ticket price rule created.',
      onSuccess: () => reload(),
    }
  )

  async function toggleStatus(row) {
    const rows = row.liveRows
    if (!rows.length) return
    const anyEnabled = rows.some(r => r.status === 'enabled')
    const nextStatus = anyEnabled ? 'disabled' : 'enabled'
    await Promise.all(rows.map(row => updateTicketType(row.id, { ...ticketTypePayload(row), status: nextStatus })))
    reload()
  }

  function startEdit(row, tier, price) {
    setEditingCell({ key: row.key, tier, row })
    setEditValue(price?.toFixed(2) ?? '0.00')
  }

  async function commitEdit() {
    if (!editingCell) return
    const newPrice = parseFloat(editValue)
    if (!isNaN(newPrice) && newPrice >= 0) {
      const target = editingCell.tier === 'lower' ? editingCell.row.lowerRule : editingCell.row.higherRule
      if (target) {
        await updateTicketType(target.id, { ...ticketTypePayload({ ...target, price: newPrice }), price: newPrice })
      } else if (editingCell.row.event) {
        const period = editingCell.tier === 'lower' ? editingCell.row.lowerPeriod : editingCell.row.higherPeriod
        await createTicketType(ticketRulePayloadFromPeriod(
          editingCell.row.group,
          editingCell.row,
          editingCell.tier,
          period?.eventId || editingCell.row.group.primaryEventId,
          period,
          newPrice,
        ))
      }
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
          eventGroups={eventGroups}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onCreateEvent={handleCreateEvent}
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
        subtitle="Manage ticket rules, prices, and schedules for each experience."
        actions={
          <Button variant="contained" onClick={openCreateModal} startIcon={<i className="fa fa-plus" />}>
            Create Ticket Type
          </Button>
        }
      />

      {/* Schedule reference */}
      <div className="ticket-type-schedule-grid">
        {['lower', 'higher'].map(tier => {
          const style = TIER_STYLES[tier]
          const rules = [...new Set(eventGroups.flatMap(group => group.periods[tier].map(period => `${group.label} · ${period.label}`)))]
          return (
          <div key={tier} style={{ flex: 1, background: style.bg, border: `1px solid ${style.border}`, borderRadius: 8, padding: '10px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: style.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              <i className="fa fa-clock" style={{ marginRight: 5 }} />{style.label} Schedule
            </div>
            {rules.length ? rules.map(rule => (
              <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', marginBottom: 2 }}>
                <i className="fa fa-circle" style={{ fontSize: 4, color: style.color }} />
                {rule}
              </div>
            )) : <div style={{ fontSize: 12, color: '#94a3b8' }}>No configured periods</div>}
          </div>
          )
        })}
      </div>

      {/* Filters */}
      <FilterCard className="mb-3">
        <div className="ticket-type-filter-grid">
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
              { value: 'missing', label: 'Missing' },
            ]}
          />
          <ResetFiltersButton label={t.reset} onClick={() => setFilters({ search: '', status: 'all' })} />
        </div>
      </FilterCard>
      <div style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
        {visibleCount} ticket types found
      </div>

      {/* Price Matrix Table */}
      <TableShell className="ticket-type-table-shell">
        <table className="ticket-type-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f8fafc', borderBottom: '2px solid #e5e7eb', width: '34%' }}>
                Ticket Type
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', background: '#f0fdf4', borderBottom: '2px solid #86efac', borderLeft: '1px solid #d1fae5' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#059669' }}>
                  <i className="fa fa-arrow-down" />Lower Price
                </span>
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'center', background: '#fffbeb', borderBottom: '2px solid #fbbf24', borderLeft: '1px solid #fde68a' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                  <i className="fa fa-arrow-up" />Higher Price
                </span>
              </th>
              <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f8fafc', borderBottom: '2px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', width: '27%' }}>
                Schedule / Time Window
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
            {groups.length === 0 ? (
              <EmptyTableRow colSpan={6}>{t.noTicketTypesFound}</EmptyTableRow>
            ) : groups.map(group => (
              <Fragment key={group.key}>
                <tr key={`${group.key}-header`} style={{ background: group.tint }}>
                  <td colSpan={6} style={{ padding: '11px 18px', borderTop: '1px solid #e5e7eb', borderLeft: `4px solid ${group.accent}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 32, height: 32, borderRadius: 999, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.12)', flexShrink: 0 }}>
                        <i className={`fa ${group.icon}`} style={{ color: group.accent, fontSize: 13 }} />
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.fullName || group.label}</span>
                      <span className="badge badge-green" style={{ marginLeft: 4, flexShrink: 0 }}>Active</span>
                    </div>
                  </td>
                </tr>
                {group.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '18px', borderBottom: '1px solid #f3f4f6', color: '#64748b', fontSize: 13 }}>
                      No ticket types configured for {group.label} yet. Use Create Ticket Type to add rules for this event.
                    </td>
                  </tr>
                ) : group.rows.map(row => (
                  <tr key={row.key} style={{
                    borderBottom: '1px solid #f3f4f6',
                    opacity: row.status === 'disabled' ? 0.55 : 1,
                    background: row.status === 'missing' ? '#fffdf7' : '#fff',
                  }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                      <PriceCell
                        price={row.lowerPrice}
                        suffix={row.perPerson ? ' pp' : ''}
                        color={group.accent}
                        bg={group.tint}
                        border={group.accent}
                        editing={editingCell?.key === row.key && editingCell?.tier === 'lower'}
                        editValue={editValue}
                        onStart={() => startEdit(row, 'lower', row.lowerPrice)}
                        onChange={setEditValue}
                        onCommit={commitEdit}
                        onCancel={() => setEditingCell(null)}
                        missingLabel="Create Lower"
                        onCreateMissing={row.event ? () => createMissingRule.mutate(row, 'lower') : null}
                        creatingMissing={createMissingRule.loading}
                      />
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', borderLeft: '1px solid #fde68a' }}>
                      <PriceCell
                        price={row.higherPrice}
                        suffix={row.perPerson ? ' pp' : ''}
                        color="#d97706" bg="#fffbeb" border="#fde68a"
                        editing={editingCell?.key === row.key && editingCell?.tier === 'higher'}
                        editValue={editValue}
                        onStart={() => startEdit(row, 'higher', row.higherPrice)}
                        onChange={setEditValue}
                        onCommit={commitEdit}
                        onCancel={() => setEditingCell(null)}
                        missingLabel="Create Higher"
                        onCreateMissing={row.event ? () => createMissingRule.mutate(row, 'higher') : null}
                        creatingMissing={createMissingRule.loading}
                      />
                    </td>
                    <td style={{ padding: '12px 18px', borderLeft: '1px solid #e5e7eb', fontSize: 12, lineHeight: 1.5, color: '#334155' }}>
                      <div>{row.lowerPeriod?.label || 'No lower-price period'}</div>
                      <div>{row.higherPeriod?.label || 'No higher-price period'}</div>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                      <span className={`badge ${row.status === 'enabled' ? 'badge-green' : 'badge-disabled'}`}>
                        {row.status === 'missing' ? 'Missing' : row.status === 'enabled' ? t.enabled : t.disabled}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                      <div className="ticket-type-actions" style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button
                          className="ticket-type-action-button"
                          variant="contained"
                          size="small"
                          onClick={() => setModal(row.firstRow)}
                          startIcon={<i className="fa fa-edit" />}
                        >
                          {t.edit}
                        </Button>
                        <Button
                          className="ticket-type-action-button"
                          onClick={() => toggleStatus(row)}
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
              </Fragment>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  )
}
