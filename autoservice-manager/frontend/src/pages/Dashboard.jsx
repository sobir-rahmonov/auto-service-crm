import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Icon from '../components/Icon'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/auth-context'
import { formatDate, formatMoney } from '../utils/format'

const money = formatMoney

// Har bir rol uchun ko'rsatkichlar: [kalit, yozuv, format, ko'rinish]
const CARDS = {
  admin: [
    ['active_orders', 'Faol buyurtmalar'],
    ['completed_orders', 'Yakunlangan buyurtmalar'],
    ['total_revenue', "Jami tushum, so'm", money, 'brand'],
    ['total_clients', 'Mijozlar'],
    ['total_vehicles', 'Avtomobillar'],
    ['parts_total_quantity', 'Ombordagi qismlar, dona'],
  ],
  manager: [
    ['today_orders', 'Bugungi buyurtmalar'],
    ['new_orders', 'Yangi buyurtmalar'],
    ['in_progress_orders', "Ta'mirlanayotgan avtomobillar"],
    ['waiting_orders', "Ta'mirlashni kutayotganlar"],
    ['completed_orders', 'Yakunlangan buyurtmalar'],
    ['awaiting_payment_orders', "To'lov kutilayotganlar", null, 'brand'],
  ],
  mechanic: [
    ['assigned_orders', 'Menga biriktirilgan (kutilmoqda)'],
    ['in_progress_orders', "Jarayondagi ta'mirlashlar"],
    ['completed_orders', "Yakunlangan ta'mirlashlar"],
    ['pending_part_requests', "Ehtiyot qism so'rovlari"],
  ],
  client: [
    ['vehicles_count', 'Mening avtomobillarim'],
    ['orders_count', 'Mening buyurtmalarim'],
    ['in_progress_orders', "Jarayondagi ta'mirlashlar"],
    ['unpaid_invoices', "To'lov kutilayotgan hisoblar", null, 'brand'],
    ['completed_orders', 'Yakunlangan xizmatlar'],
  ],
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([api.get('/reports/dashboard/'), api.get('/orders/')])
      .then(([dash, ord]) => {
        if (ignore) return
        setStats(dash.data.data)
        setOrders(ord.data.results.slice(0, 5))
      })
      .catch(() => {
        if (!ignore) setError("Ma'lumotni yuklab bo'lmadi. Qayta urinib ko'ring.")
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const canCreate = user.role !== 'mechanic'
  const createLabel = user.role === 'client' ? "Ta'mirlashga so'rov yuborish" : 'Yangi buyurtma'
  const cards = CARDS[user.role] || []

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold">Bosh sahifa</h1>
          <span className="text-muted">Bugun: {formatDate(new Date())}</span>
        </div>
        {canCreate && (
          <Link
            to="/orders/new"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-brand text-white font-semibold hover:bg-brand-ink"
          >
            <Icon name="plus" size={18} />
            {createLabel}
          </Link>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {loading && <p className="text-muted">Yuklanmoqda...</p>}

      {stats && (
        <section aria-label="Asosiy ko'rsatkichlar" className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(([key, label, format, tone]) => (
            <StatCard
              key={key}
              label={label}
              value={format ? format(stats[key]) : stats[key] ?? 0}
              tone={tone}
            />
          ))}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {!loading && (
          <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">So'nggi buyurtmalar</h2>
              <Link to="/orders" className="font-semibold text-brand-ink hover:underline">
                Hammasi
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-muted py-4">Hozircha buyurtma yo'q.</p>
            ) : (
              <ul className="flex flex-col">
                {orders.map((o) => (
                  <li key={o.id} className="border-t border-[#EDF0EC] py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <Link to={`/orders/${o.id}`} className="font-semibold text-brand-ink hover:underline">
                        #{o.id} {o.client_name}
                      </Link>
                      <span className="text-sm text-muted">{o.vehicle_info}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={o.status} />
                      {user.role !== 'mechanic' && (
                        <span className="w-24 text-right font-semibold">{money(o.total_price)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {user.role === 'admin' && stats && (
          <section className="rounded-2xl bg-white border border-line p-5 flex flex-col gap-3 self-start">
            <h2 className="text-lg font-bold">Eng faol ustalar</h2>
            {stats.top_mechanics.length === 0 ? (
              <p className="text-muted">Hozircha ma'lumot yo'q.</p>
            ) : (
              stats.top_mechanics.map((m) => (
                <div key={m.id} className="flex justify-between">
                  <span>{m.username}</span>
                  <span className="font-bold">{m.done_orders} ta</span>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  )
}