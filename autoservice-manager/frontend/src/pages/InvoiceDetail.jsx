import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import Button from '../components/Button'
import Field from '../components/Field'
import Select from '../components/Select'
import { useAuth } from '../context/auth-context'
import { formatDate, formatMoney } from '../utils/format'
import { InvoiceBadge } from './Payments'

function PayForm({ invoice, onPaid }) {
  const [amount, setAmount] = useState(String(Number(invoice.remaining_amount)))
  const [method, setMethod] = useState('cash')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post(`/payments/${invoice.id}/pay/`, { amount, method })
      onPaid(data)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-white border border-line p-5">
      <h2 className="text-lg font-bold">To'lovni qayd etish</h2>
      <Field label="Summa, so'm" id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <Select label="To'lov usuli" id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Naqd</option>
        <option value="card">Karta</option>
        <option value="transfer">O'tkazma</option>
      </Select>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Saqlanmoqda...' : "To'lovni qayd etish"}
      </Button>
      <p className="text-sm text-muted">Qisman to'lov mumkin. Summa to'liq yopilganda buyurtma avtomatik "To'langan" bo'ladi.</p>
    </form>
  )
}

function InvoiceView({ id }) {
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let ignore = false
    api
      .get(`/payments/${id}/`)
      .then((res) => !ignore && setInvoice(res.data))
      .catch((err) => !ignore && setLoadError(err.response?.status === 404 ? 'Hisob topilmadi.' : errorText(err)))
    return () => {
      ignore = true
    }
  }, [id])

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">{loadError}</p>
        <Link to="/payments" className="font-semibold text-brand-ink hover:underline">&larr; Hisoblarga qaytish</Link>
      </div>
    )
  }
  if (!invoice) return <p className="text-muted">Yuklanmoqda...</p>

  const canPay = (user.role === 'admin' || user.role === 'manager') && invoice.status !== 'paid'

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <header className="flex flex-col gap-2">
        <Link to="/payments" className="text-[15px] font-semibold text-brand-ink hover:underline">&larr; Hisoblar</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold">Hisob-faktura {invoice.number}</h1>
          <InvoiceBadge status={invoice.status} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <section className="rounded-2xl bg-white border border-line p-5 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">Mijoz</span><b>{invoice.client_name}</b></div>
            <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">Avtomobil</span><b>{invoice.vehicle_info}</b></div>
            <div className="flex flex-col gap-1"><span className="text-[13px] text-muted">Sana</span><b>{formatDate(invoice.created_at)}</b></div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">Buyurtma</span>
              <Link to={`/orders/${invoice.order}`} className="font-bold text-brand-ink hover:underline">#{invoice.order}</Link>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-3">
            <h2 className="text-lg font-bold">To'lovlar tarixi</h2>
            {invoice.payments.length === 0 ? (
              <p className="text-muted">Hozircha to'lov qayd etilmagan.</p>
            ) : (
              <ul className="flex flex-col">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF0EC] py-3 first:border-t-0">
                    <span>
                      <b>{formatMoney(p.amount)} so'm</b>
                      <span className="text-muted">, {p.method_display}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {formatDate(p.paid_at)}
                      {p.recorded_by_name ? `, ${p.recorded_by_name}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 min-w-0">
          <section className="rounded-2xl bg-brand-dark text-white p-6 flex flex-col gap-3">
            <div className="flex flex-col"><span className="text-[15px] text-[#CFE8E4]">Jami summa</span><span className="text-3xl font-bold">{formatMoney(invoice.total_amount)}</span></div>
            <div className="flex justify-between text-[15px]"><span className="text-[#CFE8E4]">To'langan</span><b>{formatMoney(invoice.paid_amount)}</b></div>
            <div className="flex justify-between text-[15px]"><span className="text-[#CFE8E4]">Qolgan</span><b>{formatMoney(invoice.remaining_amount)}</b></div>
          </section>
          {canPay && <PayForm key={invoice.remaining_amount} invoice={invoice} onPaid={setInvoice} />}
        </aside>
      </div>
    </div>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  return <InvoiceView key={id} id={id} />
}