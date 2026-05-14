import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { COUPONS_DATA } from '../data/mockData'

const PAGE_SIZE = 10

function CouponModal({ coupon, onClose, onSave }) {
  const [form, setForm] = useState(coupon || {
    code: '', source: 'manual', discountType: 'percent', discountValue: 10,
    minPurchase: 0, maxUses: null, validFrom: null, validTo: null, remarks: ''
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{coupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Coupon Code</label>
            <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SUMMER10" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Discount Type</label>
              <select className="form-select" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} style={{ width: '100%' }}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Discount Value</label>
              <input className="form-input" type="number" min="0" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Min Purchase ($)</label>
              <input className="form-input" type="number" min="0" value={form.minPurchase} onChange={e => setForm(f => ({ ...f, minPurchase: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Max Uses (blank = unlimited)</label>
              <input className="form-input" type="number" min="1" value={form.maxUses || ''} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : null }))} placeholder="∞" />
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
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Remarks</label>
            <input className="form-input" value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks..." />
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

export default function Coupons() {
  const { lang } = useLang()
  const t = useT(lang)
  const [coupons, setCoupons] = useState(COUPONS_DATA)
  const [filters, setFilters] = useState({ search: '', status: 'all', source: 'manual', hideUnused: false })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | 'create' | { coupon }

  const filtered = useMemo(() => {
    return coupons.filter(c => {
      if (filters.search && !c.code.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.source !== 'all' && c.source !== filters.source) return false
      if (filters.hideUnused && c.usedCount === 0) return false
      return true
    })
  }, [coupons, filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSave(form) {
    if (modal === 'create') {
      setCoupons(prev => [...prev, { ...form, id: prev.length + 1, usedCount: 0, totalAmount: 0, status: 'active', createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }])
    } else {
      setCoupons(prev => prev.map(c => c.id === modal.id ? { ...c, ...form } : c))
    }
    setModal(null)
  }

  function toggleCouponStatus(id) {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'disabled' : 'active' } : c))
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    alert(`Copied: ${code}`)
  }

  return (
    <div>
      {modal && (
        <CouponModal
          coupon={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
            <i className="fa fa-tag" style={{ color: '#7b2020' }} />
            Coupons Management
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage and configure coupon codes</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('create')}>
          {t.createCoupon}
        </button>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Search Coupons</label>
            <input className="form-input" placeholder={t.searchCoupon} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="all">{t.allStatus}</option>
              <option value="active">{t.active}</option>
              <option value="expired">{t.expired}</option>
              <option value="disabled">{t.disabled}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Source</label>
            <select className="form-select" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={filters.hideUnused} onChange={e => setFilters(f => ({ ...f, hideUnused: e.target.checked }))} style={{ width: 14, height: 14 }} />
            {t.hideUnused}
          </label>
          <button className="btn-secondary btn-sm" onClick={() => setFilters({ search: '', status: 'all', source: 'manual', hideUnused: false })}>
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
                <th>Coupon Code</th>
                <th>Source</th>
                <th>Usage</th>
                <th>Discount</th>
                <th>Min Purchase</th>
                <th>Validity</th>
                <th>Remarks</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No coupons found</td></tr>
              ) : paged.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7b2020', fontSize: 13 }}>{c.code}</span>
                      <button onClick={() => copyCode(c.code)} title="Copy" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                        <i className="fa fa-copy" />
                      </button>
                      <button style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <i className="fa fa-qrcode" style={{ fontSize: 11 }} /> Generate QR Code
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{c.source === 'manual' ? 'Manual' : 'Marketing'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>Used {c.usedCount} / {c.maxUses ?? '∞'} times</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total ${c.totalAmount.toFixed(2)}</div>
                    <button style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <i className="fa fa-external-link-alt" style={{ fontSize: 10 }} /> {t.view}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>
                    {c.discountType === 'percent' ? `${c.discountValue}%` : `$${c.discountValue}`}
                  </td>
                  <td style={{ fontSize: 13 }}>${c.minPurchase.toFixed(2)}</td>
                  <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {c.validTo ? `Until ${c.validTo}` : t.validForever}
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{c.remarks || 'No remark'}</td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'expired' ? 'badge-orange' : 'badge-gray'}`}>
                      {c.status === 'active' ? t.active : c.status === 'expired' ? t.expired : t.disabled}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>{c.createdAt}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                      <button className="btn-primary btn-sm" onClick={() => setModal(c)}>
                        <i className="fa fa-edit" /> {t.edit}
                      </button>
                      {c.status !== 'expired' && (
                        <button
                          onClick={() => toggleCouponStatus(c.id)}
                          className="btn-sm"
                          style={{ background: c.status === 'active' ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <i className={`fa fa-${c.status === 'active' ? 'ban' : 'check'}`} />
                          {c.status === 'active' ? t.disable : t.enable}
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
