import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { can } from '../auth/permissions'

const navItems = [
  { path: '/dashboard', icon: 'fa-chart-line', key: 'dashboard', permission: 'dashboard:read' },
  { path: '/orders', icon: 'fa-shopping-cart', key: 'orders', permission: 'orders:read' },
  { path: '/tickets', icon: 'fa-ticket', key: 'tickets', permission: 'tickets:read' },
  { path: '/coupons', icon: 'fa-tag', key: 'coupons', permission: 'coupons:read' },
  { path: '/marketing', icon: 'fa-bullhorn', key: 'marketing', permission: 'marketing:read' },
  { path: '/slots', icon: 'fa-calendar', key: 'slots', permission: 'catalog:read' },
  { path: '/ticket-types', icon: 'fa-tags', key: 'ticketTypes', permission: 'catalog:read' },
  { path: '/create-order', icon: 'fa-cash-register', key: 'createOrder', permission: 'orders:write' },
  { path: '/admins', icon: 'fa-users', key: 'admins', permission: 'users:read' },
  { path: '/logs', icon: 'fa-history', key: 'logs', permission: 'logs:read' },
  { path: '/reports', icon: 'fa-file-alt', key: 'reports', permission: 'reports:read' },
]


function LangDropdown({ lang, changeLang }) {
  return (
    <select
      value={lang}
      onChange={e => changeLang(e.target.value)}
      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 text-left transition hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-base font-bold text-white">
          {initial}
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-semibold text-slate-950">{admin?.username}</div>
          <div className="text-xs text-slate-500">{admin?.role}</div>
        </div>
        <i className="fa fa-chevron-down text-[11px] text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-[110%] z-[999] min-w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button className="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
            <i className="fa fa-key text-slate-500" />
            {t.changePassword}
          </button>
          <div className="mx-2 h-px bg-slate-100" />
          <button onClick={handleLogout} className="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
            <i className="fa fa-sign-out-alt text-red-600" />
            {t.logout}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { admin, logout, sessionWarning, dismissSessionWarning } = useAuth()
  const { lang, changeLang } = useLang()
  const t = useT(lang)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const visibleNavItems = navItems.filter(item => can(admin, item.permission))
  const showScanner = can(admin, 'scanner:use')
  const sessionMinutesLeft = sessionWarning?.expiresAt
    ? Math.max(1, Math.ceil(((Number(sessionWarning.expiresAt) * 1000) - Date.now()) / 60000))
    : null

  function closeMobileSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="admin-shell">
      {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="Close menu" onClick={closeMobileSidebar} />}

      <aside className={`admin-sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div>
            <div className="admin-sidebar-title">{t.ticketSystem}</div>
            <div className="admin-sidebar-subtitle">{t.adminPanel}</div>
          </div>
          <button className="admin-sidebar-close" type="button" aria-label="Close menu" onClick={closeMobileSidebar}>
            <i className="fa fa-times" />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={closeMobileSidebar}
            >
              <i className={`fa ${item.icon} w-[18px] text-center`} />
              <span>{t[item.key]}</span>
            </NavLink>
          ))}
          {showScanner && (
            <NavLink
              to="/scanner"
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={closeMobileSidebar}
            >
              <i className="fa fa-qrcode w-[18px] text-center" />
              <span>{t.scanner}</span>
            </NavLink>
          )}
        </nav>

        <div className="admin-sidebar-user">
          <div>User: {admin?.username}</div>
          <div>Role: {admin?.role}</div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div className="flex min-w-0 items-center gap-3">
            <button className="admin-menu-button" type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              <i className="fa fa-bars" />
            </button>
            <div className="truncate text-base font-semibold text-slate-950">{getPageTitle()}</div>
          </div>
          <div className="admin-header-actions">
            <LangDropdown lang={lang} changeLang={changeLang} />
            <UserMenu admin={admin} logout={logout} t={t} />
          </div>
        </header>

        {sessionWarning && (
          <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm sm:mx-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <i className="fa fa-clock mt-0.5 text-amber-600" />
                <div className="min-w-0">
                  <div className="font-bold">{t.sessionExpiresSoon}</div>
                  <div className="mt-0.5 text-amber-800">
                    {t.sessionRefreshNotice.replace('{minutes}', sessionMinutesLeft)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSessionWarning}
                className="self-start rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 sm:self-center"
              >
                {t.dismiss}
              </button>
            </div>
          </div>
        )}

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
