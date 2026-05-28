import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useNavigate } from 'react-router-dom'
import { cancelMarketingRecord, createMarketingRecord, retryMarketingRecord, testSendMarketing, updateMarketingSettings } from '../api/adminApi'
import { AdminCard, AdminPagination, EmptyTableRow, PageHeader, TableShell } from '../components/AdminUI'
import LoadingIndicator from '../components/LoadingIndicator'
import { useAuth, useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { adminQueryKeys, useMarketingRecordsQuery, useMarketingSettingsQuery } from '../hooks/queries'
import { useAdminMutation } from '../hooks/useAdminApi'
import { can } from '../auth/permissions'

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

function Toggle({ checked, disabled, onChange }) {
  return (
    <Switch checked={checked} disabled={disabled} onChange={onChange} color="success" size="small" />
  )
}

function StatBox({ value, label, color }) {
  return (
    <div className="marketing-stat-box">
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function Marketing() {
  const { lang } = useLang()
  const { admin } = useAuth()
  const t = useT(lang)
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(false)
  const canWriteMarketing = can(admin, 'marketing:write')

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
  const recordAction = useAdminMutation(
    action => action(),
    { invalidateQueries: adminQueryKeys.marketingRecords, successMessage: 'Marketing action completed.' }
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
    if (!canWriteMarketing) return
    await saveSettings.mutate(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function createRecord() {
    if (!canWriteMarketing) return
    const recipientEmail = window.prompt('Recipient email')
    if (!recipientEmail) return
    const recipientName = window.prompt('Recipient name', '') || null
    const couponCode = window.prompt('Coupon code', '') || null
    const orderId = window.prompt('Order ID', '') || null
    await recordAction.mutate(() => createMarketingRecord({ recipientEmail, recipientName, couponCode, orderId }))
  }

  async function testSend() {
    if (!canWriteMarketing) return
    const recipientEmail = window.prompt('Test recipient email')
    if (!recipientEmail) return
    await recordAction.mutate(() => testSendMarketing({ recipientEmail }))
  }

  async function cancelRecord(record) {
    if (!canWriteMarketing) return
    const reason = window.prompt('Cancel reason', 'Admin cancelled') || 'Admin cancelled'
    await recordAction.mutate(() => cancelMarketingRecord(record.id, { reason }))
  }

  async function retryRecord(record) {
    if (!canWriteMarketing) return
    const reason = window.prompt('Retry reason', 'Admin retry') || 'Admin retry'
    await recordAction.mutate(() => retryMarketingRecord(record.id, { reason }))
  }

  if (loadingSettings && !loadedSettings) {
    return <LoadingIndicator label={t.loadingMarketing} />
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
        subtitle={t.marketingSub}
        actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" disabled={!canWriteMarketing} onClick={testSend} startIcon={<i className="fa fa-paper-plane" />}>
            {t.testSend}
          </Button>
          <Button variant="contained" size="small" disabled={!canWriteMarketing} onClick={createRecord} startIcon={<i className="fa fa-plus" />}>
            {t.createRecord}
          </Button>
        </div>
        }
      />

      {/* Stats */}
      <AdminCard className="mb-5 overflow-hidden p-0">
        <div className="marketing-stats-grid">
          <StatBox value={stats.total} label={t.totalRecords} color="#6366f1" />
          <StatBox value={stats.pending} label={t.pending} color="#f59e0b" />
          <StatBox value={stats.cancelled} label={t.cancelled2} color="#374151" />
          <StatBox value={stats.sent} label={t.sent} color="#10b981" />
          <StatBox value={stats.failed} label={t.failed} color="#ef4444" />
          <StatBox value={stats.couponsUsed} label={t.couponsUsed} color="#6366f1" />
          <div className="marketing-stat-box">
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

        <div className="marketing-settings-grid">
          {/* Left column */}
          <div className="marketing-settings-column">
            {/* Enable Marketing */}
            <div style={{ marginBottom: 20 }}>
              <div className="marketing-toggle-row">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.enableMarketing}</span>
                <Toggle disabled={!canWriteMarketing} checked={settings.enabled} onChange={() => setSettings(s => ({ ...s, enabled: !s.enabled }))} />
                <span style={{ fontSize: 14, color: settings.enabled ? '#10b981' : '#6b7280', fontWeight: 500 }}>
                  {settings.enabled ? t.enabled : t.disabled}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{t.enableMarketingHelper}</p>
            </div>

            <div className="marketing-field-grid">
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.sendDelay}</label>
                <input
                  className="form-input"
                  type="number"
                  value={settings.sendDelay}
                  disabled={!canWriteMarketing}
                  onChange={e => setSettings(s => ({ ...s, sendDelay: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.sendDelayHelper}</p>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.couponValidity}</label>
                <input
                  className="form-input"
                  type="number"
                  value={settings.couponValidity}
                  disabled={!canWriteMarketing}
                  onChange={e => setSettings(s => ({ ...s, couponValidity: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.couponValidityHelper}</p>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="marketing-settings-column">
            {/* Discount setting */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>{t.discountSetting}</label>
              <div className="marketing-discount-row">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={settings.discountType}
                  disabled={!canWriteMarketing}
                  onChange={(_, value) => value && setSettings(s => ({ ...s, discountType: value }))}
                >
                  <ToggleButton value="percent">%</ToggleButton>
                  <ToggleButton value="fixed">$</ToggleButton>
                </ToggleButtonGroup>
                <input
                  className="form-input marketing-discount-input"
                  type="number"
                  min="0"
                  value={settings.discountValue}
                  disabled={!canWriteMarketing}
                  onChange={e => setSettings(s => ({ ...s, discountValue: Number(e.target.value) }))}
                />
                <Chip color="success" size="small" icon={<i className="fa fa-tag" />} label={discountPreview} sx={{ fontWeight: 800 }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.discountSettingHelper}</p>
            </div>

            <div className="marketing-field-grid">
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.minimumPurchaseMarketing}</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={settings.minPurchase}
                  disabled={!canWriteMarketing}
                  onChange={e => setSettings(s => ({ ...s, minPurchase: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.setZeroNoMin}</p>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.maximumUses}</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={settings.maxUses}
                  disabled={!canWriteMarketing}
                  onChange={e => setSettings(s => ({ ...s, maxUses: Number(e.target.value) }))}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.howManyCouponUses}</p>
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
          <div className="marketing-settings-grid">
            <div className="marketing-settings-column">
              <div className="marketing-toggle-row">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.enableReferral}</span>
                <Toggle disabled={!canWriteMarketing} checked={settings.referralEnabled} onChange={() => setSettings(s => ({ ...s, referralEnabled: !s.referralEnabled }))} />
                <span style={{ fontSize: 14, color: settings.referralEnabled ? '#10b981' : '#6b7280', fontWeight: 500 }}>
                  {settings.referralEnabled ? t.enabled : t.disabled}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{t.enableReferralHelper}</p>
            </div>
            <div className="marketing-settings-column">
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{t.referralReward}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={settings.referralReward}
                disabled={!canWriteMarketing}
                onChange={e => setSettings(s => ({ ...s, referralReward: Number(e.target.value) }))}
              />
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.referralRewardHelper}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Button variant="contained" disabled={!canWriteMarketing} onClick={handleSaveSettings} startIcon={<i className={`fa fa-${saved ? 'check' : 'save'}`} />}>
            {saved ? t.saved : t.saveSettings}
          </Button>
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
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <EmptyTableRow colSpan={8}>{t.noMarketingRecords}</EmptyTableRow>
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
                      <Button
                        onClick={() => navigate(`/coupons?search=${encodeURIComponent(r.couponCode)}`)}
                        variant="outlined"
                        size="small"
                        startIcon={<i className="fa fa-external-link-alt" />}
                        sx={{ minHeight: 24, py: 0, fontSize: 11 }}
                      >
                        {t.view}
                      </Button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151', fontSize: 13 }}>#{r.orderId}</span>
                      <Button
                        onClick={() => navigate(`/orders?orderId=${encodeURIComponent(r.orderId)}`)}
                        variant="outlined"
                        size="small"
                        startIcon={<i className="fa fa-external-link-alt" />}
                        sx={{ minHeight: 24, py: 0, fontSize: 11 }}
                      >
                        {t.view}
                      </Button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'sent' ? 'badge-green' : r.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>
                      {t[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    {r.couponUsed
                      ? <span className="badge badge-purple">{t.used}</span>
                      : <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{r.sentAt}</td>
                  <td>
                    <div style={{ display: 'inline-flex', gap: 6, whiteSpace: 'nowrap' }}>
                      {r.status !== 'cancelled' && (
                        <Button variant="outlined" color="warning" size="small" disabled={!canWriteMarketing} onClick={() => cancelRecord(r)}>
                          {t.cancel}
                        </Button>
                      )}
                      {['failed', 'cancelled'].includes(r.status) && (
                        <Button variant="contained" size="small" disabled={!canWriteMarketing} onClick={() => retryRecord(r)}>
                          {t.retry}
                        </Button>
                      )}
                    </div>
                  </td>
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
