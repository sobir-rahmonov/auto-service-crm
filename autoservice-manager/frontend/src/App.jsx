import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Clients from './pages/Clients'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import InvoiceDetail from './pages/InvoiceDetail'
import Login from './pages/Login'
import NewOrder from './pages/NewOrder'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import PartRequests from './pages/PartRequests'
import Payments from './pages/Payments'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Reports from './pages/Reports'
import Services from './pages/Services'
import Users from './pages/Users'
import Vehicles from './pages/Vehicles'
import ProtectedRoute from './routes/ProtectedRoute'

const STAFF = ['admin', 'manager']

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />

          <Route element={<ProtectedRoute roles={['admin', 'manager', 'client']} />}>
            <Route path="/orders/new" element={<NewOrder />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:id" element={<InvoiceDetail />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'manager', 'mechanic']} />}>
            <Route path="/part-requests" element={<PartRequests />} />
          </Route>

          <Route element={<ProtectedRoute roles={STAFF} />}>
            <Route path="/clients" element={<Clients />} />
            <Route path="/services" element={<Services />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}