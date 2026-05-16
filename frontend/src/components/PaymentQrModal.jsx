import { qrPlaceholder } from '../data/showData'

const METHOD_CONFIG = {
  wechat: {
    label: 'WeChat Pay',
    color: '#2563eb',
    textColor: '#fff',
    steps: [
      'Open WeChat on your phone',
      'Tap  +  then "Scan"',
      'Point your camera at the QR code',
      'Confirm payment amount and pay',
    ],
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32" fill="#fff">
        <path d="M19.8 10.8C11.4 10.8 4.8 16.5 4.8 23.6c0 4.1 2.3 7.7 5.9 10.1l-1.2 4.5 5.3-2.6c1.9.7 4.1 1.2 6.4 1.2 1.1 0 2.2-.1 3.3-.3-.5-1.4-.8-2.9-.8-4.5 0-6.6 6.2-11.9 14-11.9.5 0 1 0 1.5.1-1.7-5.5-8.4-9.4-19.4-9.4z"/>
        <path d="M37.5 22.5c-6.1 0-11 4.1-11 9.2s4.9 9.2 11 9.2c1.5 0 3-.3 4.3-.7l3.7 1.8-.9-3.2c2.1-1.7 3.4-4.1 3.4-6.9 0-5.2-4.9-9.4-10.5-9.4z"/>
      </svg>
    ),
  },
  alipay: {
    label: 'Alipay',
    color: '#2563eb',
    textColor: '#fff',
    steps: [
      'Open Alipay on your phone',
      'Tap "Scan" (扫一扫)',
      'Point your camera at the QR code',
      'Confirm payment amount and pay',
    ],
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32" fill="#fff">
        <text x="8" y="36" fontSize="32" fontWeight="bold" fontFamily="sans-serif">支</text>
      </svg>
    ),
  },
}

function PaymentQrModal({ alphapayQrImage, onCancel, showQr }) {
  const cfg = METHOD_CONFIG[showQr] ?? METHOD_CONFIG.alipay

  return (
    <div className="qrm-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label="Scan to pay">
      <div className="qrm-card" onClick={(e) => e.stopPropagation()}>

        {/* ── Branded header ── */}
        <div className="qrm-header" style={{ background: cfg.color }}>
          <div className="qrm-method-icon">{cfg.icon}</div>
          <div>
            <div className="qrm-method-label">{cfg.label}</div>
            <div className="qrm-method-sub">Scan QR code to pay</div>
          </div>
          <button className="qrm-close" onClick={onCancel} aria-label="Close" style={{ color: cfg.textColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── QR code ── */}
        <div className="qrm-body">
          <div className="qrm-qr-wrap" style={{ borderColor: cfg.color + '40' }}>
            <img
              src={alphapayQrImage || qrPlaceholder}
              alt={`${cfg.label} QR code`}
              className="qrm-qr-img"
            />
            {!alphapayQrImage && (
              <div className="qrm-qr-loading">
                <div className="qrm-spinner" style={{ borderTopColor: cfg.color }} />
                <span>Generating QR code…</span>
              </div>
            )}
          </div>

          {/* ── Steps ── */}
          <ol className="qrm-steps">
            {cfg.steps.map((step, i) => (
              <li key={i} className="qrm-step">
                <span className="qrm-step-num" style={{ background: cfg.color }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="qrm-auto-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Page updates automatically once payment is confirmed
          </div>
        </div>

        {/* ── Footer ── */}
        <button className="qrm-cancel-btn" onClick={onCancel}>
          Cancel payment
        </button>
      </div>
    </div>
  )
}

export default PaymentQrModal
