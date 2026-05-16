export default function LoadingIndicator({ label = 'Loading...', fullPage = true }) {
  return (
    <div className={fullPage ? 'loading-indicator loading-indicator-page' : 'loading-indicator'} role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function PageLoading({ loading, label, children }) {
  if (loading) return <LoadingIndicator label={label} />
  return children
}
