import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { useAuth } from '../context/AuthContext'
import { DASHBOARD_STATS, SALES_TREND, POPULAR_SLOTS, TICKET_DISTRIBUTION } from '../data/mockData'

const RANGE_OPTIONS = ['last7Days', 'last14Days', 'last30Days', 'last90Days', 'allTime']

function StatCard({ icon, iconBg, title, value, sub }) {
  return (
    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function QuickActionCard({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '24px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s', minWidth: 140,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#7b2020' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#e5e7eb' }}
    >
      <i className={`fa ${icon}`} style={{ fontSize: 28, color: '#7b2020' }} />
      <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</span>
    </button>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? `$${p.value}` : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { lang } = useLang()
  const { admin } = useAuth()
  const t = useT(lang)
  const navigate = useNavigate()
  const [range, setRange] = useState('last7Days')

  const stats = DASHBOARD_STATS
  const trend = SALES_TREND
  const popularSlots = POPULAR_SLOTS
  const distribution = TICKET_DISTRIBUTION

  const totalRevenue = trend.reduce((s, d) => s + d.revenue, 0).toFixed(2)
  const totalOrders = 15
  const totalTickets = 56

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa fa-chart-line" style={{ color: '#7b2020' }} />
          {t.dashboard}
        </h1>
        <div style={{ fontSize: 14, color: '#6b7280' }}>{t.welcomeBack}, {admin?.username}!</div>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={<i className="fa fa-dollar-sign" style={{ color: '#f59e0b' }} />}
          iconBg="#fef3c7"
          title={t.todayRevenue}
          value={`$${stats.todayRevenue.toFixed(2)}`}
          sub={`${stats.todayOrders} ${t.orders4}`}
        />
        <StatCard
          icon={<i className="fa fa-ticket" style={{ color: '#10b981' }} />}
          iconBg="#d1fae5"
          title={t.todayTickets}
          value={stats.todayTickets}
          sub={t.tickets}
        />
        <StatCard
          icon={<i className="fa fa-clock" style={{ color: '#f59e0b' }} />}
          iconBg="#fef3c7"
          title={t.pending}
          value={stats.pendingOrders}
          sub={`${t.pendingStatus} ${t.orders4}`}
        />
        <StatCard
          icon={<i className="fa fa-calendar-check" style={{ color: '#6366f1' }} />}
          iconBg="#ede9fe"
          title={t.activeSlots}
          value={stats.activeSlots.toLocaleString()}
          sub={t.inProgress}
        />
      </div>

      {/* Stats & Analysis */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827' }}>
            <i className="fa fa-chart-bar" style={{ color: '#7b2020' }} />
            {t.statisticsAnalysis}
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer',
                  background: range === r ? '#7b2020' : '#fff',
                  color: range === r ? '#fff' : '#374151',
                  fontSize: 13, fontWeight: range === r ? 600 : 400,
                }}
              >
                {t[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <SummaryCard label={t.totalRevenue} value={`$${Number(totalRevenue).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`} color="#7b2020" />
          <SummaryCard label={t.totalOrders} value={totalOrders} color="#10b981" />
          <SummaryCard label={t.totalTickets} value={totalTickets} color="#6366f1" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Sales trend */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{t.salesTrend}</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (CAD)" stroke="#7b2020" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" dataKey="tickets" name="Ticket Count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} fill="#d1fae5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ticket distribution */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{t.ticketDistribution}</div>
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
                >
                  {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              {distribution.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ color: '#6b7280' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popular Slots */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t.popularSlots}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 8 }}>
          <div />
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 10, background: '#7b2020', borderRadius: 2, marginRight: 4 }} />Seats Sold</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 10, background: '#e5e7eb', borderRadius: 2, marginRight: 4 }} />Total Seats</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={popularSlots}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 140, bottom: 0 }}
            barSize={14}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Seat Count', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis type="category" dataKey="slot" tick={{ fontSize: 11 }} width={140} />
            <Tooltip formatter={(v, name) => [v, name === 'sold' ? 'Seats Sold' : 'Total']} />
            <Bar dataKey="total" fill="#e5e7eb" radius={[0, 3, 3, 0]} />
            <Bar dataKey="sold" fill="#7b2020" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="stat-card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa fa-bolt" style={{ color: '#7b2020' }} />
          {t.quickActions}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <QuickActionCard icon="fa-shopping-cart" label={t.ordersManagement} onClick={() => navigate('/orders')} />
          <QuickActionCard icon="fa-ticket" label={t.ticketsManagement} onClick={() => navigate('/tickets')} />
          <QuickActionCard icon="fa-calendar" label={t.slotsManagement} onClick={() => navigate('/slots')} />
          <QuickActionCard icon="fa-qrcode" label={t.scanVerify} onClick={() => window.open('/scanner', '_blank')} />
        </div>
      </div>
    </div>
  )
}
