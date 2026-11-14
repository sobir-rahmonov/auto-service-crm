import { useEffect, useState } from 'react'
import api from '../api/client'
import { parseApiError } from '../api/errors'
import Button from './Button'
import Field from './Field'
import Modal from './Modal'
import Select from './Select'
import Textarea from './Textarea'

// Mijozni qidirib tanlash
function ClientSelect({ id, label, value, onChange, error }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .get('/auth/users/', { params: { role: 'client', search } })
        .then((res) => setItems(res.data.results))
        .catch(() => setItems([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="flex flex-col gap-3">
      <Field label="Mijozni qidiring" id={`${id}-search`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, login yoki telefon" />
      <Select label={label} id={id} value={value} onChange={onChange} error={error} required>
        <option value="">Mijozni tanlang</option>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.username}
            {c.phone ? `, ${c.phone}` : ''}
          </option>
        ))}
      </Select>
    </div>
  )
}

/**
 * Umumiy forma oynasi.
 * fields: [{ name, label, type, required, options, hidden, default, min, max }]
 * type: text (standart), number, password, email, textarea, select, checkbox, client
 * onSubmit(values) xato tashlasa, xabar formada ko'rsatiladi; muvaffaqiyatli bo'lsa oyna yopiladi.
 */
export default function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel = 'Saqlash', note }) {
  const visible = fields.filter((f) => !f.hidden)
  const [values, setValues] = useState(() =>
    Object.fromEntries(visible.map((f) => [f.name, initial?.[f.name] ?? f.default ?? (f.type === 'checkbox' ? false : '')])),
  )
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (name) => (e) => setValues({ ...values, [name]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      const parsed = parseApiError(err)
      setErrors(parsed.fields)
      setMessage(parsed.message)
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {note && <p className="rounded-xl bg-page px-4 py-3 text-sm text-muted">{note}</p>}

        {visible.map((f) => {
          const id = `f-${f.name}`
          const error = errors[f.name]
          if (f.type === 'client') {
            return <ClientSelect key={f.name} id={id} label={f.label} value={values[f.name]} onChange={set(f.name)} error={error} />
          }
          if (f.type === 'select') {
            return (
              <Select key={f.name} id={id} label={f.label} value={values[f.name]} onChange={set(f.name)} error={error} required={f.required}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )
          }
          if (f.type === 'textarea') {
            return <Textarea key={f.name} id={id} label={f.label} rows={3} value={values[f.name]} onChange={set(f.name)} error={error} required={f.required} />
          }
          if (f.type === 'checkbox') {
            return (
              <label key={f.name} className="flex items-center gap-3 h-12 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[f.name]}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.checked })}
                  className="h-5 w-5 accent-[#0F766E]"
                />
                <span className="font-semibold">{f.label}</span>
              </label>
            )
          }
          return (
            <Field
              key={f.name}
              id={id}
              label={f.label}
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={set(f.name)}
              error={error}
              required={f.required}
              min={f.min}
              max={f.max}
              maxLength={f.maxLength}
              autoComplete={f.type === 'password' ? 'new-password' : 'off'}
            />
          )
        })}

        {message && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {message}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? 'Saqlanmoqda...' : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
        </div>
      </form>
    </Modal>
  )
}