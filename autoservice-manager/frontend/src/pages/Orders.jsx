import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../api/orders'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/auth-context'
import { formatDate, formatMoney } from '../utils/format'

const PAGE_SIZE = 10

const TABS = [
  ['', 'Hammasi'],
  ['new', 'Yangi'],
  ['diagnostics', 'Diagnostika'],
  ['assigned', 'Ustaga biriktirilgan'],
  ['in_progress', "Ta'mirlanmoqda"],
  ['completed', 'Yakunlangan'],
  ['paid', "To'langan"],
  ['cancelled', 'Bekor qilingan'],
]

const TITLES = {
  admin: 'Buyurtmalar',
  manager: 'Buyurtmalar',
  mechanic: 'Mening buyurtmalarim',
  client: 'Mening buyurtmalarim',
}

export default function Orders() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 })
  const [searchText, setSearchText] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const key = JSON.stringify(filters)
  const loading = !data || data.key !== key

  // Qidiruv matni to'xtagach (350 ms) filtrga o'tkaziladi
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText, page: 1 }))
    }, 350)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    let ignore = false
    const params = { page: filters.page }
    if (filters.status) params.status = filters.status
    if (filters.search) params.search = filters.search

    listOrders(params)
      .then((res) => {
        if (ignore) return
        setError('')
        setData({ key, count: res.count, results: res.results })
      })
      .catch(() => {
        if (ignore) return
        setError("Buyurtmalarni yuklab bo'lmadi. Qayta urinib ko'ring.")
        setData({ key, count: 0, results: [] })
      })
    return () => {
      ignore = true
    }
  }, [filters, key])

  const results = data?.results ?? []
  const count = data?.count ?? 0
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const showClient = user.role !== 'client'
  const showMechanic = user.role !== 'mechanic'
  const showPrice = user.role !== 'mechanic'
  const canCreate = user.role !== 'mechanic'

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">{TITLES[user.role]}</h1>
        {canCreate && (
          <Link
            to="/orders/new"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-brand text-white font-semibold hover:bg-brand-ink"
          >
            <Icon name="plus" size={18} />
            {user.role === 'client' ? "Ta'mirlashga so'rov" : 'Yangi buyurtma'}
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="sr-only">Qidirish</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={showClient ? 'Mijoz, davlat raqami yoki muammo' : 'Davlat raqami yoki muammo'}
            className="h-12 w-full sm:w-96 px-4 rounded-xl border-[1.5px] border-[#8FA09C] bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Holat bo'yicha filtr">
          {TABS.map(([value, label]) => {
            const active = filters.status === value
            return (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, status: value, page: 1 }))}
                aria-pressed={active}
                className={`h-11 shrink-0 px-4 rounded-full text-[15px] cursor-pointer border-[1.5px] ${
                  active
                    ? 'bg-brand border-brand text-white font-semibold'
                    : 'bg-white border-[#CBD3CF] text-[#2B3B3F] font-medium hover:bg-brand-soft'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      <section
        className={`rounded-2xl bg-white border border-line transition-opacity ${loading ? 'opacity-60' : ''}`}
      >
        {!loading && results.length === 0 ? (
          <p className="p-8 text-center text-muted">Buyurtma topilmadi.</p>
        ) : (
          <>
            {/* Katta ekran: jadval */}
            <table className="hidden md:table w-full text-[15px]">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="px-5 py-4 font-semibold">№</th>
                  {showClient && <th className="font-semibold">Mijoz</th>}
                  <th className="font-semibold">Avtomobil</th>
                  {showMechanic && <th className="font-semibold">Usta</th>}
                  <th className="font-semibold">Holat</th>
                  <th className="font-semibold">Sana</th>
                  {showPrice && <th className="px-5 font-semibold text-right">Summa, so'm</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((o) => (
                  <tr key={o.id} className="border-t border-[#EDF0EC] hover:bg-page/60">
                    <td className="px-5 py-4 font-semibold">
                      <Link to={`/orders/${o.id}`} className="text-brand-ink hover:underline">
                        #{o.id}
                      </Link>
                    </td>
                    {showClient && <td>{o.client_name}</td>}
                    <td>{o.vehicle_info}</td>
                    {showMechanic && (
                      <td className={o.mechanic_name ? '' : 'text-muted'}>
                        {o.mechanic_name || 'Biriktirilmagan'}
                      </td>
                    )}
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="text-muted">{formatDate(o.created_at)}</td>
                    {showPrice && (
                      <td className="px-5 text-right font-semibold">{formatMoney(o.total_price)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Telefon: kartochkalar */}
            <ul className="md:hidden">
              {results.map((o) => (
                <li key={o.id} className="border-t first:border-t-0 border-[#EDF0EC]">
                  <Link to={`/orders/${o.id}`} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-brand-ink">#{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <span className="font-medium">{o.vehicle_info}</span>
                    <div className="flex items-center justify-between text-sm text-muted">
                      <span>{showClient ? o.client_name : formatDate(o.created_at)}</span>
                      {showPrice && (
                        <span className="font-semibold text-ink">{formatMoney(o.total_price)} so'm</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {count > PAGE_SIZE && (
        <nav aria-label="Sahifalar" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="h-11 px-5 rounded-xl border-[1.5px] border-[#CBD3CF] bg-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Oldingi
          </button>
          <span className="text-muted">
            {filters.page} / {pages} sahifa, jami {count} ta
          </span>
          <button
            type="button"
            disabled={filters.page >= pages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="h-11 px-5 rounded-xl border-[1.5px] border-[#CBD3CF] bg-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keyingi
          </button>
        </nav>
      )}
    </div>
  )
}