import { useEffect, useState } from 'react'
import api from '../api/client'
import { errorText } from '../api/errors'
import Field from '../components/Field'
import StatCard from '../components/StatCard'
import { formatMoney } from '../utils/format'

const METHODS = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" }
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const key = JSON.stringify(range)
  const loading = !data || data.key !== key

  useEffect(() => {
    let ignore = false
    const params = {}
    if (range.from) params.date_from = range.from
    if (range.to) params.date_to = range.to
    api
      .get('/reports/financial/', { params })
      .then((res) => {
        if (ignore) return
        setError('')
        setData({ key, ...res.data })
      })
      .catch((err) => {
        if (ignore) return
        setError(errorText(err))
        setData({ key, invoices_count: 0, total_invoiced: 0, total_paid: 0, outstanding_debt: 0, by_method: [] })
      })
    return () => {
      ignore = true
    }
  }, [range, key])

  function thisMonth() {
    const now = new Date()
    setRange({ from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) })
  }

  const paid = Number(data?.total_paid) || 0

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <h1 className="text-2xl lg:text-3xl font-bold">Moliyaviy hisobot</h1>

      <section className="rounded-2xl bg-white border border-line p-5 flex flex-wrap items-end gap-4">
        <div className="w-44"><Field label="Boshlanish sanasi" id="from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div className="w-44"><Field label="Tugash sanasi" id="to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        <button type="button" onClick={thisMonth} className="h-12 px-5 rounded-xl border-[1.5px] border-brand text-brand-ink font-semibold cursor-pointer hover:bg-brand-soft">
          Shu oy
        </button>
        <button type="button" onClick={() => setRange({ from: '', to: '' })} className="h-12 px-5 rounded-xl border-[1.5px] border-[#CBD3CF] font-semibold cursor-pointer hover:bg-page">
          Barchasi
        </button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">{error}</p>}

      {data && (
        <div className={`flex flex-col gap-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Hisob-fakturalar" value={data.invoices_count} />
            <StatCard label="Jami hisoblangan, so'm" value={formatMoney(data.total_invoiced)} />
            <StatCard label="To'langan, so'm" value={formatMoney(data.total_paid)} tone="brand" />
            <StatCard label="Qarz, so'm" value={formatMoney(data.outstanding_debt)} />
          </section>

          <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-4">
            <h2 className="text-lg font-bold">To'lov usullari bo'yicha</h2>
            {data.by_method.length === 0 ? (
              <p className="text-muted">Tanlangan davrda to'lov yo'q.</p>
            ) : (
              data.by_method.map((m) => {
                const share = paid ? Math.round((Number(m.total) / paid) * 100) : 0
                return (
                  <div key={m.method} className="flex flex-col gap-2">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{METHODS[m.method] || m.method}</span>
                      <span>
                        <b>{formatMoney(m.total)} so'm</b>
                        <span className="text-muted">, {m.count} ta to'lov, {share}%</span>
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-page overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>
      )}
    </div>
  )
}