import { useState } from 'react'

export function StatCard({ icon, iconBg, title, value, sub }) {
  return (
    <div className="stat-card dashboard-stat-card">
      <div className="dashboard-stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <div className="dashboard-stat-title">{title}</div>
        <div className="dashboard-stat-value">{value}</div>
        {sub && <div className="dashboard-stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function SummaryCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="dashboard-summary-label">{label}</div>
      <div className="dashboard-summary-value" style={{ color }}>{value}</div>
    </div>
  )
}

export function QuickActionCard({ icon, label, onClick }) {
  return (
    <button className="dashboard-quick-action" onClick={onClick}>
      <i className={`fa ${icon}`} />
      <span>{label}</span>
    </button>
  )
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-title">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? `$${p.value}` : p.value}
        </div>
      ))}
    </div>
  )
}

export function PopularSlotsChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  if (!data.length) return <div className="dashboard-empty-chart">No data</div>

  return (
    <div className="dashboard-popular-list">
      {data.map((s, i) => {
        const barPct = (s.sold / s.total) * 100
        const { date, time } = formatSlot(s.slot)
        return (
          <div
            key={i}
            className="dashboard-popular-row"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="dashboard-popular-label">
              <div>{date}</div>
              <span>{time}</span>
            </div>
            <div className="dashboard-popular-track">
              <div
                className="dashboard-popular-bar"
                style={{ width: barPct > 0 ? `max(${barPct}%, 72px)` : 0 }}
              >
                <span>{s.sold} / {s.total}</span>
              </div>
            </div>
            {hoveredIdx === i && (
              <div className="dashboard-popover">
                <div className="dashboard-popover-header">
                  <i className="fa fa-ticket" />
                  <span>Slot Breakdown</span>
                  <small>{date} {time}</small>
                </div>
                <div className="dashboard-popover-body">Sold seats from live ticket records</div>
                <div className="dashboard-popover-footer">
                  <span>Total Sold</span>
                  <strong>{s.sold} / {s.total} seats</strong>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatSlot(slot) {
  const [date, time = ''] = String(slot || '').split(' ')
  return { date, time: time.slice(0, 5) }
}
