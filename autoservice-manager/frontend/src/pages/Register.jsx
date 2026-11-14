import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { parseApiError } from '../api/errors'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../context/auth-context'
import AuthLayout from '../layouts/AuthLayout'

const EMPTY = {
  username: '',
  first_name: '',
  last_name: '',
  phone: '',
  password: '',
  password2: '',
}

export default function Register() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      await register(form)
      // Ro'yxatdan o'tgach darhol kiritib yuboramiz
      await login(form.username, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const parsed = parseApiError(err)
      setErrors(parsed.fields)
      setMessage(parsed.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 mb-2">
          <h2 className="text-3xl font-bold">Ro'yxatdan o'tish</h2>
          <p className="text-muted">Mijoz hisobini oching</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ism" id="first_name" value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
          <Field label="Familiya" id="last_name" value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
        </div>
        <Field label="Login" id="username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" required />
        <Field label="Telefon" id="phone" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+998 90 123 45 67" />
        <Field label="Parol" id="password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" required />
        <Field label="Parolni takrorlang" id="password2" type="password" value={form.password2} onChange={set('password2')} error={errors.password2} autoComplete="new-password" required />

        {message && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {message}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="h-14 text-[17px]">
          {submitting ? 'Yaratilmoqda...' : "Ro'yxatdan o'tish"}
        </Button>

        <p className="text-center text-muted">
          Hisobingiz bormi?{' '}
          <Link to="/login" className="font-semibold text-brand-ink hover:underline">
            Kirish
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}