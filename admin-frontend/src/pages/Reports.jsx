import { useState, useMemo, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { useAuth, useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { useReportQuery } from '../hooks/report'
import { FilterCard, PageHeader, TableShell, EmptyTableRow } from '../components/AdminUI'
import { DateRangeFilter, ApplyFiltersButton, StatusChipFilter } from '../components/FilterControls'
import LoadingIndicator from '../components/LoadingIndicator'

const QUICK_RANGES = [
  { key: 'today', getRange: () => { const d = todayStr(); return [d, d] } },
  { key: 'week', getRange: () => [weekStartStr(), todayStr()] },
  { key: 'month', getRange: () => [monthStartStr(), todayStr()] },
]

const IP_OPTIONS = [
  { value: 'htc', label: 'HTC' },
  { value: 'pico', label: 'Pico' },
]

const QUICK_LABELS = {
  en: { today: 'Today', week: 'This Week', month: 'This Month' },
  'zh-Hans': { today: '今日', week: '本周', month: '本月' },
  'zh-Hant': { today: '今日', week: '本周', month: '本月' },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function weekStartStr() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}

function monthStartStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function buildFilters(dateFrom, dateTo, ipBrands, isPartner) {
  const f = {}
  if (dateFrom) f.date_from = dateFrom
  if (dateTo) f.date_to = dateTo
  if (!isPartner && ipBrands.length === 1) f.headset_brand = ipBrands[0]
  return f
}

function buildRenderRows(rows) {
  if (!rows?.length) return []
  const result = []
  let grandCount = 0
  let grandAmount = 0
  let i = 0
  while (i < rows.length) {
    const brand = rows[i].ipBrand || ''
    let brandCount = 0
    let brandAmount = 0
    result.push({ type: 'brand_header', brand })
    let j = i
    while (j < rows.length && (rows[j].ipBrand || '') === brand) {
      const event = rows[j].eventName || ''
      let eventCount = 0
      let eventAmount = 0
      let k = j
      while (k < rows.length && (rows[k].ipBrand || '') === brand && (rows[k].eventName || '') === event) {
        result.push({ type: 'data', row: rows[k] })
        eventCount++
        eventAmount += rows[k].ticketAmount || 0
        k++
      }
      result.push({ type: 'event_subtotal', event, count: eventCount, amount: eventAmount })
      brandCount += eventCount
      brandAmount += eventAmount
      j = k
    }
    result.push({ type: 'brand_total', brand, count: brandCount, amount: brandAmount })
    grandCount += brandCount
    grandAmount += brandAmount
    i = j
  }
  result.push({ type: 'grand_total', count: grandCount, amount: grandAmount })
  return result
}

function exportCsv(rows) {
  const headers = ['Date', 'IP Brand', 'Project', 'Ticket Type', 'Payment Method', 'Amount (CAD)', 'Status', 'Verified At', 'Order ID', 'Slot Time', 'Remarks']
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push([
      row.date || '',
      row.ipBrand || '',
      row.eventName || '',
      row.ticketType || '',
      row.paymentMethod || '',
      (row.ticketAmount || 0).toFixed(2),
      row.ticketStatus || '',
      row.checkedInAt || '',
      row.orderId || '',
      row.slotTime || '',
      `"${(row.remarks || '').replace(/"/g, '""')}"`,
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report_${todayStr()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  const color = s === 'used' ? 'badge-green' : s === 'unused' ? 'badge-blue' : s === 'voided' ? 'badge-red' : 'badge-gray'
  return <span className={`badge ${color}`}>{status || '—'}</span>
}

function ReportMobileCards({ renderRows }) {
  return (
    <div className="reports-mobile-list">
      {renderRows.map((item, idx) => {
        if (item.type === 'brand_header') {
          return <div key={`mbh-${idx}`} className="reports-mobile-section">{item.brand || '—'}</div>
        }
        if (item.type === 'event_subtotal') {
          return (
            <div key={`mes-${idx}`} className="reports-mobile-total reports-mobile-subtotal">
              <span>{item.event} subtotal</span>
              <strong>{item.count} tickets · ${item.amount.toFixed(2)}</strong>
            </div>
          )
        }
        if (item.type === 'brand_total') {
          return (
            <div key={`mbt-${idx}`} className="reports-mobile-total reports-mobile-brand-total">
              <span>{item.brand} total</span>
              <strong>{item.count} tickets · ${item.amount.toFixed(2)}</strong>
            </div>
          )
        }
        if (item.type === 'grand_total') {
          return (
            <div key={`mgt-${idx}`} className="reports-mobile-total reports-mobile-grand-total">
              <span>Grand total</span>
              <strong>{item.count} tickets · ${item.amount.toFixed(2)}</strong>
            </div>
          )
        }
        const { row } = item
        return (
          <article key={`md-${idx}`} className="reports-mobile-card">
            <div className="reports-mobile-card-head">
              <div>
                <strong>{row.eventName || '—'}</strong>
                <span>{row.date || '—'} · {row.slotTime || '—'}</span>
              </div>
              <StatusBadge status={row.ticketStatus} />
            </div>
            <div className="reports-mobile-amount">${(row.ticketAmount || 0).toFixed(2)}</div>
            <div className="reports-mobile-grid">
              <span>IP Brand</span><strong>{row.ipBrand || '—'}</strong>
              <span>Ticket</span><strong>{row.ticketType || '—'}</strong>
              <span>Payment</span><strong>{row.paymentMethod || '—'}</strong>
              <span>Verified</span><strong>{row.checkedInAt || '—'}</strong>
              <span>Order ID</span><strong className="reports-mobile-mono">{row.orderId || '—'}</strong>
            </div>
            {row.remarks && <div className="reports-mobile-remarks">{row.remarks}</div>}
          </article>
        )
      })}
    </div>
  )
}

const COL_COUNT = 11

export default function Reports() {
  const { admin } = useAuth()
  const lang = useLang()
  const t = useT(lang)
  const isPartner = (admin?.role || '') === 'partner'
  const quickLabels = QUICK_LABELS[lang] || QUICK_LABELS.en

  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)
  const [ipBrands, setIpBrands] = useState([])
  const [activeQuick, setActiveQuick] = useState('today')
  const [appliedFilters, setAppliedFilters] = useState(() => buildFilters(todayStr(), todayStr(), [], isPartner))
  const [timedOut, setTimedOut] = useState(false)

  const draftFilters = useMemo(
    () => buildFilters(dateFrom, dateTo, ipBrands, isPartner),
    [dateFrom, dateTo, ipBrands, isPartner]
  )

  const { data: rows, loading } = useReportQuery(appliedFilters, { enabled: Boolean(appliedFilters) })
  const renderRows = useMemo(() => buildRenderRows(rows || []), [rows])

  useEffect(() => {
    setAppliedFilters(buildFilters(dateFrom, dateTo, ipBrands, isPartner))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPartner])

  useEffect(() => {
    setTimedOut(false)
  }, [appliedFilters])

  useEffect(() => {
    if (!loading) { setTimedOut(false); return }
    const timer = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [loading])

  function applyQuick(key) {
    const range = QUICK_RANGES.find(r => r.key === key)
    if (!range) return
    const [from, to] = range.getRange()
    setDateFrom(from)
    setDateTo(to)
    setActiveQuick(key)
    setTimedOut(false)
    setAppliedFilters(buildFilters(from, to, ipBrands, isPartner))
  }

  function toggleIp(val) {
    setIpBrands(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  function handleSearch() {
    setTimedOut(false)
    setAppliedFilters(draftFilters)
  }

  const showLoader = loading && !timedOut
  const showTable  = !loading && renderRows.length > 0
  const showEmpty  = !showLoader && !showTable

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <PageHeader icon="fa-file-alt" title={t.reports || 'Reports'} />

      <FilterCard className="reports-filter-card">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {QUICK_RANGES.map(r => (
            <Chip
              key={r.key}
              label={quickLabels[r.key]}
              variant={activeQuick === r.key ? 'filled' : 'outlined'}
              color={activeQuick === r.key ? 'primary' : 'default'}
              onClick={() => applyQuick(r.key)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Box>
        <Box className="reports-filter-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(220px, 0.8fr)' }, gap: 2, mb: 2, alignItems: 'end' }}>
          <DateRangeFilter
            label={t.dateRange || 'Date Range'}
            from={dateFrom}
            to={dateTo}
            onFromChange={v => { setDateFrom(v); setActiveQuick(null) }}
            onToChange={v => { setDateTo(v); setActiveQuick(null) }}
          />
          {!isPartner && (
            <StatusChipFilter label="IP Brand" values={ipBrands} options={IP_OPTIONS} onToggle={toggleIp} />
          )}
        </Box>
        <Box className="reports-filter-actions" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <ApplyFiltersButton onClick={handleSearch} label={t.search || 'Search'} />
          {rows?.length > 0 && (
            <Button
              variant="outlined"
              size="medium"
              startIcon={<i className="fa fa-download" />}
              onClick={() => exportCsv(rows)}
            >
              {t.exportCSV || 'Export CSV'}
            </Button>
          )}
        </Box>
      </FilterCard>

      {showLoader && <LoadingIndicator />}

      {showEmpty && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <i className="fa fa-inbox" style={{ fontSize: 40, opacity: 0.3 }} />
          <p style={{ marginTop: 12, fontSize: 15 }}>No data found for the selected period.</p>
        </Box>
      )}

      {showTable && (
        <>
          <TableShell className="reports-table-shell">
            <table className="reports-table w-full text-sm">
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Date</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>IP Brand</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Project</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Ticket Type</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Payment</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#111827' }}>Amount (CAD)</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Status</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Verified At</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Order ID</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Slot Time</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: '#111827' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {renderRows.map((item, idx) => {
                  if (item.type === 'brand_header') {
                    return (
                      <tr key={`bh-${idx}`} style={{ background: '#1e40af' }}>
                        <td colSpan={COL_COUNT} className="px-3 py-1.5 font-bold text-white text-sm">
                          {item.brand || '—'}
                        </td>
                      </tr>
                    )
                  }
                  if (item.type === 'event_subtotal') {
                    return (
                      <tr key={`es-${idx}`} style={{ background: '#dbeafe' }}>
                        <td colSpan={5} className="px-3 py-1 font-semibold text-xs" style={{ color: '#1e3a8a' }}>
                          {item.event} — Subtotal ({item.count} tickets)
                        </td>
                        <td className="px-3 py-1 text-right font-semibold text-xs" style={{ color: '#1e3a8a' }}>
                          ${item.amount.toFixed(2)}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    )
                  }
                  if (item.type === 'brand_total') {
                    return (
                      <tr key={`bt-${idx}`} style={{ background: '#bfdbfe' }}>
                        <td colSpan={5} className="px-3 py-1.5 font-bold text-xs" style={{ color: '#1e3a8a' }}>
                          {item.brand} Total ({item.count} tickets)
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-xs" style={{ color: '#1e3a8a' }}>
                          ${item.amount.toFixed(2)}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    )
                  }
                  if (item.type === 'grand_total') {
                    return (
                      <tr key={`gt-${idx}`} style={{ background: '#1e3a8a' }}>
                        <td colSpan={5} className="px-3 py-2 font-bold text-sm text-white">
                          Grand Total ({item.count} tickets)
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-sm text-white">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    )
                  }
                  const { row } = item
                  return (
                    <tr key={`d-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-800">{row.date || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.ipBrand || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.eventName || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.ticketType || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.paymentMethod || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-800">${(row.ticketAmount || 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5"><StatusBadge status={row.ticketStatus} /></td>
                      <td className="px-3 py-1.5 text-gray-800">{row.checkedInAt || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600 font-mono text-xs">{row.orderId || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.slotTime || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600 text-xs">{row.remarks || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableShell>
          <ReportMobileCards renderRows={renderRows} />
        </>
      )}
    </Box>
  )
}
