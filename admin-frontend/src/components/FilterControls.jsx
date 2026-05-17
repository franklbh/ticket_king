import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const controlSx = {
  '& .MuiInputBase-root': {
    height: 42,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  '& .MuiInputBase-input': {
    py: 0,
  },
}

export function TextFilter({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        sx={controlSx}
      />
    </Box>
  )
}

export function SelectFilter({ label, value, onChange, options }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <FormControl fullWidth size="small" sx={controlSx}>
        <Select value={value} onChange={event => onChange(event.target.value)}>
          {options.map(option => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export function DateRangeFilter({ label, from, to, onFromChange, onToChange }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr)', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          type="date"
          value={from || ''}
          aria-label={`${label} from`}
          onChange={event => onFromChange(event.target.value)}
          sx={controlSx}
        />
        <TextField
          fullWidth
          size="small"
          type="date"
          value={to || ''}
          aria-label={`${label} to`}
          onChange={event => onToChange(event.target.value)}
          sx={controlSx}
        />
      </Box>
    </Box>
  )
}

export function StatusChipFilter({ label, values, options, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}:</span>
      {options.map(option => {
        const selected = values.includes(option.value)
        return (
          <Chip
            key={option.value}
            label={option.label}
            color={selected ? (option.color || 'primary') : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            icon={<Checkbox checked={selected} size="small" sx={{ p: 0, color: 'inherit' }} />}
            onClick={() => onToggle(option.value)}
            sx={{ height: 34, fontWeight: 700, '& .MuiChip-icon': { ml: 0.75 } }}
          />
        )
      })}
    </div>
  )
}

export function ResetFiltersButton({ onClick, label = 'Reset' }) {
  return (
    <Button variant="outlined" size="medium" onClick={onClick} startIcon={<i className="fa fa-redo" />}>
      {label}
    </Button>
  )
}
