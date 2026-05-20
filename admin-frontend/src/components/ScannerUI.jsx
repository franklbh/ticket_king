export function ScannerCard({ children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 ${className}`}>
      {children}
    </section>
  )
}

export function ScannerSectionTitle({ icon, title, actions }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <i className={`fa ${icon} text-brand-500`} />
        {title}
      </div>
      {actions}
    </div>
  )
}

export function ScannerStat({ value, label, color = '#6366f1', bg = '#eff6ff', border = '#bfdbfe' }) {
  return (
    <div className="scanner-stat">
      <div
        className="scanner-stat-value"
        style={{ background: bg, borderColor: border, color }}
      >
        {value}
      </div>
      <span className="scanner-stat-label">{label}</span>
    </div>
  )
}

export function ScannerActionButton({ children, className = '', variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'border border-brand-500 bg-brand-500 text-white hover:bg-brand-600',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
