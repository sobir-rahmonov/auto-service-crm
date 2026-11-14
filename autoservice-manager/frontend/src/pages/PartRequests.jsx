import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { errorText } from '../api/errors'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import { useAuth } from '../context/auth-context'
import useList from '../hooks/useList'
import { formatDate } from '../utils/format'

const STATUS = {
  pending: ['Kutilmoqda', 'bg-[#FDEFD3] text-[#8A4B00]'],
  approved: ['Tasdiqlangan', 'bg-[#E2F3DC] text-[#2F5E1B]'],
  rejected: ['Rad etilgan', 'bg-[#EEEEEE] text-[#4A4A4A]'],
}

export default function PartRequests() {
  const { user } = useAuth()
  const canReview = user.role === 'admin' || user.role === 'manager'
  const [status, setStatus] = useState(canReview ? 'pending' : '')
  const list = useList('/orders/part-requests/', status ? { status } : {})
  const [rejecting, setRejecting] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function approve(r) {
    setBusyId(r.id)
    setNotice(null)
    try {
      await api.post(`/orders/part-requests/${r.id}/approve/`, {})
      setNotice({ ok: true, text: `${r.part_name} buyurtmaga qo'shildi, ombordan ${r.quantity} dona kamaydi.` })
      list.reload()
    } catch (err) {
      setNotice({ ok: false, text: errorText(err) })
    } finally {
      setBusyId(null)
    }
  }

  async function reject(v) {
    await api.post(`/orders/part-requests/${rejecting.id}/reject/`, { review_note: v.review_note })
    list.reload()
  }

  const columns = [
    {
      label: 'Buyurtma',
      primary: true,
      render: (r) => (
        <Link to={`/orders/${r.order}`} className="text-brand-ink hover:underline">
          #{r.order}
        </Link>
      ),
    },
    { label: 'Qism', render: (r) => r.part_name },
    { label: 'Soni', render: (r) => `${r.quantity} dona` },
    ...(canReview ? [{ label: "So'ragan usta", render: (r) => r.requested_by_name || '—' }] : []),
    { label: 'Izoh', render: (r) => r.comment || r.review_note || '—' },
    {
      label: 'Holat',
      render: (r) => (
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
      ),
    },
    { label: 'Sana', render: (r) => formatDate(r.created_at) },
    ...(canReview
      ? [
          {
            label: '',
            render: (r) =>
              r.status === 'pending' ? (
                <div className="flex gap-4">
                  <button type="button" disabled={busyId === r.id} onClick={() => approve(r)} className="font-semibold text-brand-ink hover:underline cursor-pointer disabled:opacity-50">
                    Tasdiqlash
                  </button>
                  <button type="button" disabled={busyId === r.id} onClick={() => setRejecting(r)} className="font-semibold text-red-800 hover:underline cursor-pointer disabled:opacity-50">
                    Rad etish
                  </button>
                </div>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <>
      <ListPage
        title="Ehtiyot qism so'rovlari"
        list={list}
        searchPlaceholder="Qidirish"
        columns={columns}
        empty={status === 'pending' ? "Kutilayotgan so'rov yo'q." : "So'rov topilmadi."}
        notice={
          notice && (
            <p
              role={notice.ok ? 'status' : 'alert'}
              className={`rounded-xl px-4 py-3 ${notice.ok ? 'bg-[#DDF1EA] text-[#0B5A44]' : 'bg-red-50 text-red-800'}`}
            >
              {notice.text}
            </p>
          )
        }
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
              <option value="pending">Kutilmoqda</option>
              <option value="approved">Tasdiqlangan</option>
              <option value="rejected">Rad etilgan</option>
            </select>
          </label>
        }
      />
      {rejecting && (
        <FormModal
          key={rejecting.id}
          title={`Rad etish: ${rejecting.part_name}`}
          fields={[{ name: 'review_note', label: 'Rad etish sababi (ixtiyoriy)', type: 'textarea' }]}
          onSubmit={reject}
          submitLabel="Rad etish"
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  )
}