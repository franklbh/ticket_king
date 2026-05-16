import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { useAuth } from '../context/AuthContext'
import { useDashboardQuery } from '../hooks/dashboard'
import {
  CustomTooltip,
  PopularSlotsChart,
  QuickActionCard,
  StatCard,
  SummaryCard,
} from '../components/DashboardWidgets'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, AdminCard, PageHeader } from '../components/AdminUI'

const RANGE_TO_API = { last7Days: '7d', last14Days: '14d', last30Days: '30d', last90Days: '90d', allTime: 'all' }

const RANGE_OPTIONS = ['last7Days', 'last14Days', 'last30Days', 'last90Days', 'allTime']

const EMPTY_DASHBOARD = {
  stats: { todayRevenue: 0, todayOrders: 0, todayTickets: 0, pendingOrders: 0, activeSlots: 0 },
  summary: { totalRevenue: 0, totalOrders: 0, totalTickets: 0 },
  salesTrend: [],
  ticketDistribution: [],
  popularSlots: [],
}

export default function Dashboard() {
  const { lang } = useLang()
  const { admin } = useAuth()
  const t = useT(lang)
  const navigate = useNavigate()
  const [range, setRange] = useState('last7Days')
  const { data: dashboard, error, loading } = useDashboardQuery(
    RANGE_TO_API[range],
    { initialData: EMPTY_DASHBOARD }
  )

  const stats = dashboard?.stats || EMPTY_DASHBOARD.stats
  const trend = dashboard?.salesTrend || []
  const popularSlots = dashboard?.popularSlots || []
  const distribution = dashboard?.ticketDistribution || []
  const totalRevenue = dashboard?.summary?.totalRevenue || 0
  const totalOrders  = dashboard?.summary?.totalOrders || 0
  const totalTickets = dashboard?.summary?.totalTickets || 0

  if (loading) {
    return <LoadingIndicator label="Loading live dashboard data..." />
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
          Backend data could not be loaded: {error.message}
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
          { icon: <i className="fa fa-dollar-sign" style={{ color: '#f59e0b' }} />, bg: '#fef3c7', title: t.todayRevenue, value: `$${stats.todayRevenue.toFixed(2)}`, sub: `${stats.todayOrders} ${t.orders4}` },
          { icon: <i className="fa fa-ticket" style={{ color: '#10b981' }} />, bg: '#d1fae5', title: t.todayTickets, value: stats.todayTickets, sub: t.tickets },
          { icon: <i className="fa fa-clock" style={{ color: '#f59e0b' }} />, bg: '#fef3c7', title: t.pending, value: stats.pendingOrders, sub: `${t.pendingStatus} ${t.orders4}` },
          { icon: <i className="fa fa-calendar-check" style={{ color: '#6366f1' }} />, bg: '#ede9fe', title: t.activeSlots, value: stats.activeSlots.toLocaleString(), sub: t.inProgress },
        ].map(item => (
          <StatCard key={item.title} icon={item.icon} iconBg={item.bg} title={item.title} value={item.value} sub={item.sub} />
        ))}
      </Box>

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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 320px' }, gap: 3 }}>
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
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (CAD)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" dataKey="tickets" name="Ticket Count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} fill="#d1fae5" />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Ticket distribution */}
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>{t.ticketDistribution}</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ payload }) => payload.value > 0 ? `${payload.percent}%` : ''}
                  labelLine={false}
                >
                  {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} tickets (${props.payload.percent}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 1 }}>
              {distribution.map((d, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ color: '#6b7280' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{d.value}</span>
                  <span style={{ width: 42, textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>{d.percent}%</span>
                </Box>
              ))}
            </Box>
          </Box>
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
          <QuickActionCard icon="fa-shopping-cart" label={t.ordersManagement} onClick={() => navigate('/orders')} />
          <QuickActionCard icon="fa-ticket" label={t.ticketsManagement} onClick={() => navigate('/tickets')} />
          <QuickActionCard icon="fa-calendar" label={t.slotsManagement} onClick={() => navigate('/slots')} />
          <QuickActionCard icon="fa-qrcode" label={t.scanVerify} onClick={() => window.open('/scanner', '_blank')} />
        </Stack>
      </AdminCard>
    </div>
  )
}
