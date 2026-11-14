import { useState } from 'react'
import api from '../api/client'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import useList from '../hooks/useList'
import { formatDate, formatMoney } from '../utils/format'

const PART_FIELDS = [
  { name: 'name', label: 'Qism nomi', required: true },
  { name: 'sku', label: 'Kod (artikul)', required: true },
  { name: 'description', label: 'Tavsif (ixtiyoriy)', type: 'textarea' },
  { name: 'price', label: "Bir dona narxi, so'm", type: 'number', min: 1, required: true },
  { name: 'min_quantity', label: 'Minimal qoldiq (shundan kam qolsa ogohlantiriladi)', type: 'number', min: 0, default: 5 },
  { name: 'is_active', label: "Katalogda ko'rinsin", type: 'checkbox', default: true },
]

const STOCK_FIELDS = [
  { name: 'quantity', label: 'Kirim miqdori, dona', type: 'number', min: 1, required: true },
  { name: 'unit_cost', label: "Xarid narxi, bir dona (ixtiyoriy)", type: 'number', min: 0 },
  { name: 'supplier', label: 'Yetkazib beruvchi (ixtiyoriy)' },
  { name: 'note', label: 'Izoh (ixtiyoriy)', type: 'textarea' },
]

const linkBtn = 'font-semibold text-brand-ink hover:underline cursor-pointer'

function Tabs({ tab, setTab }) {
  return (
    <div className="flex gap-2" role="tablist">
      {[
        ['parts', 'Qismlar'],
        ['stock', 'Kirimlar tarixi'],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={`h-11 px-5 rounded-full border-[1.5px] cursor-pointer ${
            tab === key ? 'bg-brand border-brand text-white font-semibold' : 'bg-white border-[#CBD3CF] font-medium'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PartsTab({ tabs }) {
  const list = useList('/inventory/')
  const [editing, setEditing] = useState(null) // 'new' | qism
  const [receiving, setReceiving] = useState(null) // qism
  const isNew = editing === 'new'

  async function savePart(v) {
    const body = {
      name: v.name,
      sku: v.sku.trim(),
      description: v.description,
      price: v.price,
      min_quantity: Number(v.min_quantity),
      is_active: v.is_active,
    }
    if (isNew) await api.post('/inventory/', body)
    else await api.patch(`/inventory/${editing.id}/`, body)
    list.reload()
  }

  async function receive(v) {
    await api.post('/inventory/stock-in/', {
      part: receiving.id,
      quantity: Number(v.quantity),
      unit_cost: v.unit_cost === '' ? null : v.unit_cost,
      supplier: v.supplier,
      note: v.note,
    })
    list.reload()
  }

  const columns = [
    { label: 'Qism', primary: true, render: (r) => r.name },
    { label: 'Kod', render: (r) => r.sku },
    { label: "Narxi, so'm", render: (r) => formatMoney(r.price) },
    {
      label: 'Qoldiq',
      render: (r) => (
        <span
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
            r.is_low_stock ? 'bg-[#FDE8D8] text-[#9A3412]' : 'bg-[#DDF1EA] text-[#0B5A44]'
          }`}
        >
          {r.quantity} dona{r.is_low_stock ? ', tugayapti' : ''}
        </span>
      ),
    },
    {
      label: '',
      render: (r) => (
        <div className="flex gap-4">
          <button type="button" onClick={() => setReceiving(r)} className={linkBtn}>
            Kirim
          </button>
          <button type="button" onClick={() => setEditing(r)} className={linkBtn}>
            Tahrirlash
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Ombor"
        actionLabel="Qism qo'shish"
        onAction={() => setEditing('new')}
        tabs={tabs}
        list={list}
        searchPlaceholder="Qism nomi yoki kodi"
        columns={columns}
        empty="Qism topilmadi."
      />
      {editing && (
        <FormModal
          key={isNew ? 'new' : editing.id}
          title={isNew ? "Qism qo'shish" : 'Qismni tahrirlash'}
          note={isNew ? "Yangi qismning qoldig'i 0 bo'ladi. Ombor qoldig'i faqat \"Kirim\" orqali to'ldiriladi." : "Qoldiq bu yerda o'zgartirilmaydi, faqat \"Kirim\" va buyurtmalar orqali o'zgaradi."}
          fields={PART_FIELDS}
          initial={isNew ? null : editing}
          onSubmit={savePart}
          onClose={() => setEditing(null)}
        />
      )}
      {receiving && (
        <FormModal
          key={`in-${receiving.id}`}
          title={`Omborga kirim: ${receiving.name}`}
          note={`Hozirgi qoldiq: ${receiving.quantity} dona`}
          fields={STOCK_FIELDS}
          onSubmit={receive}
          submitLabel="Kirim qilish"
          onClose={() => setReceiving(null)}
        />
      )}
    </>
  )
}

function StockTab({ tabs }) {
  const list = useList('/inventory/stock-in/')
  const columns = [
    { label: 'Qism', primary: true, render: (r) => r.part_name },
    { label: 'Miqdor', render: (r) => `+${r.quantity} dona` },
    { label: 'Yetkazib beruvchi', render: (r) => r.supplier || '—' },
    { label: 'Qabul qilgan', render: (r) => r.received_by_name || '—' },
    { label: 'Sana', render: (r) => formatDate(r.created_at) },
  ]
  return (
    <ListPage
      title="Ombor"
      tabs={tabs}
      list={list}
      searchPlaceholder="Qism yoki yetkazib beruvchi"
      columns={columns}
      empty="Hozircha kirim yo'q."
    />
  )
}

export default function Inventory() {
  const [tab, setTab] = useState('parts')
  const tabs = <Tabs tab={tab} setTab={setTab} />
  return tab === 'parts' ? <PartsTab tabs={tabs} /> : <StockTab tabs={tabs} />
}