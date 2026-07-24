import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/authHooks'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Tickets from './pages/Tickets'
import Coupons from './pages/Coupons'
import Marketing from './pages/Marketing'
import Slots from './pages/Slots'
import TicketTypes from './pages/TicketTypes'
import CreateOrder from './pages/CreateOrder'
import Scanner from './pages/Scanner'
import Admins from './pages/Admins'
import Logs from './pages/Logs'
import Reports from './pages/Reports'
import { can, firstAllowedPath } from './auth/permissions'

function AccessDenied() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <i className="fa fa-lock" />
      </div>
      <h1 className="text-xl font-bold text-slate-950">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Your authenticated admin role does not have permission to open this page.
      </p>
    </div>
  )
}

function ProtectedRoute({ permission, children }) {
  const { admin } = useAuth()
  if (!admin) return <Navigate to="/login" replace />
  if (permission && !can(admin, permission)) return <AccessDenied />
  return children
}

function AppRoutes() {
  const { admin } = useAuth()
  const defaultPath = admin ? firstAllowedPath(admin) : '/dashboard'
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to={defaultPath} replace /> : <Login />} />
      <Route path="/scanner" element={<ProtectedRoute permission="scanner:use"><Scanner /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={defaultPath} replace />} />
        <Route path="dashboard" element={<ProtectedRoute permission="dashboard:read"><Dashboard /></ProtectedRoute>} />
        <Route path="orders" element={<ProtectedRoute permission="orders:read"><Orders /></ProtectedRoute>} />
        <Route path="orders/:orderId" element={<ProtectedRoute permission="orders:read"><Orders /></ProtectedRoute>} />
        <Route path="tickets" element={<ProtectedRoute permission="tickets:read"><Tickets /></ProtectedRoute>} />
        <Route path="tickets/order/:orderId" element={<ProtectedRoute permission="tickets:read"><Tickets /></ProtectedRoute>} />
        <Route path="coupons" element={<ProtectedRoute permission="coupons:read"><Coupons /></ProtectedRoute>} />
        <Route path="marketing" element={<ProtectedRoute permission="marketing:read"><Marketing /></ProtectedRoute>} />
        <Route path="slots" element={<ProtectedRoute permission="catalog:read"><Slots /></ProtectedRoute>} />
        <Route path="ticket-types" element={<ProtectedRoute permission="catalog:read"><TicketTypes /></ProtectedRoute>} />
        <Route path="create-order" element={<ProtectedRoute permission="orders:write"><CreateOrder /></ProtectedRoute>} />
        <Route path="admins" element={<ProtectedRoute permission="users:read"><Admins /></ProtectedRoute>} />
        <Route path="logs" element={<ProtectedRoute permission="logs:read"><Logs /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="reports:read"><Reports /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
