import { useState } from 'react'
import { Link } from 'react-router-dom'
import ListPage from '../components/ListPage'
import { useAuth } from '../context/auth-context'
import useList from '../hooks/useList'
import { formatDate, formatMoney } from '../utils/format'

export function InvoiceBadge({ status }) {
  const paid = status === 'paid'
  return (
    <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${paid ? 'bg-[#E2F3DC] text-[#2F5E1B]' : 'bg-[#FDEFD3] text-[#8A4B00]'}`}>
      {paid ? "To'langan" : "To'lanmagan"}
    </span>
  )
}

export default function Payments() {
  const { user } = useAuth()
  const isClient = user.role === 'client'
  const [status, setStatus] = useState('')
  const list = useList('/payments/', status ? { status } : {})

  const columns = [
    {
      label: 'Hisob №',
      primary: true,
      render: (r) => (
        <Link to={`/payments/${r.id}`} className="text-brand-ink hover:underline">
          {r.number}
        </Link>
      ),
    },
    ...(!isClient ? [{ label: 'Mijoz', render: (r) => r.client_name }] : []),
    { label: 'Avtomobil', render: (r) => r.vehicle_info },
    { label: "Summa, so'm", align: 'right', render: (r) => formatMoney(r.total_amount) },
    { label: "To'langan, so'm", align: 'right', render: (r) => formatMoney(r.paid_amount) },
    { label: 'Holat', render: (r) => <InvoiceBadge status={r.status} /> },
    { label: 'Sana', render: (r) => formatDate(r.created_at) },
  ]

  return (
    <ListPage
      title={isClient ? 'Mening hisoblarim' : "To'lovlar va hisob-fakturalar"}
      list={list}
      searchPlaceholder={isClient ? 'Hisob raqami' : 'Hisob raqami yoki mijoz'}
      columns={columns}
      empty="Hisob-faktura topilmadi."
      filters={
        <label className="block">
          <span className="sr-only">Holat bo'yicha</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              list.setPage(1)
            }}
            className="h-12 px-3 rounded-xl border-[1.5px] border-[#8FA09C] bg-white"
          >
            <option value="">Hamma holatlar</option>
            <option value="unpaid">To'lanmagan</option>
            <option value="paid">To'langan</option>
          </select>
        </label>
      }
    />
  )
}