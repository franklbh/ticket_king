import { useState } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export function StatCard({ icon, iconBg, title, value, sub }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 104, px: 2.5, py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ width: 58, height: 58, borderRadius: 1.5, bgcolor: iconBg, display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography color="text.secondary" fontWeight={700} sx={{ fontSize: 13, lineHeight: 1.2 }}>{title}</Typography>
          <Typography color="text.primary" fontWeight={800} sx={{ my: 0.35, fontSize: 26, lineHeight: 1.05, letterSpacing: 0 }}>{value}</Typography>
          {sub && <Typography color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.2 }}>{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  )
}

export function SummaryCard({ label, value, color }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ px: 2, py: 2, '&:last-child': { pb: 2 } }}>
        <Typography color="text.secondary" fontWeight={700} sx={{ fontSize: 13 }}>{label}</Typography>
        <Typography fontWeight={800} sx={{ color, mt: 1, fontSize: 26, lineHeight: 1.1, letterSpacing: 0 }}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

export function QuickActionCard({ icon, label, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        minHeight: 82,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        color: 'primary.main',
        '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.light' },
      }}
    >
      <i className={`fa ${icon}`} />
      <Typography variant="body2" fontWeight={700} color="text.primary">{label}</Typography>
    </ButtonBase>
  )
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper elevation={6} sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="caption" fontWeight={800}>{label}</Typography>
      {payload.map(p => (
        <Typography key={p.dataKey} variant="caption" display="block" sx={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? `$${p.value}` : p.value}
        </Typography>
      ))}
    </Paper>
  )
}

export function PopularSlotsChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  if (!data.length) return <Box sx={{ py: 8, textAlign: 'center', color: 'text.disabled' }}>No data</Box>

  return (
    <Stack spacing={1.5}>
      {data.map((s, i) => {
        const barPct = (s.sold / s.total) * 100
        const { date, time } = formatSlot(s.slot)
        return (
          <Box
            key={i}
            sx={{ position: 'relative', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 2, alignItems: 'center' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <Box>
              <Typography variant="body2" fontWeight={700}>{date}</Typography>
              <Typography variant="caption" color="text.secondary">{time}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LinearProgress variant="determinate" value={Math.min(barPct, 100)} sx={{ flex: 1, height: 10, borderRadius: 999 }} />
              <Typography variant="caption" fontWeight={800} color="text.secondary">{s.sold} / {s.total}</Typography>
            </Box>
            {hoveredIdx === i && (
              <Paper elevation={8} sx={{ position: 'absolute', right: 0, top: 28, zIndex: 10, p: 1.5, borderRadius: 2, minWidth: 220 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="primary" fontWeight={800}>
                  <i className="fa fa-ticket" />
                  {' '}Slot Breakdown
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{date} {time}</Typography>
                  <Typography variant="body2">Sold seats from live ticket records</Typography>
                  <Typography variant="body2" fontWeight={800}>{s.sold} / {s.total} seats</Typography>
                </Stack>
              </Paper>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}

function formatSlot(slot) {
  const [date, time = ''] = String(slot || '').split(' ')
  return { date, time: time.slice(0, 5) }
}
