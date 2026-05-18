import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { archiveCoupon, createCoupon, getCouponOrders, getCouponQr, updateCoupon, validateCoupon } from '../api/adminApi'
import { AdminPagination, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import QrCodeDialog from '../components/QrCodeDialog'
import { adminQueryKeys, useCouponsQuery } from '../hooks/queries'
import { useAdminMutation } from '../hooks/useAdminApi'
import { ApplyFiltersButton, ResetFiltersButton, SelectFilter, TextFilter } from '../components/FilterControls'

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

export default function Coupons() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({ search: searchParams.get('search') || '', status: 'all', source: 'all', hideUnused: false })
  const [appliedFilters, setAppliedFilters] = useState({ search: searchParams.get('search') || '', status: 'all', source: 'all', hideUnused: false })
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | 'create' | { coupon }
  const [couponQr, setCouponQr] = useState(null)

  const couponParams = useMemo(() => ({
    search: appliedFilters.search || undefined,
    status: appliedFilters.status === 'all' ? undefined : appliedFilters.status,
    source: appliedFilters.source === 'all' ? undefined : appliedFilters.source,
  }), [appliedFilters.search, appliedFilters.status, appliedFilters.source])

  const { data: coupons = [], loading, reload } = useCouponsQuery(couponParams, { initialData: [] })
  const saveCoupon = useAdminMutation(
    async (form, existing) => {
      const payload = {
        code: form.code,
        source: form.source || 'manual',
        discountType: form.discountType,
        discountValue: form.discountValue,
        minPurchase: form.minPurchase ?? 0,
        maxUses: form.maxUses,
        validFrom: form.validFrom,
        validTo: form.validTo,
        remarks: form.remarks,
        status: form.status || 'active',
      }
      if (existing?.id) return updateCoupon(existing.id, payload)
      return createCoupon(payload)
    },
    { invalidateQueries: adminQueryKeys.coupons, successMessage: 'Coupon saved.' }
  )
  const couponAction = useAdminMutation(
    action => action(),
    { invalidateQueries: adminQueryKeys.coupons, successMessage: 'Coupon action completed.' }
  )

  const filtered = useMemo(() => {
    return coupons.filter(c => {
      if (appliedFilters.search && !c.code.toLowerCase().includes(appliedFilters.search.toLowerCase())) return false
      if (appliedFilters.status !== 'all' && c.status !== appliedFilters.status) return false
      if (appliedFilters.source !== 'all' && c.source !== appliedFilters.source) return false
      if (appliedFilters.hideUnused && c.usedCount === 0) return false
      return true
    })
  }, [coupons, appliedFilters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSave(form) {
    const existing = modal === 'create' ? null : modal
    await saveCoupon.mutate(form, existing)
    setModal(null)
    reload()
  }

  async function toggleCouponStatus(coupon) {
    const nextStatus = coupon.status === 'active' ? 'disabled' : 'active'
    await updateCoupon(coupon.id, {
      code: coupon.code,
      source: coupon.source,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchase: coupon.minPurchase,
      maxUses: coupon.maxUses,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      remarks: coupon.remarks,
      status: nextStatus,
    })
    reload()
  }

  async function validateCouponCode() {
    const code = window.prompt('Coupon code to validate')
    if (!code) return
    const amount = Number(window.prompt('Order amount', '0') || 0)
    const result = await couponAction.mutate(() => validateCoupon({ code, amount }))
    alert(`${result.valid ? 'Valid' : 'Invalid'}: ${result.message || ''}`)
  }

  async function showCouponQr(coupon) {
    const result = await couponAction.mutate(() => getCouponQr(coupon.id))
    setCouponQr({
      title: `${coupon.code} QR Code`,
      value: result.payload || result.qrCode || result.url || result.code || `coupon:${coupon.code}`,
      subtitle: 'Scan or copy this coupon payload.',
    })
  }

  async function showCouponOrders(coupon) {
    const result = await couponAction.mutate(() => getCouponOrders(coupon.id, { page: 1, pageSize: 5 }))
    alert(`${result.total || 0} orders use ${coupon.code}. Opening filtered orders.`)
    navigate(`/orders?couponCode=${encodeURIComponent(coupon.code)}`)
  }

  async function archiveCouponCode(coupon) {
    if (!window.confirm(`Archive coupon ${coupon.code}?`)) return
    await couponAction.mutate(() => archiveCoupon(coupon.id))
    reload()
  }

  function applyFilters() {
    setAppliedFilters(filters)
    setPage(1)
  }

  function resetFilters() {
    const empty = { search: '', status: 'all', source: 'all', hideUnused: false }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  if (loading && !coupons.length) {
    return <LoadingIndicator label="Loading coupons..." />
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
      {couponQr && (
        <QrCodeDialog
          title={couponQr.title}
          value={couponQr.value}
          subtitle={couponQr.subtitle}
          onClose={() => setCouponQr(null)}
        />
      )}

      <PageHeader
        icon="fa-tag"
        title={t.coupons}
        subtitle={t.manageCoupons}
        actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={validateCouponCode} startIcon={<i className="fa fa-check-circle" />}>
            Validate
          </Button>
          <Button variant="contained" size="small" onClick={() => setModal('create')}>
            {t.createCoupon}
          </Button>
        </div>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <TextFilter label={t.search} placeholder={t.searchCoupon} value={filters.search} onChange={value => setFilters(f => ({ ...f, search: value }))} />
          <SelectFilter label={t.status} value={filters.status} onChange={value => setFilters(f => ({ ...f, status: value }))} options={[{ value: 'all', label: t.allStatus }, { value: 'active', label: t.active }, { value: 'expired', label: t.expired }, { value: 'disabled', label: t.disabled }]} />
          <SelectFilter label={t.source} value={filters.source} onChange={value => setFilters(f => ({ ...f, source: value }))} options={[{ value: 'all', label: t.allSources }, { value: 'manual', label: t.manual }, { value: 'marketing', label: t.marketing }]} />
          <div className="flex items-end">
            <FormControlLabel control={<Checkbox checked={filters.hideUnused} onChange={e => setFilters(f => ({ ...f, hideUnused: e.target.checked }))} />} label={t.hideUnused} />
          </div>
          <div className="flex items-end gap-2">
            <ApplyFiltersButton onClick={applyFilters} />
            <ResetFiltersButton onClick={resetFilters} label={t.reset} />
          </div>
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
                      <Button onClick={() => copyCode(c.code)} title="Copy" size="small" sx={{ minWidth: 0, p: 0.25 }}>
                        <i className="fa fa-copy" />
                      </Button>
                      <Button onClick={() => showCouponQr(c)} variant="outlined" size="small" startIcon={<i className="fa fa-qrcode" />} sx={{ fontSize: 11, py: 0 }}>QR</Button>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{c.source === 'manual' ? 'Manual' : 'Marketing'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>Used {c.usedCount} / {c.maxUses ?? '∞'} times</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total ${c.totalAmount.toFixed(2)}</div>
                    <Button
                      onClick={() => showCouponOrders(c)}
                      variant="outlined"
                      size="small"
                      sx={{ mt: 0.5, fontSize: 11, py: 0 }}
                      startIcon={<i className="fa fa-external-link-alt" />}
                    >
                      {t.view}
                    </Button>
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
                      <Button variant="contained" size="small" onClick={() => setModal(c)} startIcon={<i className="fa fa-edit" />}>{t.edit}</Button>
                      {c.status !== 'expired' && (
                        <Button
                          onClick={() => toggleCouponStatus(c)}
                          variant="contained"
                          color={c.status === 'active' ? 'warning' : 'success'}
                          size="small"
                          startIcon={<i className={`fa fa-${c.status === 'active' ? 'ban' : 'check'}`} />}
                        >
                          {c.status === 'active' ? t.disable : t.enable}
                        </Button>
                      )}
                      <Button
                        onClick={() => archiveCouponCode(c)}
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<i className="fa fa-archive" />}
                      >
                        Archive
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </TableShell>
    </div>
  )
}
