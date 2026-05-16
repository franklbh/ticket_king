import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'

const PAGE_SIZE = 10

function CouponModal({ coupon, onClose, onSave, t }) {
  const [form, setForm] = useState(coupon || {
    code: '', source: 'manual', discountType: 'percent', discountValue: 5,
    minPurchase: 0, maxUses: null, validFrom: null, validTo: null, remarks: '', status: 'active'
  })

  const isUnlimited = form.maxUses === null
  const discountPreview = form.discountType === 'percent' ? `${form.discountValue}% OFF` : `$${form.discountValue} OFF`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{coupon ? `${t.edit} Coupon` : t.createCoupon}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Coupon Code */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>
              {t.couponCode} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SUMMER2025" />
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Recommended format: SUMMER2025</div>
          </div>

          {/* Discount Type */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>{t.discountType}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setForm(f => ({ ...f, discountType: 'percent' }))}
                  style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', background: form.discountType === 'percent' ? '#6366f1' : '#fff', color: form.discountType === 'percent' ? '#fff' : '#374151', fontSize: 14, fontWeight: 700 }}
                >%</button>
                <button
                  onClick={() => setForm(f => ({ ...f, discountType: 'fixed' }))}
                  style={{ padding: '8px 16px', border: 'none', borderLeft: '1px solid #e5e7eb', cursor: 'pointer', background: form.discountType === 'fixed' ? '#6366f1' : '#fff', color: form.discountType === 'fixed' ? '#fff' : '#374151', fontSize: 14, fontWeight: 700 }}
                >$</button>
              </div>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                style={{ width: 80 }}
              />
              <span style={{ background: '#10b981', color: '#fff', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <i className="fa fa-tag" style={{ fontSize: 11 }} /> {discountPreview}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {form.discountType === 'percent' ? 'Percentage discount' : 'Fixed amount discount'}
            </div>
          </div>

          {/* Usage Limit */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Usage Limit</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.checked ? null : 100 }))}
                style={{ width: 16, height: 16, accentColor: '#6366f1' }}
              />
              <span style={{ fontSize: 14, color: '#374151' }}>Unlimited uses</span>
            </label>
            {!isUnlimited && (
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.maxUses || ''}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Max number of uses"
                style={{ marginTop: 8 }}
              />
            )}
          </div>

          {/* Minimum Purchase */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Minimum Purchase (CAD)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.minPurchase}
              onChange={e => setForm(f => ({ ...f, minPurchase: Number(e.target.value) }))}
            />
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Order must meet this amount</div>
          </div>

          {/* Start / End Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Start Date</label>
              <input className="form-input" type="date" value={form.validFrom || ''} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || null }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>End Date</label>
              <input className="form-input" type="date" value={form.validTo || ''} onChange={e => setForm(f => ({ ...f, validTo: e.target.value || null }))} />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Remark</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.remarks || ''}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional: Add coupon related notes"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>For internal recording of coupon purpose or description</div>
          </div>

          {/* Enable Coupon */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.status !== 'disabled'}
              onChange={e => setForm(f => ({ ...f, status: e.target.checked ? 'active' : 'disabled' }))}
              style={{ width: 16, height: 16, accentColor: '#6366f1' }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Enable Coupon</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" onClick={() => onSave(form)}>{t.save}</button>
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [coupons, setCoupons] = useState([])
  const [filters, setFilters] = useState({ search: searchParams.get('search') || '', status: 'all', source: 'manual', hideUnused: false })
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
          t={t}
        />
      )}

      <PageHeader
        icon="fa-tag"
        title={t.coupons}
        subtitle={t.manageCoupons}
        actions={
        <button className="btn-primary" onClick={() => setModal('create')}>
          {t.createCoupon}
        </button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.search}</label>
            <input className="form-input" placeholder={t.searchCoupon} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.status}</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="all">{t.allStatus}</option>
              <option value="active">{t.active}</option>
              <option value="expired">{t.expired}</option>
              <option value="disabled">{t.disabled}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.source}</label>
            <select className="form-select" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
              <option value="all">{t.allSources}</option>
              <option value="manual">{t.manual}</option>
              <option value="marketing">{t.marketing}</option>
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
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.couponCode}</th>
                <th>{t.source}</th>
                <th>{t.usage}</th>
                <th>{t.discount}</th>
                <th>{t.minPurchase}</th>
                <th>{t.validity}</th>
                <th>{t.remarks}</th>
                <th>{t.status}</th>
                <th>{t.createdAt}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <EmptyTableRow colSpan={10}>{t.noCouponsFound}</EmptyTableRow>
              ) : paged.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 13 }}>{c.code}</span>
                      <button onClick={() => copyCode(c.code)} title="Copy" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, lineHeight: 1 }}>
                        <i className="fa fa-copy" />
                      </button>
                      <button style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
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
                    <button
                      onClick={() => navigate(`/orders?couponCode=${encodeURIComponent(c.code)}`)}
                      style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                    >
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
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'expired' ? 'badge-orange' : 'badge-disabled'}`} style={{ gap: 5, whiteSpace: 'nowrap' }}>
                      {c.status === 'disabled' && <i className="fa fa-ban" style={{ fontSize: 10 }} />}
                      {c.status === 'active' ? t.active : c.status === 'expired' ? t.expired : t.disabled}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>{c.createdAt}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <button className="btn-primary btn-sm" onClick={() => setModal(c)} style={{ padding: '5px 9px', minWidth: 0 }}>
                        <i className="fa fa-edit" /> {t.edit}
                      </button>
                      {c.status !== 'expired' && (
                        <button
                          onClick={() => toggleCouponStatus(c.id)}
                          className="btn-sm"
                          style={{ background: c.status === 'active' ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
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
      </TableShell>
    </div>
  )
}
