function currency(n) {
  return `CA$${Number(n).toFixed(2)}`
}

export default function Cart({ items, onUpdateQty, onRemove, onClose, onCheckout }) {
  const subtotal    = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const numTickets  = items.reduce((s, i) => s + i.quantity, 0)
  const procFee     = numTickets > 0 ? 1.8 * numTickets + 0.04 * subtotal : 0
  const tax         = numTickets > 0 ? 0.05 * subtotal : 0
  const grand       = subtotal + procFee + tax

  // Group items by show + session for display
  const grouped = items.reduce((acc, item) => {
    const key = `${item.show_id}||${item.session_date}||${item.session_time}`
    if (!acc[key]) acc[key] = { show_title: item.show_title, session_date: item.session_date, session_time: item.session_time, items: [] }
    acc[key].items.push(item)
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 860,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7d2c21" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>
              Shopping Cart
              {items.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>
                  ({numTickets} ticket{numTickets !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f9fafb', border: 'none', borderRadius: 8,
              width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '72px 32px', gap: 16, color: '#9ca3af',
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Your cart is empty</p>
            <p style={{ margin: 0, fontSize: 14 }}>Add tickets from any show to get started.</p>
            <button
              onClick={onClose}
              style={{
                marginTop: 8, padding: '10px 24px', borderRadius: 8,
                background: '#7d2c21', color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Browse Shows
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Show', 'Session', 'Ticket Type', 'Unit Price', 'Quantity', 'Subtotal', ''].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontWeight: 600, color: '#6b7280', fontSize: 12,
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      {/* Show */}
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111', minWidth: 160 }}>
                        {item.show_title}
                      </td>
                      {/* Session */}
                      <td style={{ padding: '14px 16px', color: '#374151', whiteSpace: 'nowrap' }}>
                        {item.session_date && item.session_time
                          ? `${item.session_date} · ${item.session_time}`
                          : '—'}
                      </td>
                      {/* Ticket type */}
                      <td style={{ padding: '14px 16px', color: '#374151' }}>
                        {item.ticket_type_label}
                      </td>
                      {/* Unit price */}
                      <td style={{ padding: '14px 16px', color: '#374151', whiteSpace: 'nowrap' }}>
                        {currency(item.unit_price)}
                      </td>
                      {/* Quantity */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                            style={qtyBtnStyle}
                            aria-label="Decrease"
                          >−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, color: '#111' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                            style={qtyBtnStyle}
                            aria-label="Increase"
                          >+</button>
                        </div>
                      </td>
                      {/* Subtotal */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>
                        {currency(item.unit_price * item.quantity)}
                      </td>
                      {/* Remove */}
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => onRemove(item.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#d1d5db', fontSize: 18, lineHeight: 1,
                            transition: 'color 0.15s', padding: 4,
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                          aria-label="Remove item"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: '24px 28px', borderTop: '1px solid #f0f0f0',
              display: 'flex', flexWrap: 'wrap', gap: 24,
              alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              {/* Clear button */}
              <button
                onClick={() => items.forEach(i => onRemove(i.id))}
                style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
                  color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: '8px 16px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#9ca3af' }}
              >
                Clear cart
              </button>

              {/* Order summary + checkout */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 280 }}>
                <div style={{ width: '100%', background: '#f9fafb', borderRadius: 12, padding: '16px 18px' }}>
                  <SummaryRow label="Subtotal" value={currency(subtotal)} />
                  <SummaryRow label={`Fees & taxes`} value={currency(procFee + tax)} muted />
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
                    <SummaryRow label="Total due" value={currency(grand)} bold />
                  </div>
                </div>
                <button
                  onClick={() => onCheckout(grand)}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #7d2c21, #9b3b2c)',
                    color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '0.02em',
                    boxShadow: '0 4px 16px rgba(125,44,33,0.3)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  Checkout — {currency(grand)}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 12 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Secured by&nbsp;<span style={{ color: '#635BFF', fontWeight: 700 }}>stripe</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, muted, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
      <span style={{ color: muted ? '#9ca3af' : '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, fontSize: bold ? 16 : 14, color: bold ? '#111' : '#374151' }}>{value}</span>
    </div>
  )
}

const qtyBtnStyle = {
  width: 26, height: 26, borderRadius: 6,
  border: '1.5px solid #e5e7eb', background: '#fff',
  cursor: 'pointer', fontSize: 16, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#374151', fontWeight: 600, padding: 0,
  transition: 'border-color 0.15s',
}
