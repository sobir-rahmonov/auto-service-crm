import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import * as ordersApi from '../api/orders'
import Button from '../components/Button'
import Field from '../components/Field'
import InvoiceBox from '../components/InvoiceBox'
import Select from '../components/Select'
import StatusBadge from '../components/StatusBadge'
import Textarea from '../components/Textarea'
import { useAuth } from '../context/auth-context'
import { formatDate, formatMoney } from '../utils/format'

const EDITABLE = ['new', 'diagnostics', 'assigned', 'in_progress']
const STEPS = [
  ['new', 'Yangi'],
  ['diagnostics', 'Diagnostika'],
  ['assigned', 'Usta'],
  ['in_progress', "Ta'mirlash"],
  ['completed', 'Yakun'],
  ['paid', "To'lov"],
]

function Card({ title, children, action }) {
  return (
    <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-4">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function Info({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-base font-semibold">{children || '—'}</span>
    </div>
  )
}

function Progress({ status }) {
  if (status === 'cancelled') return null
  const current = STEPS.findIndex(([key]) => key === status)
  return (
    <ol aria-label="Buyurtma bosqichlari" className="flex items-start rounded-2xl bg-white border border-line p-4 overflow-x-auto">
      {STEPS.map(([key, label], i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={key} className="flex-1 min-w-17 flex flex-col items-center gap-2 relative">
            {i > 0 && (
              <span className={`absolute top-3.5 right-1/2 w-full h-0.75 ${i <= current ? 'bg-brand' : 'bg-[#D5DCD8]'}`} />
            )}
            <span
              className={`relative z-1 w-7.5 h-7.5 rounded-full flex items-center justify-center text-sm font-bold ${
                done
                  ? 'bg-brand text-white'
                  : now
                    ? 'bg-white border-[3px] border-brand text-brand-ink'
                    : 'bg-[#E4E7E3] text-[#4A5A5E]'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs text-center ${now ? 'font-bold text-brand-ink' : 'text-[#4A5A5E]'}`}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

// Ro'yxatdan qidirib tanlash (xizmat yoki qism): qo'shish va so'rov uchun umumiy
function Picker({ url, label, optionText, withQty, withComment, submitLabel, onSubmit, busy }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState(1)
  const [comment, setComment] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .get(url, { params: { search } })
        .then((res) => setItems(res.data.results))
        .catch(() => setItems([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [url, search])

  async function submit(e) {
    e.preventDefault()
    const ok = await onSubmit(selected, qty, comment)
    if (ok) {
      setSelected('')
      setQty(1)
      setComment('')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-page p-4">
      <Field label={`${label}ni qidiring`} id={`s-${label}`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nomi yoki kodi" />
      <Select label={label} id={`p-${label}`} value={selected} onChange={(e) => setSelected(e.target.value)} required>
        <option value="">Tanlang</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {optionText(it)}
          </option>
        ))}
      </Select>
      {withQty && (
        <Field label="Soni" id={`q-${label}`} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
      )}
      {withComment && (
        <Textarea label="Izoh" id={`c-${label}`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      )}
      <Button type="submit" disabled={busy || !selected} className="h-11">
        {submitLabel}
      </Button>
    </form>
  )
}

function DiagnosisForm({ order, run, busy }) {
  const [text, setText] = useState(order.diagnosis)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => ordersApi.setDiagnosis(order.id, text), 'Diagnostika saqlandi')
      }}
      className="flex flex-col gap-3"
    >
      <Textarea label="Diagnostika natijasi" id="diagnosis" value={text} onChange={(e) => setText(e.target.value)} required />
      <Button type="submit" disabled={busy || !text.trim()} className="h-11 self-start">
        Saqlash
      </Button>
    </form>
  )
}

function NotesForm({ order, run, busy }) {
  const [form, setForm] = useState({
    extra_issues: order.extra_issues,
    work_notes: order.work_notes,
    time_spent_minutes: order.time_spent_minutes,
  })
  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => ordersApi.saveNotes(order.id, form), 'Izohlar saqlandi')
      }}
      className="flex flex-col gap-3"
    >
      <Textarea label="Aniqlangan qo'shimcha nosozliklar" id="extra" rows={3} value={form.extra_issues} onChange={set('extra_issues')} />
      <Textarea label="Bajarilgan ishlar" id="work" rows={3} value={form.work_notes} onChange={set('work_notes')} />
      <Field label="Sarflangan vaqt (daqiqa)" id="time" type="number" min="0" value={form.time_spent_minutes} onChange={set('time_spent_minutes')} />
      <Button type="submit" disabled={busy} className="h-11 self-start">
        Saqlash
      </Button>
    </form>
  )
}

function AssignBox({ order, run, busy }) {
  const [mechanics, setMechanics] = useState([])
  const [mechanic, setMechanic] = useState(order.mechanic || '')

  useEffect(() => {
    api
      .get('/auth/mechanics/')
      .then((res) => setMechanics(res.data))
      .catch(() => setMechanics([]))
  }, [])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => ordersApi.assignMechanic(order.id, mechanic), 'Usta biriktirildi')
      }}
      className="flex flex-col gap-3"
    >
      <Select label="Mas'ul usta" id="mechanic" value={mechanic} onChange={(e) => setMechanic(e.target.value)} required>
        <option value="">Ustani tanlang</option>
        {mechanics.map((m) => (
          <option key={m.id} value={m.id}>
            {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.username}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={busy || !mechanic} variant={order.mechanic ? 'outline' : 'primary'} className="h-11">
        {order.mechanic ? 'Ustani almashtirish' : 'Ustaga biriktirish'}
      </Button>
    </form>
  )
}

function ReviewBox({ order }) {
  const [review, setReview] = useState(undefined)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    ordersApi
      .getReview(order.id)
      .then(setReview)
      .catch(() => setReview(null))
  }, [order.id])

  if (review === undefined) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      setReview(await ordersApi.createReview(order.id, rating, comment))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="Fikr va baho">
      {review ? (
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">Baho: {review.rating} / 5</span>
          {review.comment && <span className="text-muted">{review.comment}</span>}
          <span className="text-sm text-muted">Rahmat, fikringiz qabul qilindi.</span>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div role="group" aria-label="Baho" className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-pressed={rating === n}
                className={`w-12 h-12 rounded-xl border-[1.5px] font-bold cursor-pointer ${
                  rating === n ? 'bg-brand border-brand text-white' : 'bg-white border-[#CBD3CF]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Textarea label="Fikringiz (ixtiyoriy)" id="review" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={sending} className="h-11 self-start">
            Yuborish
          </Button>
        </form>
      )}
    </Card>
  )
}

function OrderView({ id }) {
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let ignore = false
    ordersApi
      .getOrder(id)
      .then((data) => !ignore && setOrder(data))
      .catch((err) => {
        if (ignore) return
        setLoadError(err.response?.status === 404 ? 'Buyurtma topilmadi.' : errorText(err))
      })
    return () => {
      ignore = true
    }
  }, [id])

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">{loadError}</p>
        <Link to="/orders" className="font-semibold text-brand-ink hover:underline">&larr; Buyurtmalarga qaytish</Link>
      </div>
    )
  }
  if (!order) return <p className="text-muted">Yuklanmoqda...</p>

  const isStaff = user.role === 'admin' || user.role === 'manager'
  const isMech = user.role === 'mechanic'
  const isClient = user.role === 'client'
  const showPrice = !isMech
  const editable = EDITABLE.includes(order.status)

  // Amalni bajaradi; buyurtma qaytsa, sahifani yangilaydi
  async function run(fn, okText = '') {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fn()
      if (res?.status_history) setOrder(res)
      setMsg({ ok: true, text: okText })
      return true
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) })
      return false
    } finally {
      setBusy(false)
    }
  }

  const rows = [
    ...order.order_services.map((s) => ({
      key: `s${s.id}`, name: s.service_name, type: 'Xizmat', qty: 1, sum: s.price,
      remove: () => run(() => ordersApi.removeService(order.id, s.id)),
    })),
    ...order.order_parts.map((p) => ({
      key: `p${p.id}`, name: p.part_name, type: 'Qism', qty: p.quantity, sum: p.subtotal,
      remove: () => run(() => ordersApi.removePart(order.id, p.id)),
    })),
  ]

  const canStart = (isStaff || isMech) && order.status === 'assigned'
  const canFinish = (isStaff || isMech) && order.status === 'in_progress'
  const canCancel = isStaff && editable

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <header className="flex flex-col gap-2">
        <Link to="/orders" className="text-[15px] font-semibold text-brand-ink hover:underline">
          &larr; Buyurtmalar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold">Buyurtma #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <Progress status={order.status} />

      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          className={`rounded-xl px-4 py-3 ${msg.ok ? 'bg-[#DDF1EA] text-[#0B5A44]' : 'bg-red-50 text-red-800'}`}
        >
          {msg.text || 'Bajarildi'}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {!isClient && <Info label="Mijoz">{order.client_name}</Info>}
              <Info label="Avtomobil">{order.vehicle_info}</Info>
              <Info label="Usta">{order.mechanic_name}</Info>
              <Info label="Yaratilgan">{formatDate(order.created_at)}</Info>
              {order.completed_at && <Info label="Yakunlangan">{formatDate(order.completed_at)}</Info>}
              {order.time_spent_minutes > 0 && <Info label="Sarflangan vaqt">{order.time_spent_minutes} daqiqa</Info>}
            </div>
            <Info label="Mijoz aytgan muammo">{order.problem_description}</Info>
            {order.diagnosis && !(editable && (isStaff || isMech)) && <Info label="Diagnostika natijasi">{order.diagnosis}</Info>}
            {order.extra_issues && !(editable && (isStaff || isMech)) && <Info label="Qo'shimcha nosozliklar">{order.extra_issues}</Info>}
            {order.work_notes && !(editable && (isStaff || isMech)) && <Info label="Bajarilgan ishlar">{order.work_notes}</Info>}
          </Card>

          <Card title="Xizmatlar va qismlar">
            {rows.length === 0 ? (
              <p className="text-muted">Hozircha xizmat yoki qism tanlanmagan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left text-[13px] text-muted">
                      <th className="py-2 font-semibold">Nomi</th>
                      <th className="font-semibold">Turi</th>
                      <th className="font-semibold text-right">Soni</th>
                      {showPrice && <th className="font-semibold text-right">Summa, so'm</th>}
                      {isStaff && editable && <th className="w-24" />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-t border-[#EDF0EC]">
                        <td className="py-3 font-semibold">{r.name}</td>
                        <td className="text-muted">{r.type}</td>
                        <td className="text-right">{r.qty}</td>
                        {showPrice && <td className="text-right font-semibold">{formatMoney(r.sum)}</td>}
                        {isStaff && editable && (
                          <td className="text-right">
                            <button type="button" onClick={r.remove} disabled={busy} className="text-sm font-semibold text-red-800 hover:underline cursor-pointer">
                              Olib tashlash
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isStaff && editable && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">Xizmat qo'shish</h3>
                  <Picker
                    url="/services/?is_active=true"
                    label="Xizmat"
                    optionText={(s) => `${s.name}, ${formatMoney(s.price)} so'm`}
                    submitLabel="Xizmatni qo'shish"
                    busy={busy}
                    onSubmit={(sel) => run(() => ordersApi.addService(order.id, sel), "Xizmat qo'shildi")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">Qism qo'shish (ombordan kamayadi)</h3>
                  <Picker
                    url="/inventory/?is_active=true"
                    label="Qism"
                    withQty
                    optionText={(p) => `${p.name}, ${formatMoney(p.price)} so'm (omborda ${p.quantity})`}
                    submitLabel="Qismni qo'shish"
                    busy={busy}
                    onSubmit={(sel, qty) => run(() => ordersApi.addPart(order.id, sel, Number(qty)), "Qism qo'shildi")}
                  />
                </div>
              </div>
            )}
          </Card>

          {(isStaff || isMech) && editable && (
            <>
              <Card title="Diagnostika">
                <DiagnosisForm order={order} run={run} busy={busy} />
              </Card>
              <Card title="Usta izohlari">
                <NotesForm order={order} run={run} busy={busy} />
              </Card>
            </>
          )}

          {isMech && (order.status === 'assigned' || order.status === 'in_progress') && (
            <Card title="Ehtiyot qism so'rash">
              <p className="text-sm text-muted">So'rovni menejer tasdiqlaydi, shundan keyin qism buyurtmaga qo'shiladi.</p>
              <Picker
                url="/inventory/"
                label="Qism"
                withQty
                withComment
                optionText={(p) => `${p.name} (omborda ${p.quantity})`}
                submitLabel="So'rov yuborish"
                busy={busy}
                onSubmit={(sel, qty, comment) =>
                  run(() => ordersApi.requestPart(order.id, sel, Number(qty), comment), "So'rov yuborildi, menejer tasdiqlashini kuting")
                }
              />
            </Card>
          )}

          {isClient && (order.status === 'completed' || order.status === 'paid') && <ReviewBox order={order} />}
        </div>

        <aside className="flex flex-col gap-4 min-w-0">
          {showPrice && (
            <section className="rounded-2xl bg-brand-dark text-white p-6 flex flex-col gap-1">
              <span className="text-[15px] text-[#CFE8E4]">Umumiy narx</span>
              <span className="text-4xl font-bold leading-tight">{formatMoney(order.total_price)}</span>
              <span className="text-sm text-[#CFE8E4]">so'm, xizmat va qismlar bo'yicha avtomatik</span>
            </section>
          )}

          {(canStart || canFinish || canCancel || (isStaff && editable && order.status !== 'in_progress')) && (
            <Card title="Amallar">
              {canStart && (
                <Button disabled={busy} onClick={() => run(() => ordersApi.changeStatus(order.id, 'in_progress'), "Ta'mirlash boshlandi")} className="h-13">
                  Ta'mirlashni boshlash
                </Button>
              )}
              {canFinish && (
                <Button disabled={busy} onClick={() => run(() => ordersApi.changeStatus(order.id, 'completed'), 'Buyurtma yakunlandi')} className="h-13">
                  Ta'mirlashni yakunlash
                </Button>
              )}
              {isStaff && editable && order.status !== 'in_progress' && <AssignBox order={order} run={run} busy={busy} />}
              {canCancel && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => window.confirm('Buyurtma bekor qilinsin? Qismlar omborga qaytariladi.') && run(() => ordersApi.changeStatus(order.id, 'cancelled'), 'Buyurtma bekor qilindi')}
                >
                  Buyurtmani bekor qilish
                </Button>
              )}
            </Card>
          )}

                {!isMech && (order.status === 'completed' || order.status === 'paid') && (
            <InvoiceBox order={order} canCreate={isStaff} />
          )}
          <Card title="Tarix">
            <ul className="flex flex-col gap-2">
              {[...order.status_history].reverse().map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <StatusBadge status={h.status} />
                  <span className="text-muted text-right">
                    {formatDate(h.changed_at)}
                    {h.changed_by_name ? `, ${h.changed_by_name}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  return <OrderView key={id} id={id} />
}