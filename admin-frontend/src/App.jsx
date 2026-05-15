import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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

function ProtectedRoute({ children }) {
  const { admin } = useAuth()
  return admin ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { admin } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="slots" element={<Slots />} />
        <Route path="ticket-types" element={<TicketTypes />} />
        <Route path="create-order" element={<CreateOrder />} />
        <Route path="admins" element={<Admins />} />
        <Route path="logs" element={<Logs />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
