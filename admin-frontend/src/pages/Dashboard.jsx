import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { useAuth } from '../context/AuthContext'
import { DASHBOARD_STATS, SALES_TREND_90, SLOTS_DATA, TICKET_DISTRIBUTION, TICKETS_DATA } from '../data/mockData'

const RANGE_DAYS = { last7Days: 7, last14Days: 14, last30Days: 30, last90Days: 90 }

const RANGE_OPTIONS = ['last7Days', 'last14Days', 'last30Days', 'last90Days', 'allTime']

function buildDistribution(totalTickets) {
  const baseTotal = TICKET_DISTRIBUTION.reduce((sum, item) => sum + item.value, 0)
  if (!totalTickets || !baseTotal) {
    return TICKET_DISTRIBUTION.map(item => ({ ...item, value: 0, percent: 0 }))
  }

  const exact = TICKET_DISTRIBUTION.map(item => ({
    ...item,
    exactValue: (item.value / baseTotal) * totalTickets,
  }))
  let allocated = 0
  const rows = exact.map(item => {
    const value = Math.floor(item.exactValue)
    allocated += value
    return { ...item, value }
  })
  ;[...rows]
    .sort((a, b) => (b.exactValue - b.value) - (a.exactValue - a.value))
    .slice(0, totalTickets - allocated)
    .forEach(item => {
      const row = rows.find(r => r.name === item.name)
      if (row) row.value += 1
    })

  return rows.map(({ exactValue, ...item }) => ({
    ...item,
    percent: totalTickets ? Math.round((item.value / totalTickets) * 100) : 0,
  }))
}

const SLOT_TICKET_BREAKDOWN = (() => {
  const map = {}
  TICKETS_DATA.forEach(t => {
    const key = `${t.slotDate} ${t.slotStart}:00`
    if (!map[key]) map[key] = {}
    map[key][t.ticketType] = (map[key][t.ticketType] || 0) + 1
  })
  return map
})()

function buildPopularSlots() {
  return SLOTS_DATA
    .map(slot => ({
      slot: `${slot.date} ${slot.startTime}:00`,
      sold: slot.websiteSeats + slot.inStoreSeats,
      total: slot.totalSeats,
    }))
    .filter(slot => slot.sold > 0)
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .slice(0, 10)
}

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
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#6366f1' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#e5e7eb' }}
    >
      <i className={`fa ${icon}`} style={{ fontSize: 28, color: '#6366f1' }} />
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

function formatSlot(slot) {
  const [date, time] = slot.split(' ')
  return { date, time: time.slice(0, 5) }
}

function PopularSlotsChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  if (!data.length) return <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>No data</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((s, i) => {
        const barPct = (s.sold / s.total) * 100
        const { date, time } = formatSlot(s.slot)
        const breakdown = Object.entries(SLOT_TICKET_BREAKDOWN[s.slot] || {})
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Label */}
            <div style={{ width: 96, flexShrink: 0, textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{date}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{time}</div>
            </div>

            {/* Progress bar track */}
            <div style={{ flex: 1, height: 28, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: barPct > 0 ? `max(${barPct}%, 72px)` : 0,
                background: 'linear-gradient(90deg, #818cf8, #a5b4fc)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center',
                transition: 'width 0.5s ease',
              }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, paddingLeft: 10, whiteSpace: 'nowrap' }}>
                  {s.sold} / {s.total}
                </span>
              </div>
            </div>

            {/* Hover tooltip */}
            {hoveredIdx === i && breakdown.length > 0 && (
              <div style={{
                position: 'absolute', left: 110, bottom: 'calc(100% + 10px)',
                background: '#fff', borderRadius: 10, zIndex: 10,
                whiteSpace: 'nowrap', pointerEvents: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
                minWidth: 220,
              }}>
                {/* Header */}
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-ticket" style={{ color: '#6366f1', fontSize: 11 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Slot Breakdown</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{date} {time}</span>
                </div>
                {/* Rows */}
                <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {breakdown.map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                        <span style={{ color: '#9ca3af', marginRight: 4 }}>Ticket Type:</span>{type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 4, padding: '1px 7px' }}>
                        × {count}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Footer total */}
                <div style={{ padding: '6px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Total Sold</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{s.sold} / {s.total} seats</span>
                </div>
                {/* Arrow */}
                <div style={{
                  position: 'absolute', bottom: -5, left: 20,
                  width: 9, height: 9, background: '#fff',
                  border: '1px solid #e5e7eb', borderTop: 'none', borderLeft: 'none',
                  transform: 'rotate(45deg)',
                }} />
              </div>
            )}
          </div>
        )
      })}
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
  const popularSlots = buildPopularSlots()

  const trend = RANGE_DAYS[range]
    ? SALES_TREND_90.slice(-RANGE_DAYS[range])
    : SALES_TREND_90

  const totalRevenue = trend.reduce((s, d) => s + d.revenue, 0)
  const totalOrders  = trend.reduce((s, d) => s + (d.orders || 0), 0)
  const totalTickets = trend.reduce((s, d) => s + d.tickets, 0)
  const distribution = buildDistribution(totalTickets)

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa fa-chart-line" style={{ color: '#6366f1' }} />
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
            <i className="fa fa-chart-bar" style={{ color: '#6366f1' }} />
            {t.statisticsAnalysis}
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer',
                  background: range === r ? '#6366f1' : '#fff',
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
          <SummaryCard label={t.totalRevenue} value={`$${totalRevenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`} color="#6366f1" />
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
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (CAD)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
                  label={({ payload }) => payload.value > 0 ? `${payload.percent}%` : ''}
                  labelLine={false}
                >
                  {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} tickets (${props.payload.percent}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              {distribution.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ color: '#6b7280' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{d.value}</span>
                  <span style={{ width: 42, textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>{d.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popular Slots */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
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
      </div>

      {/* Quick Actions */}
      <div className="stat-card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa fa-bolt" style={{ color: '#6366f1' }} />
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
