import { useState, useRef, useEffect } from 'react' // useRef/useEffect still used by UserMenu
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'

const SIDEBAR_BG = '#312e81'

const navItems = [
  { path: '/dashboard', icon: 'fa-chart-line', key: 'dashboard' },
  { path: '/orders', icon: 'fa-shopping-cart', key: 'orders' },
  { path: '/tickets', icon: 'fa-ticket', key: 'tickets' },
  { path: '/coupons', icon: 'fa-tag', key: 'coupons' },
  { path: '/marketing', icon: 'fa-bullhorn', key: 'marketing' },
  { path: '/slots', icon: 'fa-calendar', key: 'slots' },
  { path: '/ticket-types', icon: 'fa-tags', key: 'ticketTypes' },
  { path: '/create-order', icon: 'fa-cash-register', key: 'createOrder' },
  { path: '/admins', icon: 'fa-users', key: 'admins' },
  { path: '/logs', icon: 'fa-history', key: 'logs' },
]


function LangDropdown({ lang, changeLang }) {
  return (
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
  )
}

function UserMenu({ admin, logout, t }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleLogout() { logout(); navigate('/login') }

  const initial = (admin?.username || 'A')[0].toUpperCase()
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#312e81', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
          {initial}
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{admin?.username}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{admin?.role}</div>
        </div>
        <i className="fa fa-chevron-down" style={{ fontSize: 11, color: '#888' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 999, minWidth: 160 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
            <i className="fa fa-key" style={{ color: '#666' }} />
            {t.changePassword}
          </button>
          <div style={{ height: 1, background: '#f3f4f6', margin: '0 8px' }} />
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626' }}>
            <i className="fa fa-sign-out-alt" style={{ color: '#dc2626' }} />
            {t.logout}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { admin, logout } = useAuth()
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const navigate = useNavigate()

  function getPageTitle() {
    const path = window.location.pathname
    if (path.includes('dashboard')) return t.dashboard
    if (path.includes('orders')) return t.orders
    if (path.includes('tickets')) return t.tickets
    if (path.includes('coupons')) return t.coupons
    if (path.includes('marketing')) return t.marketing
    if (path.includes('slots')) return t.timeSlotsManagement
    if (path.includes('ticket-types')) return t.ticketTypesManagement
    if (path.includes('create-order')) return t.createOrderTitle
    if (path.includes('admins')) return t.administratorsManagement
    if (path.includes('logs')) return t.activityLogs
    return t.dashboard
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 205, background: SIDEBAR_BG, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{t.ticketSystem}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{t.adminPanel}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            >
              <i className={`fa ${item.icon}`} style={{ width: 18, textAlign: 'center' }} />
              <span>{t[item.key]}</span>
            </NavLink>
          ))}
          {/* Scanner opens in new window */}
          <a
            href="/scanner"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-nav-item"
          >
            <i className="fa fa-qrcode" style={{ width: 18, textAlign: 'center' }} />
            <span style={{ flex: 1 }}>{t.scanner}</span>
            <i className="fa fa-external-link-alt" style={{ fontSize: 11, opacity: 0.7 }} />
          </a>
        </nav>

        {/* Bottom user info */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
          <div>User: {admin?.username}</div>
          <div>Role: {admin?.role}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{getPageTitle()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LangDropdown lang={lang} changeLang={changeLang} />
            <UserMenu admin={admin} logout={logout} t={t} />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
