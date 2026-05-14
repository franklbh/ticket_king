import { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
]

const MOCK_TICKETS = {
  '2605131459744': { valid: true, name: 'Dalton', type: 'Regular', slot: '2026-05-13 14:00-14:45', status: 'not_used' },
  '2605131689043': { valid: true, name: 'TINA GUO', type: 'Child (7-15)', slot: '2026-05-13 19:00-19:45', status: 'not_used' },
  '2605131919384': { valid: false, name: 'Lily', type: 'Regular', slot: '2026-05-13 11:30-12:15', status: 'used', message: 'Already used' },
}

function ScanResult({ result, onDismiss }) {
  if (!result) return null
  const success = result.valid && result.status === 'not_used'
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: success ? '#065f46' : '#7f1d1d',
      color: '#fff', borderRadius: 10, padding: '16px 24px', minWidth: 320,
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <i className={`fa fa-${success ? 'check-circle' : 'times-circle'}`} style={{ fontSize: 24, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          {success ? '✓ Ticket Valid!' : `✗ ${result.message || 'Invalid Ticket'}`}
        </div>
        {result.name && <div style={{ fontSize: 13 }}>Customer: {result.name}</div>}
        {result.type && <div style={{ fontSize: 13 }}>Type: {result.type}</div>}
        {result.slot && <div style={{ fontSize: 13 }}>Slot: {result.slot}</div>}
      </div>
      <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  )
}

export default function Scanner() {
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const detectorRef = useRef()

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [scanning, setScanning] = useState(false)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setCameraError(null)

      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
        setScanning(true)
      }
    } catch (err) {
      setCameraError(err.message || 'Camera access denied')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
    setScanning(false)
  }

  useEffect(() => {
    if (!scanning || !detectorRef.current) return
    let active = true
    async function detect() {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) setTimeout(detect, 200)
        return
      }
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current)
        if (barcodes.length > 0) {
          handleScan(barcodes[0].rawValue)
        }
      } catch {}
      if (active) setTimeout(detect, 300)
    }
    detect()
    return () => { active = false }
  }, [scanning])

  useEffect(() => () => stopCamera(), [])

  function handleScan(code) {
    const cleanCode = code.replace(/\D/g, '')
    const match = Object.entries(MOCK_TICKETS).find(([k]) => cleanCode.includes(k) || k.includes(cleanCode))
    const result = match
      ? { ...match[1], code: cleanCode }
      : { valid: false, code: cleanCode, message: 'Ticket not found' }

    setScanResult(result)
    setRecentScans(prev => [{
      id: Date.now(),
      code: cleanCode.slice(0, 6) + '...' + cleanCode.slice(-6),
      time: new Date().toLocaleTimeString(),
      valid: result.valid && result.status === 'not_used',
      type: result.type,
    }, ...prev].slice(0, 20))
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleScan(manualCode.trim())
    setManualCode('')
  }

  function refreshRecords() {
    setRecentScans([])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>WE Are VR</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {LANG_OPTIONS.map(l => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13,
                background: l.code === lang ? '#7b2020' : 'transparent',
                color: l.code === lang ? '#fff' : '#374151',
                fontWeight: l.code === lang ? 600 : 400,
              }}
            >{l.label}</button>
          ))}
          <button
            onClick={() => window.close()}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, background: 'transparent', color: '#374151' }}
          >Logout</button>
        </div>
      </header>

      <ScanResult result={scanResult} onDismiss={() => setScanResult(null)} />

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        {/* Camera / Scanner */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            <i className="fa fa-qrcode" style={{ color: '#7b2020', marginRight: 6 }} />
            QR Code Scanner
          </div>

          {!cameraActive ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f9fafb', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
                <i className="fa fa-camera" style={{ color: '#9ca3af' }} />
              </div>
              {cameraError && (
                <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 16, background: '#fee2e2', padding: '8px 12px', borderRadius: 6 }}>
                  {cameraError}
                </div>
              )}
              <button
                className="btn-primary"
                onClick={startCamera}
                style={{ padding: '10px 24px', fontSize: 15 }}
              >
                <i className="fa fa-camera" /> Start Camera
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }}
                  muted
                  playsInline
                />
                {/* Scan frame overlay */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 180, height: 180, position: 'relative',
                    border: '2px solid rgba(255,255,255,0.5)',
                  }}>
                    {[['top-left','top','left'],['top-right','top','right'],['bottom-left','bottom','left'],['bottom-right','bottom','right']].map(([k, v, h]) => (
                      <div key={k} style={{ position: 'absolute', [v]: -1, [h]: -1, width: 20, height: 20, borderTop: v === 'top' ? '3px solid #fff' : 'none', borderBottom: v === 'bottom' ? '3px solid #fff' : 'none', borderLeft: h === 'left' ? '3px solid #fff' : 'none', borderRight: h === 'right' ? '3px solid #fff' : 'none' }} />
                    ))}
                  </div>
                </div>
                {scanning && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: '#10b981', color: '#fff', borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                    <i className="fa fa-circle" style={{ fontSize: 8, marginRight: 4 }} />
                    Scanning
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!('BarcodeDetector' in window) && (
                <div style={{ fontSize: 12, color: '#f59e0b', background: '#fef3c7', padding: '6px 10px', borderRadius: 4, marginBottom: 8 }}>
                  Auto-detection not available in this browser. Use manual input below.
                </div>
              )}
              <button className="btn-secondary btn-sm" onClick={stopCamera}>
                <i className="fa fa-stop" /> Stop Camera
              </button>
            </div>
          )}

          {/* Manual input */}
          <div style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Manual Code Entry</div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Enter verification code..."
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary btn-sm">
                <i className="fa fa-check" /> Verify
              </button>
            </form>
          </div>
        </div>

        {/* Recent Records */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Recent Scanned Records (Last 20 Minutes)
            </div>
            <button className="btn-secondary btn-sm" onClick={refreshRecords}>
              <i className="fa fa-redo" /> Refresh
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
              No scan records
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentScans.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  background: r.valid ? '#f0fdf4' : '#fef2f2',
                }}>
                  <i className={`fa fa-${r.valid ? 'check-circle' : 'times-circle'}`} style={{ color: r.valid ? '#10b981' : '#ef4444', fontSize: 18 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{r.code}</div>
                    {r.type && <div style={{ fontSize: 12, color: '#6b7280' }}>{r.type}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
