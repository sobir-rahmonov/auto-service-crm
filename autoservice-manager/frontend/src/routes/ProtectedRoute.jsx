import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

// roles berilsa, faqat shu rollar kira oladi
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-8 text-muted">Yuklanmoqda...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}