import { useState } from 'react'
import api from '../api/client'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import useList from '../hooks/useList'
import { formatMoney } from '../utils/format'

const FIELDS = [
  { name: 'name', label: 'Xizmat nomi', required: true },
  { name: 'description', label: 'Tavsif (ixtiyoriy)', type: 'textarea' },
  { name: 'price', label: "Narxi, so'm", type: 'number', min: 1, required: true },
  { name: 'duration_minutes', label: 'Taxminiy vaqt, daqiqa', type: 'number', min: 1, default: 60, required: true },
  { name: 'is_active', label: 'Katalogda ko\'rinsin', type: 'checkbox', default: true },
]

export default function Services() {
  const list = useList('/services/')
  const [editing, setEditing] = useState(null)
  const isNew = editing === 'new'

  async function save(v) {
    const body = {
      name: v.name,
      description: v.description,
      price: v.price,
      duration_minutes: Number(v.duration_minutes),
      is_active: v.is_active,
    }
    if (isNew) await api.post('/services/', body)
    else await api.patch(`/services/${editing.id}/`, body)
    list.reload()
  }

  const columns = [
    { label: 'Xizmat', primary: true, render: (r) => r.name },
    { label: "Narxi, so'm", render: (r) => formatMoney(r.price) },
    { label: 'Vaqt', render: (r) => `${r.duration_minutes} daq.` },
    {
      label: 'Holat',
      render: (r) => (
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${r.is_active ? 'bg-[#DDF1EA] text-[#0B5A44]' : 'bg-[#EEEEEE] text-[#4A4A4A]'}`}>
          {r.is_active ? 'Faol' : 'Yashirin'}
        </span>
      ),
    },
    {
      label: '',
      render: (r) => (
        <button type="button" onClick={() => setEditing(r)} className="font-semibold text-brand-ink hover:underline cursor-pointer">
          Tahrirlash
        </button>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Xizmatlar"
        actionLabel="Xizmat qo'shish"
        onAction={() => setEditing('new')}
        list={list}
        searchPlaceholder="Xizmat nomi"
        columns={columns}
        empty="Xizmat topilmadi."
      />
      {editing && (
        <FormModal
          key={isNew ? 'new' : editing.id}
          title={isNew ? "Xizmat qo'shish" : 'Xizmatni tahrirlash'}
          note={isNew ? undefined : "Narx o'zgarsa, eski buyurtmalar narxi o'zgarmaydi. Xizmatni o'chirmay, katalogdan yashirish mumkin."}
          fields={FIELDS}
          initial={isNew ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}