import { useState } from 'react'
import api from '../api/client'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import { useAuth } from '../context/auth-context'
import useList from '../hooks/useList'

const FIXED = { role: 'client' }

export default function Clients() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const list = useList('/auth/users/', FIXED)
  const [editing, setEditing] = useState(null)
  const isNew = editing === 'new'

  const fields = [
    { name: 'first_name', label: 'Ism' },
    { name: 'last_name', label: 'Familiya' },
    { name: 'username', label: 'Login', required: true, hidden: !isNew },
    { name: 'phone', label: 'Telefon', },
    { name: 'email', label: 'Email (ixtiyoriy)', type: 'email' },
    { name: 'password', label: 'Parol', type: 'password', required: true, hidden: !isNew },
    { name: 'is_active', label: 'Hisob faol', type: 'checkbox', hidden: isNew || !isAdmin },
  ]

  async function save(v) {
    if (isNew) {
      await api.post('/auth/users/', { ...v, role: 'client' })
    } else {
      const body = { first_name: v.first_name, last_name: v.last_name, phone: v.phone, email: v.email }
      // Holatni faqat admin o'zgartiradi
      if (isAdmin) body.is_active = v.is_active
      await api.patch(`/auth/users/${editing.id}/`, body)
    }
    list.reload()
  }

  const columns = [
    {
      label: 'Mijoz',
      primary: true,
      render: (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username,
    },
    { label: 'Login', render: (r) => r.username },
    { label: 'Telefon', render: (r) => r.phone || '—' },
    {
      label: 'Holat',
      render: (r) => (
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${r.is_active === false ? 'bg-[#EEEEEE] text-[#4A4A4A]' : 'bg-[#DDF1EA] text-[#0B5A44]'}`}>
          {r.is_active === false ? 'Bloklangan' : 'Faol'}
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
        title="Mijozlar"
        actionLabel="Mijoz qo'shish"
        onAction={() => setEditing('new')}
        list={list}
        searchPlaceholder="Ism, login yoki telefon"
        columns={columns}
        empty="Mijoz topilmadi."
      />
      {editing && (
        <FormModal
          key={isNew ? 'new' : editing.id}
          title={isNew ? "Mijoz qo'shish" : 'Mijozni tahrirlash'}
          fields={fields}
          initial={isNew ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}