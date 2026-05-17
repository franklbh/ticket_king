import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { checkInTicket } from '../api/adminApi'
import { useAdminMutation } from '../hooks/useAdminApi'
import { useRecentScansQuery } from '../hooks/scanner'
import { ScannerActionButton, ScannerCard, ScannerSectionTitle, ScannerStat } from '../components/ScannerUI'

function playBeep(valid) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (valid) {
      osc.frequency.value = 1046
      gain.gain.value = 0.2
      osc.start(); osc.stop(ctx.currentTime + 0.12)
    } else {
      osc.frequency.value = 280
      osc.type = 'sawtooth'
      gain.gain.value = 0.15
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    }
  } catch {}
}

const CSS = `
  @keyframes scanLine {
    0%   { top: 15%; }
    50%  { top: 82%; }
    100% { top: 15%; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }
  .scan-ripple { animation: fadeUp 0.22s ease; }
`

function ScanOverlay({ result, onDismiss }) {
  if (!result) return null
  const ok = result.valid
  return (
    <div
      onClick={onDismiss}
      className="scan-ripple"
      style={{
        position: 'absolute', inset: 0, zIndex: 20, cursor: 'pointer',
        background: ok
          ? 'linear-gradient(160deg, #064e3b 0%, #065f46 100%)'
          : 'linear-gradient(160deg, #7f1d1d 0%, #991b1b 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 12,
      }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: ok ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
      }}>
        <i className={`fa fa-${ok ? 'check' : 'times'}`}
          style={{ fontSize: 38, color: '#fff' }} />
      </div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: '-0.3px', textAlign: 'center', padding: '0 24px' }}>
        {ok ? result.validMsg : result.message}
      </div>
      {result.orderUser && (
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 600, marginTop: 4 }}>
          {result.orderUser}
        </div>
      )}
      {result.ticketType && (
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{result.ticketType}</div>
      )}
      {result.slotDate && (
        <div style={{
          marginTop: 10, padding: '6px 16px',
          background: 'rgba(255,255,255,0.12)', borderRadius: 20,
          color: 'rgba(255,255,255,0.8)', fontSize: 13,
        }}>
          {result.slotDate} &nbsp;{result.slotStart}–{result.slotEnd}
        </div>
      )}
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 16 }}>
        tap to dismiss
      </div>
    </div>
  )
}

export default function Scanner() {
  const { lang, changeLang } = useLang()
  const t = useT(lang)

  const videoRef   = useRef()
  const canvasRef  = useRef()
  const streamRef  = useRef()
  const animRef    = useRef()
  const activeRef  = useRef(false)          // scan loop running?
  const processRef = useRef(null)           // always-current process fn
  const lastCodeRef    = useRef(null)
  const lastCodeTimeRef = useRef(0)
  const usedSessionRef  = useRef(new Set())
  const manualRef  = useRef()

  const [cameraOn, setCameraOn]   = useState(false)
  const [camErr, setCamErr]       = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult]       = useState(null)
  const [scans, setScans]         = useState([])
  const [stats, setStats]         = useState({ valid: 0, invalid: 0 })
  const { data: recentScans = [] } = useRecentScansQuery(20, { initialData: [] })
  const { mutate: checkInMutation } = useAdminMutation(checkInTicket, {
    successMessage: 'Scan processed.',
  })

  useEffect(() => {
    if (!recentScans.length) return
    setScans(recentScans.map(ticket => ({
      id: ticket.id || ticket.code,
      code: ticket.code,
      time: ticket.verifiedAt?.slice(11, 19) || '',
      valid: true,
      name: ticket.orderUser || null,
      type: ticket.ticketType || null,
    })))
  }, [recentScans])

  // Auto-dismiss result after 3s
  useEffect(() => {
    if (!result) return
    const id = setTimeout(() => setResult(null), 3000)
    return () => clearTimeout(id)
  }, [result])

  async function processTicket(rawValue) {
    const code = rawValue.replace(/\D/g, '') || rawValue.trim()
    const now = Date.now()
    if (code === lastCodeRef.current && now - lastCodeTimeRef.current < 3000) return
    lastCodeRef.current = code
    lastCodeTimeRef.current = now

    let r
    try {
      const response = await checkInMutation(rawValue.trim())
      const ticket = response.ticket
      if (response.result === 'checked_in') {
        r = { ...ticket, valid: true, validMsg: t.ticketValid, code: ticket.code }
        usedSessionRef.current.add(ticket.code)
      } else if (response.result === 'already_used') {
        r = { ...ticket, valid: false, message: t.alreadyUsed, code: ticket.code }
      } else {
        r = { ...ticket, valid: false, message: response.result || t.ticketNotFound, code: ticket?.code || code }
      }
    } catch {
      r = { valid: false, message: t.ticketNotFound, code }
    }

    playBeep(r.valid)
    setResult(r)
    setStats(s => r.valid ? { ...s, valid: s.valid + 1 } : { ...s, invalid: s.invalid + 1 })
    setScans(prev => [{
      id: now,
      code: code.length > 13 ? code.slice(0, 6) + '…' + code.slice(-4) : code,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      valid: r.valid,
      name: r.orderUser || null,
      type: r.ticketType || null,
    }, ...prev].slice(0, 30))
  }

  // Keep processRef always pointing to current processTicket
  processRef.current = processTicket

  // Scan loop — reads from processRef so never stale
  function startLoop() {
    activeRef.current = true
    function loop() {
      if (!activeRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (qr) processRef.current(qr.data)
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }

  function stopLoop() {
    activeRef.current = false
    cancelAnimationFrame(animRef.current)
  }

  async function startCamera() {
    setCamErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraOn(true)
      startLoop()
    } catch (err) {
      setCamErr(err.message || 'Camera access denied')
    }
  }

  function stopCamera() {
    stopLoop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraOn(false)
  }

  useEffect(() => () => {
    stopLoop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  function handleManual(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    processTicket(manualCode.trim())
    setManualCode('')
    manualRef.current?.focus()
  }

  const total = stats.valid + stats.invalid

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header style={{
        height: 56, flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa fa-qrcode" style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.1 }}>WE Are VR</div>
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ticket Scanner</div>
          </div>
        </div>

        {/* Stats — center */}
        <div className="flex flex-1 justify-center">
          <ScannerStat value={stats.valid} label={t.admitted} color="#16a34a" bg="#f0fdf4" border="#bbf7d0" />
          <ScannerStat value={stats.invalid} label={t.rejected} color="#dc2626" bg="#fef2f2" border="#fecaca" />
          <ScannerStat value={total} label={t.sessionStats} color="#2563eb" bg="#eff6ff" border="#bfdbfe" />
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid #e5e7eb',
              borderRadius: 6, background: '#fff',
              fontSize: 13, color: '#374151', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="en">English</option>
            <option value="zh-Hans">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
          </select>
          <ScannerActionButton variant="secondary" onClick={() => window.close()} className="ml-1">
            {t.close}
          </ScannerActionButton>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, padding: 16, minHeight: 0 }}>

        {/* Left — Camera */}
        <ScannerCard className="flex flex-col">
          <ScannerSectionTitle
            icon="fa-camera"
            title={`QR ${t.scannerTitle}`}
            actions={cameraOn && (
              <div className="flex items-center gap-2">
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'blink 1.4s infinite' }} />
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{t.scanning}</span>
              </div>
            )}
          />
          {/* Camera viewport */}
          <div style={{ flex: 1, position: 'relative', background: '#0f172a', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted playsInline
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Scan line */}
            {cameraOn && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                  position: 'absolute', left: '10%', right: '10%', height: 2,
                  background: 'linear-gradient(90deg, transparent 0%, #22d3ee 30%, #22d3ee 70%, transparent 100%)',
                  boxShadow: '0 0 12px #22d3ee, 0 0 4px #22d3ee',
                  animation: 'scanLine 2.2s ease-in-out infinite',
                }} />
              </div>
            )}

            {/* Corner frame */}
            {cameraOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 200, height: 200, position: 'relative' }}>
                  {[
                    { top: 0, left: 0, borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderRadius: '6px 0 0 0' },
                    { top: 0, right: 0, borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderRadius: '0 6px 0 0' },
                    { bottom: 0, left: 0, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderRadius: '0 0 0 6px' },
                    { bottom: 0, right: 0, borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderRadius: '0 0 6px 0' },
                  ].map((s, i) => (
                    <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
                  ))}
                  {/* dim overlay outside frame */}
                  <div style={{
                    position: 'absolute', inset: -9999, margin: 'auto',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    borderRadius: 4,
                    width: 200, height: 200,
                    pointerEvents: 'none',
                  }} />
                </div>
              </div>
            )}

            {/* Result overlay */}
            <ScanOverlay result={result} onDismiss={() => setResult(null)} />

            {/* Idle state */}
            {!cameraOn && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="fa fa-camera" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 28 }} />
                </div>
                {camErr ? (
                  <div style={{ textAlign: 'center', maxWidth: 280 }}>
                    <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 14, background: 'rgba(127,29,29,0.5)', padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
                      <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />
                      {camErr}
                    </div>
                    <button onClick={startCamera} style={{
                      padding: '10px 24px', background: '#6366f1', color: '#fff',
                      border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    }}>
                      <i className="fa fa-redo" style={{ marginRight: 6 }} />Retry
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 18 }}>
                      {t.pointCameraAtQR}
                    </div>
                    <button
                      onClick={startCamera}
                      style={{
                        padding: '13px 36px', background: '#6366f1', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        boxShadow: '0 4px 20px rgba(123,32,32,0.5)',
                      }}
                    >
                      <i className="fa fa-camera" />
                      {t.startCamera}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera footer */}
          {cameraOn && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{t.pointCameraAtQR}</span>
              <ScannerActionButton variant="secondary" onClick={stopCamera}>
                <i className="fa fa-stop-circle" style={{ color: '#ef4444' }} />
                {t.stopCamera}
              </ScannerActionButton>
            </div>
          )}
        </ScannerCard>

        {/* Right — Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {/* Manual Entry */}
          <ScannerCard className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <i className="fa fa-keyboard text-brand-500 text-xs" />
              {t.manualEntry}
            </div>
            <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={manualRef}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder={t.enterTicketCode}
                autoFocus
                style={{
                  flex: 1, padding: '10px 13px',
                  border: '1.5px solid #e5e7eb', borderRadius: 8,
                  fontSize: 14, color: '#111827', outline: 'none',
                  transition: 'border-color 0.15s',
                  fontFamily: 'monospace',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              <ScannerActionButton type="submit">
                <i className="fa fa-check" />
                {t.verify}
              </ScannerActionButton>
            </form>
            <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 10, lineHeight: 1.6 }}>
              {t.tryTheseCodes}
            </div>
          </ScannerCard>

          {/* Recent Scans */}
          <ScannerCard className="flex min-h-0 flex-1 flex-col">
            <ScannerSectionTitle
              icon="fa-history"
              title={t.recentScans}
              actions={scans.length > 0 && (
                <button
                  onClick={() => { setScans([]); setStats({ valid: 0, invalid: 0 }) }}
                  style={{
                    background: 'transparent', border: '1px solid #e5e7eb',
                    color: '#9ca3af', borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <i className="fa fa-trash-alt" />
                  {t.clearAll}
                </button>
              )}
            />
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {scans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#d1d5db' }}>
                  <i className="fa fa-qrcode" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
                  <div style={{ fontSize: 13 }}>{t.noScansYet}</div>
                </div>
              ) : scans.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: s.valid ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${s.valid ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: s.valid ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`fa fa-${s.valid ? 'check' : 'times'}`}
                      style={{ color: s.valid ? '#16a34a' : '#dc2626', fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {s.name && (
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </div>
                    )}
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.code}
                    </div>
                    {s.type && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{s.type}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {s.time}
                  </div>
                </div>
              ))}
            </div>
          </ScannerCard>
        </div>
      </div>
    </div>
  )
}
