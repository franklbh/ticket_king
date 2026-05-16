import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateMarketingSettings } from '../api/adminApi'
import { AdminCard, AdminPagination, EmptyTableRow, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { adminQueryKeys, useMarketingRecordsQuery, useMarketingSettingsQuery } from '../hooks/queries'
import { useAdminMutation } from '../hooks/useAdminApi'

const PAGE_SIZE = 10
const DEFAULT_MARKETING_SETTINGS = {
  enabled: false,
  sendDelay: 45,
  couponValidity: 30,
  discountType: 'percent',
  discountValue: 5,
  minPurchase: 0,
  maxUses: 9999,
  referralEnabled: false,
  referralReward: 5,
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 46, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0,
        background: checked ? '#10b981' : '#d1d5db', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function StatBox({ value, label, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '16px 8px', borderRight: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function Marketing() {
  const { lang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(false)

  const { data: loadedSettings, loading: loadingSettings } = useMarketingSettingsQuery({
    initialData: DEFAULT_MARKETING_SETTINGS,
  })
  const [settings, setSettings] = useState(DEFAULT_MARKETING_SETTINGS)

  useEffect(() => {
    if (loadedSettings) setSettings(loadedSettings)
  }, [loadedSettings])

  const { data: recordsData, loading: loadingRecords } = useMarketingRecordsQuery(
    { page, pageSize: PAGE_SIZE },
    { initialData: { items: [], total: 0, page: 1, pageSize: PAGE_SIZE } }
  )
  const records = recordsData?.items || []

  const saveSettings = useAdminMutation(
    payload => updateMarketingSettings(payload),
    { invalidateQueries: adminQueryKeys.marketingSettings, successMessage: 'Marketing settings saved.' }
  )

  const stats = {
    total: recordsData?.total ?? records.length,
    pending: records.filter(record => record.status === 'pending').length,
    cancelled: records.filter(record => record.status === 'cancelled').length,
    sent: records.filter(record => record.status === 'sent').length,
    failed: records.filter(record => record.status === 'failed').length,
    couponsUsed: records.filter(record => record.couponUsed).length,
    todaySent: records.filter(record => (record.sentAt || '').startsWith(new Date().toISOString().slice(0, 10))).length,
  }

  async function handleSaveSettings() {
    await saveSettings.mutate(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loadingSettings && !loadedSettings) {
    return <LoadingIndicator label="Loading marketing settings..." />
  }

  const paged = records

  const discountPreview = settings.discountType === 'percent'
    ? `${settings.discountValue}% OFF`
    : `$${settings.discountValue} OFF`

  return (
    <div>
      <PageHeader
        icon="fa-bullhorn"
        title={t.marketingManagement}
        subtitle="Configure automatic marketing emails with discount coupons after ticket check-in"
      />

      {/* Stats */}
      <AdminCard className="mb-5 overflow-hidden p-0">
        <div style={{ display: 'flex' }}>
          <StatBox value={stats.total} label={t.totalRecords} color="#6366f1" />
          <StatBox value={stats.pending} label={t.pending} color="#f59e0b" />
          <StatBox value={stats.cancelled} label={t.cancelled2} color="#374151" />
          <StatBox value={stats.sent} label={t.sent} color="#10b981" />
          <StatBox value={stats.failed} label={t.failed} color="#ef4444" />
          <StatBox value={stats.couponsUsed} label={t.couponsUsed} color="#6366f1" />
          <div style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#374151' }}>{stats.todaySent}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t.todaySent}</div>
          </div>
        </div>
      </AdminCard>

      {/* Marketing Settings */}
      <AdminCard className="mb-5">
        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, color: '#111827' }}>
          <i className="fa fa-cog" style={{ color: '#6366f1' }} />
          {t.marketingSettings}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Left column */}
          <div>
            {/* Enable Marketing */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.enableMarketing}</span>
                <Toggle checked={settings.enabled} onChange={() => setSettings(s => ({ ...s, enabled: !s.enabled }))} />
                <span style={{ fontSize: 14, color: settings.enabled ? '#10b981' : '#6b7280', fontWeight: 500 }}>
                  {settings.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>When enabled, marketing emails will be automatically sent after ticket check-in</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.sendDelay}</label>
                <input
                  className="form-input"
                  type="number"
                  value={settings.sendDelay}
                  onChange={e => setSettings(s => ({ ...s, sendDelay: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Time to wait after check-in before sending. Recommended: exhibition duration + 20 minutes</p>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.couponValidity}</label>
                <input
                  className="form-input"
                  type="number"
                  value={settings.couponValidity}
                  onChange={e => setSettings(s => ({ ...s, couponValidity: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>How long the coupon will be valid from creation date</p>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Discount setting */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>{t.discountSetting}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setSettings(s => ({ ...s, discountType: 'percent' }))}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', background: settings.discountType === 'percent' ? '#6366f1' : '#fff', color: settings.discountType === 'percent' ? '#fff' : '#374151', fontWeight: 600 }}
                >%</button>
                <button
                  onClick={() => setSettings(s => ({ ...s, discountType: 'fixed' }))}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', background: settings.discountType === 'fixed' ? '#6366f1' : '#fff', color: settings.discountType === 'fixed' ? '#fff' : '#374151', fontWeight: 600 }}
                >$</button>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={settings.discountValue}
                  onChange={e => setSettings(s => ({ ...s, discountValue: Number(e.target.value) }))}
                  style={{ width: 80 }}
                />
                <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                  <i className="fa fa-tag" /> {discountPreview}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>E.g. 10 means 10% discount</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Minimum Purchase ($)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={settings.minPurchase}
                  onChange={e => setSettings(s => ({ ...s, minPurchase: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Set to 0 for no minimum</p>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.maximumUses}</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={settings.maxUses}
                  onChange={e => setSettings(s => ({ ...s, maxUses: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>How many times the coupon can be used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Rewards */}
        <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 24, paddingTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <i className="fa fa-gift" style={{ color: '#6366f1' }} />
            {t.referralRewards}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.enableReferral}</span>
                <Toggle checked={settings.referralEnabled} onChange={() => setSettings(s => ({ ...s, referralEnabled: !s.referralEnabled }))} />
                <span style={{ fontSize: 14, color: settings.referralEnabled ? '#10b981' : '#6b7280', fontWeight: 500 }}>
                  {settings.referralEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>When enabled, the referral reward message will be shown in marketing emails</p>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.referralReward}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={settings.referralReward}
                onChange={e => setSettings(s => ({ ...s, referralReward: Number(e.target.value) }))}
              />
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Reward percentage when a friend uses the referral code</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn-primary" onClick={handleSaveSettings} style={{ gap: 6 }}>
            {saved ? <><i className="fa fa-check" /> Saved!</> : <><i className="fa fa-save" /> {t.saveSettings}</>}
          </button>
        </div>
      </AdminCard>

      {/* Send Records */}
      <TableShell>
        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: '#111827' }}>
          <i className="fa fa-history" style={{ color: '#6366f1' }} />
          {t.sendRecords}
        </h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.recipient}</th>
                <th>{t.couponCode}</th>
                <th>{t.orderID}</th>
                <th>{t.status}</th>
                <th>{t.couponUsed}</th>
                <th>{t.sentAt}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <EmptyTableRow colSpan={7}>No marketing records found</EmptyTableRow>
              ) : paged.map(r => (
                <tr key={r.id}>
                  <td style={{ color: '#9ca3af', fontSize: 13 }}>{r.id}</td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{r.recipientName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{r.recipientEmail}</div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1', fontSize: 13 }}>{r.couponCode}</span>
                      <button
                        onClick={() => navigate(`/coupons?search=${encodeURIComponent(r.couponCode)}`)}
                        style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                      >
                        <i className="fa fa-external-link-alt" style={{ fontSize: 10 }} /> {t.view}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151', fontSize: 13 }}>#{r.orderId}</span>
                      <button
                        onClick={() => navigate(`/orders?orderId=${encodeURIComponent(r.orderId)}`)}
                        style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                      >
                        <i className="fa fa-external-link-alt" style={{ fontSize: 10 }} /> {t.view}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'sent' ? 'badge-green' : r.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.couponUsed
                      ? <span className="badge badge-purple">Used</span>
                      : <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{r.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          total={recordsData?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </TableShell>
    </div>
  )
}
