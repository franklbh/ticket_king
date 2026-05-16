import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

export function PageHeader({ icon, title, subtitle, actions, meta }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="m-0 flex items-center gap-2 text-[22px] font-bold tracking-normal text-slate-950">
          {icon && <i className={`fa ${icon} text-brand-500`} />}
          {title}
        </h1>
        {subtitle && <p className="m-0 mt-1 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {(actions || meta) && (
        <div className="flex shrink-0 items-center gap-3">
          {meta && <div className="text-sm text-slate-500">{meta}</div>}
          {actions}
        </div>
      )}
    </div>
  )
}

export function AdminAlert({ tone = 'warning', children }) {
  const severity = tone === 'error' ? 'error' : tone === 'success' ? 'success' : tone === 'info' ? 'info' : 'warning'
  return (
    <Alert severity={severity} className="mb-4 rounded-lg text-[13px]">
      {children}
    </Alert>
  )
}

export function AdminCard({ children, className = '' }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 ${className}`}>
      {children}
    </section>
  )
}

export function FilterCard({ children, className = '' }) {
  return (
    <section className={`mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 ${className}`}>
      {children}
    </section>
  )
}

export function TableShell({ children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/30 ${className}`}>
      {children}
    </section>
  )
}

export function EmptyTableRow({ colSpan, children = 'No records found' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-slate-400">
        {children}
      </td>
    </tr>
  )
}

export function AdminPagination({ page, total, pageSize, onPage }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  const visible = Math.min(pages, 7)
  return (
    <div className="pagination">
      <button type="button" className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      {Array.from({ length: visible }, (_, i) => {
        const n = i + 1
        return (
          <button
            key={n}
            type="button"
            className={`page-btn ${n === page ? 'active' : ''}`}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        )
      })}
      <button type="button" className="page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

export function IconButton({ icon, children, variant = 'secondary', size = 'md', className = '', ...props }) {
  const color = variant === 'primary' ? 'primary' : variant === 'danger' ? 'error' : 'inherit'
  return (
    <Button
      variant={variant === 'secondary' ? 'outlined' : 'contained'}
      color={color}
      size={size === 'sm' ? 'small' : 'medium'}
      className={className}
      startIcon={icon ? <i className={`fa ${icon}`} /> : null}
      {...props}
    >
      {children}
    </Button>
  )
}
