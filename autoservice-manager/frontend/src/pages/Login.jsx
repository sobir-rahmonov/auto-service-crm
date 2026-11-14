import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/errors'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../context/auth-context'
import AuthLayout from '../layouts/AuthLayout'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Login yoki parol noto'g'ri"
          : parseApiError(err).message || 'Xatolik yuz berdi',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Xush kelibsiz</h2>
          <p className="text-muted">Davom etish uchun hisobingizga kiring</p>
        </div>

        <Field
          label="Login"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Foydalanuvchi nomi"
          autoComplete="username"
          required
        />
        <Field
          label="Parol"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parolingiz"
          autoComplete="current-password"
          required
        />

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="h-14 text-[17px]">
          {submitting ? 'Kirilmoqda...' : 'Kirish'}
        </Button>

        <p className="text-center text-muted">
          Hisobingiz yo'qmi?{' '}
          <Link to="/register" className="font-semibold text-brand-ink hover:underline">
            Ro'yxatdan o'tish
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}