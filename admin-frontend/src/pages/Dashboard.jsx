import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { useAuth } from '../context/authHooks'
import { useDashboardQuery, useIncomeByEventQuery } from '../hooks/dashboard'
import { useTicketsQuery } from '../hooks/tickets'
import {
  CustomTooltip,
  PopularSlotsChart,
  QuickActionCard,
  StatCard,
  SummaryCard,
} from '../components/DashboardWidgets'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, AdminCard, PageHeader } from '../components/AdminUI'
import { can } from '../auth/permissions'
import { todayIso } from '../utils/date'
import { localizeCatalogName } from '../utils/localization'

const RANGE_TO_API = { last7Days: '7d', last14Days: '14d', last30Days: '30d', last90Days: '90d', allTime: 'all' }
const RANGE_OPTIONS = ['last7Days', 'last14Days', 'last30Days', 'last90Days', 'allTime']

const PROJECT_RANGE_TO_API = { today: 'today', last7Days: '7d', last14Days: '14d', last30Days: '30d', last90Days: '90d', allTime: 'all' }
const PROJECT_RANGE_OPTIONS = ['today', 'last7Days', 'last14Days', 'last30Days', 'last90Days', 'allTime']

const EMPTY_DASHBOARD = {
  stats: { todayRevenue: 0, todayOrders: 0, todayTickets: 0, pendingOrders: 0, activeSlots: 0 },
  summary: { totalRevenue: 0, totalOrders: 0, totalTickets: 0 },
  salesTrend: [],
  ticketDistribution: [],
  popularSlots: [],
}

function ProjectRevenueTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Box
      sx={{
        minWidth: 170,
        maxWidth: 240,
        p: 1.35,
        border: '1px solid rgba(148, 163, 184, 0.24)',
        borderRadius: 2,
        background: '#fff',
        boxShadow: '0 18px 42px rgba(15, 23, 42, 0.16)',
      }}
    >
      <Typography fontWeight={800} fontSize={13} color="#111827" lineHeight={1.2} sx={{ overflowWrap: 'anywhere' }}>
        {row.eventName || (t ? t.project : 'Project')}
      </Typography>
      <Typography fontWeight={900} fontSize={18} color="#2563eb" lineHeight={1.1} sx={{ mt: 0.65 }}>
        {row.percentLabel || `${row.percent}%`}
      </Typography>
    </Box>
  )
}

function ticketSlotTimeText(ticket) {
  return [ticket.slotStart, ticket.slotEnd].filter(Boolean).join('-') || ticket.slotDate || '-'
}

function buildReservationSummary(tickets, lang) {
  const groups = new Map()

  function addItem(name, time, count) {
    const ticketCount = Number(count || 0)
    if (!ticketCount) return
    const label = name ? localizeCatalogName(name, lang) : '-'
    const slotTime = time || '-'
    const group = groups.get(label) || { name: label, total: 0, slots: new Map() }
    group.total += ticketCount
    group.slots.set(slotTime, (group.slots.get(slotTime) || 0) + ticketCount)
    groups.set(label, group)
  }

  tickets.forEach(ticket => addItem(ticket.eventName, ticketSlotTimeText(ticket), 1))

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      slots: Array.from(group.slots.entries())
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .sort((a, b) => (a.slots[0]?.time || '').localeCompare(b.slots[0]?.time || '') || a.name.localeCompare(b.name))
}

export default function Dashboard() {
  const { lang } = useLang()
  const { admin } = useAuth()
  const t = useT(lang)
  const navigate = useNavigate()
  const [range, setRange] = useState('allTime')
  const [projectRange, setProjectRange] = useState('today')
  const today = todayIso()
  const canViewTickets = can(admin, 'tickets:read')
  const { data: dashboard, error, loading } = useDashboardQuery(
    RANGE_TO_API[range],
    { initialData: EMPTY_DASHBOARD }
  )
  const { data: todayPendingTickets, error: reservationsError, loading: loadingReservations } = useTicketsQuery(
    { page: 1, pageSize: 200, status: 'not_used', slotDateFrom: today, slotDateTo: today },
    { initialData: { items: [], total: 0 }, enabled: canViewTickets, refetchOnWindowFocus: true }
  )
  const { data: rawIncomeByEvent } = useIncomeByEventQuery(PROJECT_RANGE_TO_API[projectRange])
  const { data: rawIncomeForPie } = useIncomeByEventQuery(RANGE_TO_API[range])

  const stats = dashboard?.stats || EMPTY_DASHBOARD.stats
  const trend = dashboard?.salesTrend || []
  const popularSlots = dashboard?.popularSlots || []
  const distribution = dashboard?.ticketDistribution || []
  const incomeByEvent = (rawIncomeByEvent || []).map(row => ({ ...row, eventName: localizeCatalogName(row.eventName, lang) }))
  const incomeForPie = (rawIncomeForPie || []).map(row => ({ ...row, eventName: localizeCatalogName(row.eventName, lang) }))
  const totalRevenue = dashboard?.summary?.totalRevenue || 0
  const totalOrders  = dashboard?.summary?.totalOrders || 0
  const totalTickets = dashboard?.summary?.totalTickets || 0
  const pendingTicketItems = todayPendingTickets?.items || []
  const pendingReservationTickets = todayPendingTickets?.total ?? pendingTicketItems.length
  const reservationSummary = buildReservationSummary(pendingTicketItems, lang)
  const reservationError = reservationsError

  function openTodayReservations() {
    navigate(`/tickets?slotDate=${encodeURIComponent(today)}&status=not_used`)
  }

  if (loading) {
    return <LoadingIndicator label={t.loadingDashboard} />
  }

  return (
    <div>
      <PageHeader
        icon="fa-chart-line"
        title={t.dashboard}
        meta={`${t.welcomeBack}, ${admin?.username || ''}!`}
      />
      {error && (
        <AdminAlert tone="error">
          {t.backendLoadError} {error.message}
        </AdminAlert>
      )}
      {/* Top stat cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
          width: '100%',
        }}
      >
        {[
          { icon: <i className="fa fa-dollar-sign" style={{ color: '#f59e0b' }} />, bg: '#fef3c7', title: t.todayRevenue, value: `$${stats.todayRevenue.toFixed(2)}`, sub: `${stats.todayTickets} ${t.tickets}` },
          { icon: <i className="fa fa-ticket" style={{ color: '#10b981' }} />, bg: '#d1fae5', title: t.todayTickets, value: stats.todayTickets, sub: t.tickets },
          { icon: <i className="fa fa-clock" style={{ color: '#f59e0b' }} />, bg: '#fef3c7', title: t.pending, value: stats.pendingOrders, sub: `${t.pendingStatus} ${t.orders4}` },
          { icon: <i className="fa fa-calendar-check" style={{ color: '#6366f1' }} />, bg: '#ede9fe', title: t.activeSlots, value: stats.activeSlots.toLocaleString(), sub: t.inProgress },
        ].map(item => (
          <StatCard key={item.title} icon={item.icon} iconBg={item.bg} title={item.title} value={item.value} sub={item.sub} />
        ))}
      </Box>

      {canViewTickets && (
        <AdminCard className="mb-6">
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: reservationSummary.length || reservationError || loadingReservations ? 2 : 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.4} sx={{ minWidth: 0 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <i className="fa fa-clock" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={900} sx={{ fontSize: 20, lineHeight: 1.15 }}>
                  {t.todayReservations}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.25} alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.4, py: 0.8, border: '1px solid #e2e8f0', borderRadius: 999, bgcolor: '#fff7ed', whiteSpace: 'nowrap' }}>
                <Typography sx={{ fontSize: 18, lineHeight: 1, fontWeight: 900, color: '#9a3412' }}>{pendingReservationTickets}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>{t.pending}</Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={openTodayReservations} startIcon={<i className="fa fa-filter" />} sx={{ fontWeight: 800, whiteSpace: 'nowrap', bgcolor: '#fff' }}>
                {t.viewPendingReservations}
              </Button>
            </Stack>
          </Stack>

          {reservationError && (
            <AdminAlert tone="warning">
              {t.backendLoadError} {reservationError.message}
            </AdminAlert>
          )}

          {loadingReservations && (
            <Box sx={{ pt: 0.5, color: 'text.secondary', fontSize: 13, fontWeight: 700 }}>{t.loadingReservations}</Box>
          )}

          {!loadingReservations && reservationSummary.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
              {reservationSummary.map(item => {
                const visibleSlots = item.slots.slice(0, 4)
                const hiddenCount = item.slots.length - visibleSlots.length
                return (
                  <Box key={item.name} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, bgcolor: '#fff', minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25}>
                      <Typography sx={{ fontSize: 14, lineHeight: 1.2, fontWeight: 900, color: '#111827', minWidth: 0 }}>
                        {item.name}
                      </Typography>
                      <Box sx={{ px: 1.1, py: 0.45, borderRadius: 999, bgcolor: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' }}>
                        {item.total} {t.tickets}
                      </Box>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.2 }}>
                      {visibleSlots.map(slot => (
                        <Box key={slot.time} sx={{ px: 1, py: 0.45, borderRadius: 1.2, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', color: '#475569', fontSize: 12, fontWeight: 800 }}>
                          {slot.time} · {slot.count}
                        </Box>
                      ))}
                      {hiddenCount > 0 && (
                        <Box sx={{ px: 1, py: 0.45, borderRadius: 1.2, bgcolor: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 800 }}>
                          +{hiddenCount}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </AdminCard>
      )}

      {/* Stats & Analysis */}
      <AdminCard className="mb-6">
        <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fa fa-chart-bar" style={{ color: '#6366f1' }} />
            {t.statisticsAnalysis}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={range}
            onChange={(_, value) => value && setRange(value)}
            sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { border: '1px solid #e5e7eb !important', borderRadius: '8px !important', fontWeight: 700 } }}
          >
            {RANGE_OPTIONS.map(r => (
              <ToggleButton key={r} value={r} sx={{ textTransform: 'none', px: 1.5, py: 0.6, fontSize: 13 }}>
                {t[r]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {/* Summary row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
            width: '100%',
          }}
        >
          <SummaryCard label={t.totalRevenue} value={`$${totalRevenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`} color="#6366f1" />
          <SummaryCard label={t.totalOrders} value={totalOrders} color="#10b981" />
          <SummaryCard label={t.totalTickets} value={totalTickets} color="#6366f1" />
        </Box>

        {/* Charts row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px', xl: 'minmax(0, 1fr) 340px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
          {/* Sales trend */}
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>{t.salesTrend}</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="left" type="linear" dataKey="revenue" name={t.revenueCAD} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="linear" dataKey="tickets" name={t.ticketCount} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} fill="#d1fae5" />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Project revenue distribution */}
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>{t.incomeByProject}</Typography>
            {(() => {
              const COLORS = ['#1e40af', '#3b82f6', '#93c5fd', '#f59e0b', '#10b981', '#a78bfa']
              const total = (incomeForPie || []).reduce((s, r) => s + r.revenue, 0) || 1
              const pieData = (incomeForPie || [])
                .map((r, i) => {
                  const percent = r.revenue / total * 100
                  return {
                    ...r,
                    color: COLORS[i % COLORS.length],
                    percent,
                    percentLabel: `${percent.toFixed(percent >= 10 ? 0 : 1)}%`,
                  }
                })
              return (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                        paddingAngle={2} dataKey="revenue" nameKey="eventName">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<ProjectRevenueTooltip t={t} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 1 }}>
                    {pieData.map((d, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, fontSize: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ color: '#6b7280' }}>{d.eventName}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>${d.revenue.toFixed(2)}</span>
                        <span style={{ width: 42, textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>{d.percentLabel}</span>
                      </Box>
                    ))}
                  </Box>
                </>
              )
            })()}
          </Box>
        </Box>
      </AdminCard>

      {/* Revenue by Project */}
      <AdminCard className="mb-6">
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="fa fa-store" style={{ color: '#6366f1' }} />
            {t.projectRevenue}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={projectRange}
              onChange={(_, value) => value && setProjectRange(value)}
              sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { border: '1px solid #e5e7eb !important', borderRadius: '8px !important', fontWeight: 700 } }}
            >
              {PROJECT_RANGE_OPTIONS.map(r => (
                <ToggleButton key={r} value={r} sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, py: 0.6, fontSize: 13 }}>
                  {r === 'today' ? t.todayShort : t[r]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <button
              onClick={() => {
                if (!incomeByEvent?.length) return
                const header = 'Project,Revenue (CAD)\n'
                const rows = incomeByEvent.map(row => `"${row.eventName}",${row.revenue.toFixed(2)}`).join('\n')
                const blob = new Blob([header + rows], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `income_by_project_${projectRange}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151',
              }}
            >
              <i className="fa fa-download" />
              {t.exportCSV}
            </button>
          </Stack>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#6366f1', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#fff', fontWeight: 700 }}>{t.project}</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#fff', fontWeight: 700 }}>{t.revenueCAD}</th>
              </tr>
            </thead>
            <tbody>
              {(incomeByEvent || []).map((row, i) => (
                <tr key={row.eventId} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{row.eventName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
                    ${row.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
              {!incomeByEvent?.length && (
                <tr><td colSpan={2} style={{ padding: '20px 12px', textAlign: 'center', color: '#9ca3af' }}>{t.noData}</td></tr>
              )}
            </tbody>
            {incomeByEvent?.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>{t.total}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#6366f1' }}>
                    ${incomeByEvent.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </Box>
      </AdminCard>

      {/* Popular Slots */}
      <AdminCard className="mb-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t.popularSlots}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 12, height: 10, background: '#6366f1', borderRadius: 2 }} />
              {t.seatsSold}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 12, height: 10, background: '#e5e7eb', borderRadius: 2 }} />
              {t.seats}
            </span>
          </div>
        </div>
        <PopularSlotsChart data={popularSlots} />
      </AdminCard>

      {/* Quick Actions */}
      <AdminCard>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa fa-bolt" style={{ color: '#6366f1' }} />
          {t.quickActions}
        </div>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {can(admin, 'orders:read') && <QuickActionCard icon="fa-shopping-cart" label={t.ordersManagement} onClick={() => navigate('/orders')} />}
          {can(admin, 'tickets:read') && <QuickActionCard icon="fa-ticket" label={t.ticketsManagement} onClick={() => navigate('/tickets')} />}
          {can(admin, 'catalog:read') && <QuickActionCard icon="fa-calendar" label={t.slotsManagement} onClick={() => navigate('/slots')} />}
          {can(admin, 'scanner:use') && <QuickActionCard icon="fa-qrcode" label={t.scanVerify} onClick={() => window.open('/scanner', '_blank')} />}
        </Stack>
      </AdminCard>
    </div>
  )
}
