import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { TICKET_TYPES_DATA, EVENTS } from '../data/mockData'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PAGE_SIZE = 10

function TypeModal({ type, onClose, onSave }) {
  const [form, setForm] = useState(type || {
    name: '', event: 1, discountType: 'percent', discountValue: 0, priceType: 'daily',
    price: null, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: null, remarks: '', status: 'enabled'
  })
  function toggleDay(d) {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d]
    }))
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{type ? 'Edit Ticket Type' : 'Create Ticket Type'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Regular" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Event</label>
              <select className="form-select" value={form.event} onChange={e => setForm(f => ({ ...f, event: Number(e.target.value) }))} style={{ width: '100%' }}>
                {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Price Type</label>
              <select className="form-select" value={form.priceType} onChange={e => setForm(f => ({ ...f, priceType: e.target.value }))} style={{ width: '100%' }}>
                <option value="daily">Daily Price</option>
                <option value="fixed">Fixed Price</option>
              </select>
            </div>
            {form.priceType === 'fixed' ? (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Fixed Price ($)</label>
                <input className="form-input" type="number" step="0.01" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Price Adjustment ($)</label>
                <input className="form-input" type="number" value={form.priceAdj || 0} onChange={e => setForm(f => ({ ...f, priceAdj: Number(e.target.value) }))} placeholder="e.g. -10 for $10 off" />
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Weekdays</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  style={{
                    padding: '5px 10px', borderRadius: 4, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 12,
                    background: form.weekdays.includes(d) ? '#7b2020' : '#fff',
                    color: form.weekdays.includes(d) ? '#fff' : '#374151',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid From</label>
              <input className="form-input" type="date" value={form.validFrom || ''} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || null }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Valid To</label>
              <input className="form-input" type="date" value={form.validTo || ''} onChange={e => setForm(f => ({ ...f, validTo: e.target.value || null }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Time Start</label>
              <input className="form-input" type="time" value={form.timeStart || ''} onChange={e => setForm(f => ({ ...f, timeStart: e.target.value || null }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Time End</label>
              <input className="form-input" type="time" value={form.timeEnd || ''} onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value || null }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Add-on</label>
              <input className="form-input" value={form.addOn || ''} onChange={e => setForm(f => ({ ...f, addOn: e.target.value || null }))} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Remarks (Chinese)</label>
              <input className="form-input" value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional" />
            </div>
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

export default function TicketTypes() {
  const { lang } = useLang()
  const t = useT(lang)
  const [types, setTypes] = useState(TICKET_TYPES_DATA)
  const [filters, setFilters] = useState({ search: '', event: 'all', status: 'all' })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  const filtered = useMemo(() => {
    return types.filter(tp => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!tp.name.toLowerCase().includes(q) && !tp.remarks?.toLowerCase().includes(q)) return false
      }
      if (filters.event !== 'all' && tp.event !== Number(filters.event)) return false
      if (filters.status !== 'all' && tp.status !== filters.status) return false
      return true
    })
  }, [types, filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pages = Math.ceil(filtered.length / PAGE_SIZE)

  function handleSave(form) {
    if (modal === 'create') {
      setTypes(prev => [...prev, { ...form, id: prev.length + 1 }])
    } else {
      setTypes(prev => prev.map(tp => tp.id === modal.id ? { ...tp, ...form } : tp))
    }
    setModal(null)
  }

  function toggleStatus(id) {
    setTypes(prev => prev.map(tp => tp.id === id ? { ...tp, status: tp.status === 'enabled' ? 'disabled' : 'enabled' } : tp))
  }

  return (
    <div>
      {modal && <TypeModal type={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-tags" style={{ color: '#7b2020' }} />
            {t.ticketTypesManagement}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage all ticket types</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}>{t.createTicketType}</button>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Search</label>
            <input className="form-input" placeholder="Search name, notice, descr..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.event}</label>
            <select className="form-select" value={filters.event} onChange={e => setFilters(f => ({ ...f, event: e.target.value }))}>
              <option value="all">{t.allEvents}</option>
              {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.status}</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="all">{t.allStatus}</option>
              <option value="enabled">{t.enabled}</option>
              <option value="disabled">{t.disabled}</option>
            </select>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setFilters({ search: '', event: 'all', status: 'all' })}>
            <i className="fa fa-redo" /> {t.reset}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 24 }} />
                <th>{t.name}</th>
                <th>{t.discount}</th>
                <th>{t.price}</th>
                <th>{t.weekdays}</th>
                <th>Validity</th>
                <th>{t.timeRange}</th>
                <th>{t.addOn}</th>
                <th>{t.remarks}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No ticket types found</td></tr>
              ) : paged.map(tp => (
                <tr key={tp.id}>
                  <td style={{ cursor: 'grab', color: '#9ca3af' }}>⠿</td>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{tp.name}</td>
                  <td>
                    {tp.discount ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className="badge badge-orange">{tp.discount.value}% OFF</span>
                        {tp.discount.expired && <span className="badge badge-gray">Expired</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {tp.priceType === 'fixed'
                      ? <span style={{ color: '#6366f1', fontWeight: 600 }}>Fixed Price ${tp.price?.toFixed(2)}</span>
                      : <span>
                          <span>Daily Price</span>
                          {tp.priceAdj && <span style={{ color: '#10b981', fontWeight: 600 }}> {tp.priceAdj > 0 ? '+' : ''}{tp.priceAdj < 0 ? `-$${Math.abs(tp.priceAdj)}` : `+$${tp.priceAdj}`}</span>}
                        </span>
                    }
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 200 }}>
                    {tp.weekdays.length === 7 ? 'Mon, Tue, Wed, Thu, Fri, Sat, Sun' : tp.weekdays.join(', ')}
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {tp.validFrom && tp.validTo
                      ? `${tp.validFrom} ~ ${tp.validTo}`
                      : 'No Limit'
                    }
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {tp.timeStart && tp.timeEnd
                      ? <span style={{ color: '#6366f1', fontWeight: 500 }}>{tp.timeStart} - {tp.timeEnd}</span>
                      : 'All Day'
                    }
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{tp.addOn || '-'}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{tp.remarks || '-'}</td>
                  <td>
                    <span className={`badge ${tp.status === 'enabled' ? 'badge-green' : 'badge-gray'}`}>
                      {tp.status === 'enabled' ? t.enabled : t.disabled}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                      <button className="btn-primary btn-sm" onClick={() => setModal(tp)}>
                        <i className="fa fa-edit" /> {t.edit}
                      </button>
                      <button
                        onClick={() => toggleStatus(tp.id)}
                        className="btn-sm"
                        style={{
                          background: tp.status === 'enabled' ? '#f59e0b' : '#10b981',
                          color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <i className={`fa fa-${tp.status === 'enabled' ? 'ban' : 'check'}`} />
                        {tp.status === 'enabled' ? t.disable : t.enable}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => (
              <button key={i + 1} className={`page-btn ${i + 1 === page ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  )
}
