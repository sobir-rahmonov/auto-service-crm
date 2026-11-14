import { useState } from 'react'
import api from '../api/client'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import { useAuth } from '../context/auth-context'
import useList from '../hooks/useList'

export default function Vehicles() {
  const { user } = useAuth()
  const isStaff = user.role !== 'client'
  const list = useList('/vehicles/')
  const [editing, setEditing] = useState(null) // null | 'new' | avtomobil

  const isNew = editing === 'new'
  const fields = [
    { name: 'owner', label: 'Mijoz', type: 'client', hidden: !isStaff || !isNew },
    { name: 'brand', label: 'Marka (masalan, Chevrolet)', required: true },
    { name: 'model', label: 'Model (masalan, Nexia 3)', required: true },
    { name: 'year', label: 'Ishlab chiqarilgan yili', type: 'number', min: 1900, max: 2100, required: true },
    { name: 'plate_number', label: 'Davlat raqami', required: true },
    { name: 'vin', label: 'VIN (ixtiyoriy)', maxLength: 17 },
    { name: 'color', label: 'Rangi (ixtiyoriy)' },
    { name: 'mileage', label: 'Yurgan masofa, km', type: 'number', min: 0, default: 0 },
  ]

  async function save(v) {
    const body = {
      brand: v.brand,
      model: v.model,
      year: Number(v.year),
      plate_number: v.plate_number.toUpperCase().trim(),
      vin: v.vin.trim() || null,
      color: v.color,
      mileage: Number(v.mileage || 0),
    }
    if (isNew) {
      if (isStaff) body.owner = v.owner
      await api.post('/vehicles/', body)
    } else {
      await api.patch(`/vehicles/${editing.id}/`, body)
    }
    list.reload()
  }

  const columns = [
    { label: 'Avtomobil', primary: true, render: (r) => `${r.brand} ${r.model}, ${r.year}` },
    { label: 'Davlat raqami', render: (r) => r.plate_number },
    ...(isStaff ? [{ label: 'Egasi', render: (r) => r.owner_name }] : []),
    { label: 'Yurgan masofa', render: (r) => `${new Intl.NumberFormat('ru-RU').format(r.mileage)} km` },
    ...(isStaff
      ? [
          {
            label: '',
            render: (r) => (
              <button type="button" onClick={() => setEditing(r)} className="font-semibold text-brand-ink hover:underline cursor-pointer">
                Tahrirlash
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <ListPage
        title={isStaff ? 'Avtomobillar' : 'Mening avtomobillarim'}
        actionLabel="Avtomobil qo'shish"
        onAction={() => setEditing('new')}
        list={list}
        searchPlaceholder="Raqam, marka, model yoki VIN"
        columns={columns}
        empty="Avtomobil topilmadi."
      />
      {editing && (
        <FormModal
          key={isNew ? 'new' : editing.id}
          title={isNew ? "Avtomobil qo'shish" : 'Avtomobilni tahrirlash'}
          fields={fields}
          initial={isNew ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}