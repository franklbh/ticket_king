import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import logoWhite from './user_media/logo_white.png'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')
const BACKEND = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000'

function currency(n) {
  return `CA$${n.toFixed(2)}`
}

// ── Success overlay ─────────────────────────────────────────────────────────

function SuccessOverlay({ orderData, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '52px 48px',
        maxWidth: 460, width: '100%', textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        animation: 'successPop 0.45s cubic-bezier(0.175,0.885,0.32,1.275)',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 8px 32px rgba(34,197,94,0.35)',
          animation: 'checkBounce 0.6s 0.2s ease both',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#111' }}>
          Payment Successful!
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: '#6b7280', lineHeight: 1.55 }}>
          Your order is confirmed. A confirmation and your tickets will be sent to your email.
        </p>

        <div style={{
          background: '#f9fafb', borderRadius: 12, padding: '18px 22px',
          textAlign: 'left', marginBottom: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Order</span>
            <span style={{ fontWeight: 600, color: '#111', fontSize: 13 }}>{orderData.orderId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Event</span>
            <span style={{ fontWeight: 600, color: '#111' }}>{orderData.description}</span>
          </div>
          {orderData.date && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#6b7280' }}>Date</span>
              <span style={{ fontWeight: 600, color: '#111' }}>{orderData.date} · {orderData.time}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 10, borderTop: '1px solid #e5e7eb', marginTop: 6 }}>
            <span style={{ color: '#6b7280' }}>Amount paid</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#111' }}>{currency(orderData.amount)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            background: 'linear-gradient(135deg, #7d2c21, #9b3b2c)',
            color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.02em',
            boxShadow: '0 4px 16px rgba(125,44,33,0.35)',
          }}
        >
          Return to Main Page
        </button>
      </div>

      <style>{`
        @keyframes successPop {
          from { opacity: 0; transform: scale(0.82) translateY(24px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes checkBounce {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.18); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Stripe "Powered by" badge ────────────────────────────────────────────────

function StripeBadge() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 5, marginTop: 18, color: '#9ca3af', fontSize: 12,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Powered by&nbsp;
      <span style={{ color: '#635BFF', fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em' }}>stripe</span>
      <span style={{ margin: '0 6px', color: '#d1d5db' }}>·</span>
      <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy</a>
      <span style={{ margin: '0 6px', color: '#d1d5db' }}>·</span>
      <a href="https://stripe.com/terms" target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms</a>
    </div>
  )
}

// ── Inner payment form (must be inside <Elements>) ───────────────────────────

function PaymentForm({ orderData, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?payment=success`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: { billingDetails: { email: orderData.email } },
          fields: {
            billingDetails: {
              name: 'auto',
              email: 'auto',
              address: { country: 'auto' },
            },
          },
        }}
      />

      {errorMsg && (
        <div style={{
          marginTop: 14, padding: '10px 14px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626',
        }}>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          marginTop: 22, width: '100%', padding: '15px 0', borderRadius: 10,
          background: loading ? '#c4b5b5' : 'linear-gradient(135deg, #7d2c21, #9b3b2c)',
          color: loading ? '#9ca3af' : '#fff',
          border: 'none', fontSize: 17, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em', transition: 'background 0.2s',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(125,44,33,0.3)',
        }}
      >
        {loading ? 'Processing…' : `Pay ${currency(orderData.amount)}`}
      </button>

      <StripeBadge />

      <button
        type="button"
        onClick={onCancel}
        style={{
          marginTop: 12, background: 'none', border: 'none',
          color: '#9ca3af', fontSize: 13, cursor: 'pointer',
          textDecoration: 'underline', padding: '4px 0',
        }}
      >
        Cancel
      </button>
    </form>
  )
}

// ── Main exported checkout overlay ───────────────────────────────────────────

export default function StripeCheckout({ orderData, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    fetch(`${BACKEND}/api/v1/stripe/payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(orderData.amount * 100),
        order_id: orderData.orderId,
        description: orderData.description,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.client_secret) setClientSecret(data.client_secret)
        else setFetchError('Unable to initialize payment.')
      })
      .catch(() => setFetchError('Unable to connect to payment server.'))
  }, [])

  if (paid) {
    return <SuccessOverlay orderData={orderData} onClose={onSuccess ?? onClose} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', overflow: 'hidden',
    }}>
      {/* Left — brand panel */}
      <div style={{
        width: '38%', minWidth: 280,
        background: 'linear-gradient(160deg, #7d2c21 0%, #5c1e14 100%)',
        padding: '44px 40px', display: 'flex', flexDirection: 'column',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
            color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 13,
            display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 40,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Back
        </button>

        <img src={logoWhite} alt="We Are VR" style={{ width: 80, marginBottom: 48, opacity: 0.92 }} />

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {orderData.orderId}
        </div>

        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 16 }}>
          CA${orderData.amount.toFixed(2)}
        </div>

        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
          {orderData.description}
        </div>

        {orderData.date && (
          <div style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {orderData.date} · {orderData.time}
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 40, right: -120,
          width: 240, height: 240, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        <div style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 12, color: 'rgba(255,255,255,0.4)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          256-bit SSL encryption
        </div>
      </div>

      {/* Right — payment form */}
      <div style={{
        flex: 1, background: '#f9fafb', overflowY: 'auto',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>
            Complete your payment
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 13, color: '#9ca3af' }}>
            All transactions are secure and encrypted.
          </p>

          {fetchError ? (
            <div style={{
              padding: 20, background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, color: '#dc2626', fontSize: 14,
            }}>
              {fetchError}
            </div>
          ) : !clientSecret ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#9ca3af', fontSize: 14 }}>
              <div style={{
                width: 20, height: 20, border: '2px solid #e5e7eb',
                borderTopColor: '#7d2c21', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Initializing secure payment…
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.06)',
              padding: '28px 24px',
            }}>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#7d2c21',
                      colorBackground: '#ffffff',
                      borderRadius: '8px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      spacingUnit: '4px',
                    },
                    rules: {
                      '.Input': {
                        boxShadow: 'none',
                        border: '1.5px solid #e5e7eb',
                        padding: '10px 12px',
                      },
                      '.Input:focus': {
                        border: '1.5px solid #7d2c21',
                        boxShadow: '0 0 0 3px rgba(125,44,33,0.08)',
                        outline: 'none',
                      },
                      '.Label': {
                        fontWeight: '500',
                        color: '#374151',
                        fontSize: '13px',
                        marginBottom: '5px',
                      },
                      '.Tab': {
                        border: '1.5px solid #e5e7eb',
                        boxShadow: 'none',
                      },
                      '.Tab--selected': {
                        border: '1.5px solid #7d2c21',
                        boxShadow: '0 0 0 2px rgba(125,44,33,0.12)',
                      },
                    },
                  },
                }}
              >
                <PaymentForm
                  orderData={orderData}
                  onSuccess={() => setPaid(true)}
                  onCancel={onClose}
                />
              </Elements>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
