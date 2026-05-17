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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-[216px] shrink-0 flex-col overflow-y-auto bg-brand-900">
        <div className="border-b border-white/10 px-4 py-5">
          <div className="text-base font-bold leading-tight text-white">{t.ticketSystem}</div>
          <div className="mt-1 text-xs text-white/60">{t.adminPanel}</div>
        </div>

        <nav className="flex-1 py-2">
          {navItems.filter(item => can(admin, item.permission)).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            >
              <i className={`fa ${item.icon} w-[18px] text-center`} />
              <span>{t[item.key]}</span>
            </NavLink>
          ))}
          {can(admin, 'scanner:use') && (
            <a
              href="/scanner"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-nav-item"
            >
              <i className="fa fa-qrcode w-[18px] text-center" />
              <span className="flex-1">{t.scanner}</span>
              <i className="fa fa-external-link-alt text-[11px] opacity-70" />
            </a>
          )}
        </nav>

        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/75">
          <div>User: {admin?.username}</div>
          <div>Role: {admin?.role}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-base font-semibold text-slate-950">{getPageTitle()}</div>
          <div className="flex items-center gap-4">
            <LangDropdown lang={lang} changeLang={changeLang} />
            <UserMenu admin={admin} logout={logout} t={t} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
