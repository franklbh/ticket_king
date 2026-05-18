import { QRCodeSVG } from 'qrcode.react'

export default function QrCodeDialog({ title = 'QR Code', value, subtitle, onClose }) {
  if (!value) return null
  function copyValue() {
    navigator.clipboard?.writeText(value).catch(() => {})
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        {subtitle && <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>{subtitle}</div>}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 16, display: 'inline-block' }}>
          <QRCodeSVG value={value} size={208} level="M" includeMargin />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', wordBreak: 'break-all', marginBottom: 16 }}>
          {value}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={copyValue}>Copy Payload</button>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
