import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import { formatMoney } from '../utils/format'
import Button from './Button'

export default function InvoiceBox({ order, canCreate }) {
  const [invoice, setInvoice] = useState(undefined) // undefined: yuklanmoqda, null: yo'q
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let ignore = false
    api
      .get('/payments/', { params: { order: order.id } })
      .then((res) => !ignore && setInvoice(res.data.results[0] || null))
      .catch(() => !ignore && setInvoice(null))
    return () => {
      ignore = true
    }
  }, [order.id])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/payments/create_for_order/', { order: order.id })
      setInvoice(data)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (invoice === undefined) return null
  if (!invoice && !canCreate) return null

  return (
    <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-3">
      <h2 className="text-lg font-bold">Hisob-faktura</h2>
      {invoice ? (
        <>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{invoice.number}</span>
            <span
              className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                invoice.status === 'paid' ? 'bg-[#E2F3DC] text-[#2F5E1B]' : 'bg-[#FDEFD3] text-[#8A4B00]'
              }`}
            >
              {invoice.status_display}
            </span>
          </div>
          <p className="text-muted">
            Qolgan summa: <b className="text-ink">{formatMoney(invoice.remaining_amount)} so'm</b>
          </p>
          <Link to={`/payments/${invoice.id}`} className="font-semibold text-brand-ink hover:underline">
            {canCreate && invoice.status !== 'paid' ? "Hisobni ochish va to'lovni qayd etish" : 'Hisobni ochish'}
          </Link>
        </>
      ) : (
        <>
          <p className="text-muted">Buyurtma yakunlangan. Hisob-faktura shakllantiring, keyin to'lovni qayd eting.</p>
          <Button onClick={create} disabled={busy}>
            Hisob-faktura yaratish
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}