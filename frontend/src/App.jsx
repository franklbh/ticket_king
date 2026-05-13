import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const USERS_KEY = 'ticket_king_local_users'
const SESSION_KEY = 'ticket_king_local_session'
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: 'Simplified Chinese' },
  { code: 'zh-Hant', label: 'Traditional Chinese' },
]

const dateGrid = [
  { day: 1, disabled: true },
  { day: 2, disabled: true },
  { day: 3, disabled: true },
  { day: 4, disabled: true },
  { day: 5, disabled: true },
  { day: 6, disabled: true },
  { day: 7, disabled: true },
  { day: 8, price: 37.95, level: 'normal' },
  { day: 9, price: 37.95, level: 'normal' },
  { day: 10, price: 37.95, level: 'normal' },
  { day: 11, price: 37.95, level: 'normal' },
  { day: 12, price: 37.95, level: 'normal' },
  { day: 13, price: 45.95, level: 'peak' },
  { day: 14, price: 45.95, level: 'peak' },
  { day: 15, price: 37.95, level: 'normal' },
  { day: 16, price: 37.95, level: 'normal' },
  { day: 17, price: 37.95, level: 'normal' },
  { day: 18, price: 37.95, level: 'normal' },
  { day: 19, price: 37.95, level: 'normal' },
  { day: 20, price: 45.95, level: 'peak' },
  { day: 21, price: 45.95, level: 'peak' },
  { day: 22, price: 37.95, level: 'normal' },
  { day: 23, price: 37.95, level: 'normal' },
  { day: 24, price: 37.95, level: 'normal' },
  { day: 25, disabled: true },
  { day: 26, price: 45.95, level: 'peak' },
  { day: 27, price: 45.95, level: 'peak' },
  { day: 28, price: 45.95, level: 'peak' },
  { day: 29, price: 37.95, level: 'normal' },
  { day: 30, price: 37.95, level: 'normal' },
  { day: 31, price: 37.95, level: 'normal' },
]

const timeSlots = [
  { time: '10:00 AM', price: 37.95 },
  { time: '10:30 AM', price: 37.95 },
  { time: '11:00 AM', price: 37.95 },
  { time: '11:30 AM', price: 37.95 },
  { time: '12:00 PM', price: 37.95 },
  { time: '12:30 PM', price: 37.95 },
  { time: '1:00 PM', price: 37.95 },
  { time: '1:30 PM', price: 37.95 },
  { time: '2:00 PM', price: 37.95 },
  { time: '2:30 PM', price: 37.95 },
  { time: '3:00 PM', price: 43.95 },
  { time: '3:30 PM', price: 43.95 },
  { time: '4:00 PM', price: 43.95 },
  { time: '4:30 PM', price: 43.95 },
  { time: '5:00 PM', price: 43.95 },
]

const ticketTypes = [
  { id: 'regular', label: 'Regular', description: '$37.95/each', price: 37.95 },
  { id: 'child', label: 'Child (8-15)', description: '$27.95/each', price: 27.95, info: 'Children must be accompanied by an adult.' },
  { id: 'senior', label: 'Senior (65+)', description: '$34.95/each', price: 34.95 },
  { id: 'family', label: 'Family Bundle (max. 2 adults)', description: '$31.95/each', price: 31.95, info: 'Bundle pricing applied at checkout.' },
  { id: 'group', label: 'Group Ticket (min. 6 people)', description: '$33.95/each', price: 33.95, info: 'Minimum 6 guests required.' },
]

const galleryImages = [
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1523966211575-eb4a01753c05?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80&sat=-20',
]

const testimonials = [
  {
    quote: 'It felt like standing among the warriors, both educational and breathtaking.',
    name: 'Emily',
    rating: '5/5',
  },
  {
    quote: 'Amazing how real everything felt. Perfect blend of history and technology.',
    name: 'Michael',
    rating: '5/5',
  },
]

const newsItems = [
  {
    title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond',
    body: 'Visitors can walk through corridors of stone and brick in the underground palace of the Qin Dynasty.',
    link: '#',
  },
  {
    title: 'Wins First Prize At The Yuanmeng VR Innovation Competition',
    body: 'Showcasing cultural-tech achievements with cinematic pacing and immersive storytelling.',
    link: '#',
  },
]

const qrPlaceholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
  <rect width="320" height="320" fill="#fff"/>
  <rect x="16" y="16" width="80" height="80" fill="#0b0b0b"/>
  <rect x="224" y="16" width="80" height="80" fill="#0b0b0b"/>
  <rect x="16" y="224" width="80" height="80" fill="#0b0b0b"/>
  <rect x="96" y="96" width="128" height="128" fill="#0b0b0b"/>
  <rect x="128" y="128" width="64" height="64" fill="#fff"/>
  <rect x="96" y="256" width="32" height="32" fill="#0b0b0b"/>
  <rect x="192" y="256" width="32" height="32" fill="#0b0b0b"/>
  <rect x="256" y="192" width="32" height="32" fill="#0b0b0b"/>
  <rect x="64" y="192" width="32" height="32" fill="#0b0b0b"/>
</svg>
`)

const loadUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

const normalize = (value) => value.trim().toLowerCase()

const isStrictEmail = (email) => {
  const value = email.trim()
  if (!emailPattern.test(value)) return false
  const [local, domain] = value.split('@')
  if (!local || !domain) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return domain.split('.').every((part) => part && !part.startsWith('-') && !part.endsWith('-'))
}

const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const badge = (type) => {
  if (type === 'peak') return 'peak'
  if (type === 'normal') return 'normal'
  return 'muted'
}

const currency = (val) => `$${val.toFixed(2)}`

function App() {
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const [langOpen, setLangOpen] = useState(false)
  const [view, setView] = useState('main')
  const [authMode, setAuthMode] = useState('login')
  const [users, setUsers] = useState(() => loadUsers())
  const [session, setSession] = useState(() => readSession())
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
  })
  const [showBooking, setShowBooking] = useState(false)
  const [step, setStep] = useState('date')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [counts, setCounts] = useState(() =>
    ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: t.id === 'regular' ? 1 : 0 }), {}),
  )
  const [vipQty, setVipQty] = useState(0)
  const [vipModal, setVipModal] = useState(false)
  const [contact, setContact] = useState({
    first: '',
    last: '',
    email: '',
    phone: '',
    optIn: false,
  })
  const [timeLeft, setTimeLeft] = useState(300)
  const [showQr, setShowQr] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const bookingRef = useRef(null)
  const introRef = useRef(null)

  const currentUser = useMemo(() => {
    if (!session) return null
    return users.find((user) => user.id === session.userId) || null
  }, [session, users])

  const totals = useMemo(() => {
    const ticketTotal = ticketTypes.reduce((sum, t) => sum + counts[t.id] * t.price, 0)
    const vipTotal = vipQty * 20
    const subtotal = ticketTotal + vipTotal
    const fees = subtotal > 0 ? Math.max(2.5, subtotal * 0.139) : 0
    return { ticketTotal, vipTotal, subtotal, fees, grand: subtotal + fees }
  }, [counts, vipQty])

  useEffect(() => {
    if (step !== 'payment') return undefined
    setTimeLeft(300)
    const timer = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      setScrollProgress(progress)
      setShowBackTop(scrollTop > 240)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const resetAuthForm = () => {
    setAuthForm({ name: '', email: '', username: '', password: '' })
    setAuthMessage('')
  }

  const openAuth = (mode) => {
    setAuthMode(mode)
    resetAuthForm()
    setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createSession = (user) => {
    const nextSession = {
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setView('main')
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    const name = authForm.name.trim()
    const username = normalize(authForm.username)
    const email = normalize(authForm.email)
    const password = authForm.password

    if (name.length < 2) {
      setAuthMessage('Please enter your full name.')
      return
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setAuthMessage('Username must be 3-24 characters: lowercase letters, numbers, or underscores.')
      return
    }

    if (!isStrictEmail(email)) {
      setAuthMessage('Please enter a valid email address, for example name@example.com.')
      return
    }

    if (password.length < 8) {
      setAuthMessage('Password must be at least 8 characters.')
      return
    }

    if (users.some((user) => user.username === username)) {
      setAuthMessage('That username is already taken.')
      return
    }

    if (users.some((user) => user.email === email)) {
      setAuthMessage('That email is already registered.')
      return
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      username,
      email,
      passwordHash: await hashPassword(password),
      emailVerified: false,
      role: 'Operator',
      createdAt: new Date().toISOString(),
    }
    const nextUsers = [...users, user]
    saveUsers(nextUsers)
    setUsers(nextUsers)
    createSession(user)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const usernameOrEmail = normalize(authForm.username)
    const passwordHash = await hashPassword(authForm.password)
    const user = users.find(
      (candidate) => candidate.username === usernameOrEmail || candidate.email === usernameOrEmail,
    )

    if (!user || user.passwordHash !== passwordHash) {
      setAuthMessage('Username or password is incorrect.')
      return
    }

    createSession(user)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setView('main')
  }

  const revealBooking = () => {
    setView('main')
    setShowBooking(true)
    setStep('date')
    requestAnimationFrame(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const changeCount = (id, delta) => {
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, prev[id] + delta) }))
  }

  const canProceedDate = Boolean(selectedDate)
  const canProceedTime = Boolean(selectedTime)
  const canProceedTickets = totals.subtotal > 0
  const canProceedContact = Boolean(contact.first && contact.last && isStrictEmail(contact.email))
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')

  const startStripeCheckout = async () => {
    try {
      setStripeLoading(true)
      const apiBase = import.meta.env.VITE_API_BASE || ''
      const res = await fetch(`${apiBase}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Math.max(1, counts.regular || 1),
          showName: 'Terracotta Warriors: Secrets of the First Emperor Mausoleum',
          date: selectedDate ? `Dec ${selectedDate.day}` : 'TBD',
          time: selectedTime?.time || 'TBD',
        }),
      })
      if (!res.ok) throw new Error('Checkout session failed')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Missing redirect url')
      }
    } catch (err) {
      console.error(err)
      alert('Unable to start checkout. Please try again.')
    } finally {
      setStripeLoading(false)
    }
  }

  const renderLangSelect = () => (
    <div className="lang">
      <button
        className="lang-toggle"
        onClick={() => setLangOpen((v) => !v)}
        aria-expanded={langOpen}
        aria-label={`Selected language ${selectedLang.label}`}
        type="button"
      >
        <span className="lang-icon">
          <span className="lang-a">A</span>
          <span className="lang-translate">文</span>
        </span>
        <span className="lang-down">v</span>
      </button>
      {langOpen && (
        <div className="lang-menu">
          {languages.map((l) => (
            <button
              className={`lang-option ${l.code === selectedLang.code ? 'active' : ''}`}
              onClick={() => {
                setSelectedLang(l)
                setLangOpen(false)
              }}
              key={l.code}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const headerCards = (
    <div className="header-cards">
      <div className="header-card">
        <div className="header-icon">Date</div>
        <div className="header-meta">
          <div className="meta-label">Selected date</div>
          <div className="meta-value">{selectedDate ? `Dec ${selectedDate.day}` : 'Choose a date'}</div>
        </div>
        <button className="ghost-btn" onClick={() => setStep('date')} type="button">
          Modify
        </button>
      </div>
      <div className="header-card">
        <div className="header-icon">Time</div>
        <div className="header-meta">
          <div className="meta-label">Selected time</div>
          <div className="meta-value">{selectedTime ? selectedTime.time : 'Choose a time'}</div>
        </div>
        <button className="ghost-btn" onClick={() => setStep('time')} type="button">
          Modify
        </button>
      </div>
    </div>
  )

  const renderDate = () => (
    <div className="panel">
      <div className="panel-title">
        <div className="title-accent" />
        <h3>Select Date</h3>
      </div>
      <div className="month-bar">
        <button className="nav-arrow" type="button">{'<'}</button>
        <div className="month-label">Dec 2025</div>
        <button className="nav-arrow" type="button">{'>'}</button>
      </div>
      <div className="calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div className="dow" key={day}>{day}</div>
        ))}
        {dateGrid.map((d) => (
          <button
            key={d.day}
            className={`day ${d.disabled ? 'disabled' : ''} ${selectedDate?.day === d.day ? 'selected' : ''} ${badge(d.level)}`}
            disabled={d.disabled}
            onClick={() => setSelectedDate(d)}
            type="button"
          >
            <span className="day-number">{d.day}</span>
            <span className="day-price">{d.price ? currency(d.price) : '-'}</span>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="primary" disabled={!canProceedDate} onClick={() => setStep('time')} type="button">
          Next
        </button>
      </div>
    </div>
  )

  const renderTime = () => (
    <div className="panel">
      <div className="panel-title">
        <div className="title-accent" />
        <h3>Select Time</h3>
      </div>
      <div className="time-hint">Choose a start time; each event lasts about 45 minutes.</div>
      <div className="slot-grid">
        {timeSlots.map((slot) => (
          <button
            key={slot.time}
            className={`slot ${selectedTime?.time === slot.time ? 'selected' : ''} ${slot.price > 40 ? 'peak' : ''}`}
            onClick={() => setSelectedTime(slot)}
            type="button"
          >
            <span className="slot-time">{slot.time}</span>
            <span className="slot-price">{currency(slot.price)}</span>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('date')} type="button">Back</button>
        <button className="primary" disabled={!canProceedTime} onClick={() => setStep('tickets')} type="button">
          Next
        </button>
      </div>
    </div>
  )

  const renderTickets = () => (
    <div className="panel">
      <div className="panel-title">
        <div className="title-accent" />
        <h3>Select Tickets</h3>
      </div>
      <div className="ticket-list">
        {ticketTypes.map((t) => (
          <div key={t.id} className="ticket-row">
            <div className="ticket-info">
              <div className="ticket-title">{t.label}</div>
              <div className="ticket-desc">{t.description}</div>
            </div>
            <div className="ticket-actions">
              {t.info && <div className="ticket-info-badge" title={t.info}>i</div>}
              <div className="counter">
                <button onClick={() => changeCount(t.id, -1)} disabled={counts[t.id] === 0} type="button">-</button>
                <div className="counter-value">{counts[t.id]}</div>
                <button onClick={() => changeCount(t.id, 1)} type="button">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="summary-row">
        <div>Total Amount</div>
        <div className="summary-val">{currency(totals.ticketTotal)}</div>
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('time')} type="button">Back</button>
        <button className="primary" disabled={!canProceedTickets} onClick={() => setVipModal(true)} type="button">
          Next
        </button>
      </div>
    </div>
  )

  const renderContact = () => (
    <div className="panel">
      <div className="panel-title">
        <div className="title-accent" />
        <h3>Contact details</h3>
      </div>
      <div className="form-grid">
        <label>
          <span>First name</span>
          <input
            type="text"
            placeholder="Your first name"
            value={contact.first}
            onChange={(e) => setContact({ ...contact, first: e.target.value })}
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            type="text"
            placeholder="Your last name"
            value={contact.last}
            onChange={(e) => setContact({ ...contact, last: e.target.value })}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            placeholder="name@example.com"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
          <small>Your tickets will be sent to this email.</small>
        </label>
        <label>
          <span>Phone number (optional)</span>
          <input
            type="tel"
            placeholder="e.g. (778) 123-4567"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={contact.optIn}
            onChange={(e) => setContact({ ...contact, optIn: e.target.checked })}
          />
          <span>I agree to receive updates and special offers.</span>
        </label>
      </div>
      <p className="policy-copy">By continuing to payment you agree to the Privacy Policy and Terms and Conditions.</p>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('tickets')} type="button">Back</button>
        <button className="primary" disabled={!canProceedContact} onClick={() => setStep('payment')} type="button">
          Continue to payment
        </button>
      </div>
    </div>
  )

  const renderPayment = () => (
    <div className="panel">
      <div className="timer-banner">
        Please complete payment within <strong>{minutes}:{seconds}</strong> to secure your reservation.
      </div>
      <div className="panel-title">
        <div className="title-accent" />
        <h3>Order Summary</h3>
      </div>
      <div className="order-block">
        <div className="order-date">
          <div className="order-label">Dec {selectedDate?.day} {selectedTime?.time} Starts</div>
          <div className="order-sub">Duration about 45 minutes</div>
        </div>
        <div className="line-items">
          {ticketTypes.map((t) => counts[t.id] > 0 && (
            <div key={t.id} className="line">
              <div>
                <div className="line-label">{t.label}</div>
                <div className="line-price">{currency(t.price)}</div>
              </div>
              <div className="line-qty">x{counts[t.id]}</div>
            </div>
          ))}
          {vipQty > 0 && (
            <div className="line">
              <div>
                <div className="line-label">VIP Upgrade</div>
                <div className="line-price">+$20.00/each</div>
              </div>
              <div className="line-qty">x{vipQty}</div>
            </div>
          )}
        </div>
        <div className="totals">
          <div className="totals-row">
            <span>Tickets subtotal</span>
            <span>{currency(totals.subtotal)}</span>
          </div>
          <div className="totals-row">
            <span>Fees and taxes</span>
            <span>{currency(totals.fees)}</span>
          </div>
          <div className="totals-row due">
            <span>Total due</span>
            <span>{currency(totals.grand)}</span>
          </div>
        </div>
        <div className="warning">Tickets are non-refundable and valid only on the event date.</div>
      </div>
      <div className="coupon-row">
        <input type="text" placeholder="Enter coupon code" />
        <button className="coupon-btn" type="button">Apply</button>
      </div>

      <div className="contact-summary">
        <div className="contact-head">
          <div>Contact details</div>
          <button className="link-btn" onClick={() => setStep('contact')} type="button">Edit contact details</button>
        </div>
        <div className="contact-cols">
          <div>
            <div className="label">First name</div>
            <div className="value">{contact.first || '-'}</div>
          </div>
          <div>
            <div className="label">Last name</div>
            <div className="value">{contact.last || '-'}</div>
          </div>
          <div>
            <div className="label">Email</div>
            <div className="value">{contact.email || '-'}</div>
          </div>
          <div>
            <div className="label">Phone number</div>
            <div className="value">{contact.phone || '-'}</div>
          </div>
        </div>
      </div>

      <div className="timer-banner subtle">
        Please complete payment within <strong>{minutes}:{seconds}</strong> to secure your reservation.
      </div>

      <div className="pay-options">
        <button className="pay-btn stripe" onClick={startStripeCheckout} disabled={stripeLoading} type="button">
          <span className="small">stripe</span> {stripeLoading ? 'Redirecting...' : 'Credit Card'}
        </button>
        <button className="pay-btn wechat" onClick={() => setShowQr('wechat')} type="button">WeChat Pay</button>
        <button className="pay-btn alipay" onClick={() => setShowQr('alipay')} type="button">Alipay</button>
        <a className="pay-btn apple" href="https://www.apple.com/apple-pay/" target="_blank" rel="noreferrer">
          Apple Pay
        </a>
      </div>
    </div>
  )

  const renderAuth = () => (
    <div className="min-h-[calc(100vh-96px)] bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-200">Ticket King account</p>
          <h2 className="mt-3 text-4xl font-black leading-tight">Local login for the frontend preview.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Accounts are saved in browser local storage for now. Email verification can be added later; new users already
            include an emailVerified field set to false.
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
          <button className="mb-5 text-sm font-bold text-slate-500 hover:text-slate-950" onClick={() => setView('main')} type="button">
            Back to main page
          </button>
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              className={`rounded-md px-4 py-2 text-sm font-black transition ${authMode === 'login' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-950'}`}
              onClick={() => {
                setAuthMode('login')
                resetAuthForm()
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-black transition ${authMode === 'signup' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-950'}`}
              onClick={() => {
                setAuthMode('signup')
                resetAuthForm()
              }}
              type="button"
            >
              Sign up
            </button>
          </div>

          <h3 className="mb-5 text-3xl font-black">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h3>
          <form className="grid gap-4" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
            {authMode === 'signup' && (
              <>
                <AuthField label="Full name" value={authForm.name} onChange={(value) => setAuthForm({ ...authForm, name: value })} placeholder="Jane Smith" autoComplete="name" />
                <AuthField label="Email address" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} placeholder="name@example.com" type="email" autoComplete="email" />
              </>
            )}
            <AuthField
              label={authMode === 'login' ? 'Username or email' : 'Username'}
              value={authForm.username}
              onChange={(value) => setAuthForm({ ...authForm, username: value })}
              placeholder={authMode === 'login' ? 'username or email' : 'jane_smith'}
              autoComplete="username"
              helper={authMode === 'signup' ? '3-24 lowercase letters, numbers, or underscores.' : 'You can use your username or email.'}
            />
            <AuthField
              label="Password"
              value={authForm.password}
              onChange={(value) => setAuthForm({ ...authForm, password: value })}
              placeholder="Enter your password"
              type="password"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              helper={authMode === 'signup' ? 'Use at least 8 characters.' : undefined}
            />
            {authMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {authMessage}
              </div>
            )}
            <button className="rounded-lg bg-rose-700 px-5 py-3 font-black text-white shadow-lg shadow-rose-950/20 transition hover:bg-rose-800" type="submit">
              {authMode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      <header className="topbar">
        <button className="brand-button" onClick={() => setView('main')} type="button">
          <div className="eyebrow">Terracotta Warriors</div>
          <div className="title">Secrets of the First Emperor&apos;s Mausoleum</div>
        </button>
        <div className="top-actions">
          {currentUser ? (
            <>
              <span className="auth-welcome">Hi, {currentUser.name}</span>
              <button className="primary ghost" onClick={logout} type="button">Logout</button>
            </>
          ) : (
            <button className="primary ghost" onClick={() => openAuth('login')} type="button">
              Login / Sign up
            </button>
          )}
          {!showBooking && view === 'main' && (
            <button className="primary ghost" onClick={revealBooking} type="button">
              Buy Ticket
            </button>
          )}
          {renderLangSelect()}
        </div>
      </header>

      {view === 'auth' ? renderAuth() : (
        <>
          {!showBooking && (
            <div className="marketing">
              <section className="hero-rich">
                <div className="hero-overlay" />
                <div className="hero-inner">
                  <div className="logo-mark">We Are VR</div>
                  <div className="hero-copy">
                    <p className="hero-kicker">A groundbreaking location-based VR experience</p>
                    <h1>Terracotta Warriors: Secrets Of The First Emperor&apos;s Mausoleum</h1>
                    <div className="hero-btns">
                      <button className="primary" onClick={revealBooking} type="button">Buy Ticket</button>
                      <button className="secondary" onClick={() => window.open('https://www.eventbrite.com/', '_blank')} type="button">Eventbrite</button>
                    </div>
                    <div className="hero-meta-row">
                      <div className="hero-pill">Sunday to Thursday - 10AM to 9PM. Friday and Saturday - 10AM to 10PM</div>
                      <div className="hero-pill">We Are VR in Lansdowne Centre - Near North entrance, Alderbridge Way</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="intro-section" ref={introRef}>
                <div className="intro-media">
                  <iframe src="https://www.youtube.com/embed/2V-20Qe4M8Y" title="Terracotta Warriors VR" allowFullScreen />
                </div>
                <div className="intro-text">
                  <h3>Introduction</h3>
                  <p>
                    Terracotta Warriors: Secrets of the First Emperor&apos;s Mausoleum is a location-based VR experience
                    inspired by the Emperor Qin Shi Huang&apos;s Mausoleum Site Museum.
                  </p>
                  <p>
                    Audiences travel back to the Great Qin and begin an immersive journey into the heart of the
                    mausoleum through cinematic storytelling and interactive technology.
                  </p>
                </div>
              </section>

              <section className="gallery-section">
                <div className="section-heading">
                  <div className="overline">Secrets of the First Emperor&apos;s Mausoleum</div>
                  <h3>Gallery</h3>
                </div>
                <div className="gallery-grid">
                  {galleryImages.map((src, idx) => (
                    <div key={src + idx} className="gallery-card" style={{ backgroundImage: `url(${src})` }} />
                  ))}
                </div>
              </section>

              <section className="reviews-section">
                <div className="section-heading">
                  <div className="overline">1000+ Views - 99% Satisfied</div>
                  <h3>What Visitors Say</h3>
                </div>
                <div className="testimonial-grid">
                  {testimonials.map((t) => (
                    <div key={t.name} className="testimonial-card">
                      <p className="quote">&quot;{t.quote}&quot;</p>
                      <div className="author">{t.name}</div>
                      <div className="rating">{t.rating}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="news-section">
                <div className="section-heading">
                  <div className="overline">Informing Minds, Inspiring Stories</div>
                  <h3>News & Media</h3>
                </div>
                <div className="news-list">
                  {newsItems.map((n) => (
                    <div key={n.title} className="news-item">
                      <h4>{n.title}</h4>
                      <p>{n.body}</p>
                      <a href={n.link}>Read more</a>
                    </div>
                  ))}
                </div>
              </section>

              <section className="footer-cta">
                <div className="footer-card">
                  <div>
                    <div className="footer-logo">We Are VR</div>
                    <div className="footer-meta">Lansdowne Centre - 5300 No.3 Rd, Richmond - +1 (778) 805-4699</div>
                  </div>
                  <button className="primary" onClick={revealBooking} type="button">Buy Ticket</button>
                </div>
              </section>
            </div>
          )}

          {showBooking && (
            <div className="content" ref={bookingRef} id="booking">
              {headerCards}
              {step === 'date' && renderDate()}
              {step === 'time' && renderTime()}
              {step === 'tickets' && renderTickets()}
              {step === 'contact' && renderContact()}
              {step === 'payment' && renderPayment()}
            </div>
          )}
        </>
      )}

      {vipModal && (
        <div className="overlay" onClick={() => setVipModal(false)}>
          <div className="vip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vip-card">
              <div className="vip-icon">VIP</div>
              <div>
                <div className="vip-title">VIP</div>
                <div className="vip-price">+${(20).toFixed(2)}/each</div>
                <div className="vip-sub">Premium benefits</div>
              </div>
            </div>
            <div className="vip-benefits">
              <span>Exclusive Tour</span>
              <span>Priority Entry</span>
              <span>Souvenir</span>
            </div>
            <div className="ticket-row slim">
              <div className="ticket-info">
                <div className="ticket-title">VIP</div>
                <div className="ticket-desc">+${(20).toFixed(2)}/each</div>
              </div>
              <div className="ticket-actions">
                <div className="counter">
                  <button onClick={() => setVipQty((v) => Math.max(0, v - 1))} type="button">-</button>
                  <div className="counter-value">{vipQty}</div>
                  <button onClick={() => setVipQty((v) => v + 1)} type="button">+</button>
                </div>
              </div>
            </div>
            <div className="actions stacked">
              <button className="secondary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">Skip</button>
              <button className="primary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <div className="overlay" onClick={() => setShowQr(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h4>{showQr === 'wechat' ? 'WeChat Pay' : 'Alipay'} QR</h4>
            <img src={qrPlaceholder} alt="QR code" />
            <p>Scan to pay with your {showQr === 'wechat' ? 'WeChat' : 'Alipay'} app.</p>
            <button className="primary" onClick={() => setShowQr(null)} type="button">Close</button>
          </div>
        </div>
      )}

      {view === 'main' && (
        <div className="floating-cta">
          <button className="cta-pill" onClick={revealBooking} type="button">Buy Ticket</button>
        </div>
      )}

      {showBackTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">
          ^
        </button>
      )}
    </div>
  )
}

function AuthField({ helper, label, onChange, type = 'text', value, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-rose-700 focus:ring-4 focus:ring-rose-100"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
        {...props}
      />
      {helper && <span className="text-xs font-semibold text-slate-500">{helper}</span>}
    </label>
  )
}

export default App
