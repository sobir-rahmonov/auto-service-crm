import { useState } from 'react'
import api from '../api/client'
import FormModal from '../components/FormModal'
import ListPage from '../components/ListPage'
import useList from '../hooks/useList'
import { ROLE_LABELS } from '../utils/roles'

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export default function Users() {
  const [role, setRole] = useState('')
  const list = useList('/auth/users/', role ? { role } : {})
  const [editing, setEditing] = useState(null)
  const isNew = editing === 'new'

  const fields = [
    { name: 'first_name', label: 'Ism' },
    { name: 'last_name', label: 'Familiya' },
    { name: 'username', label: 'Login', required: true, hidden: !isNew },
    { name: 'phone', label: 'Telefon' },
    { name: 'email', label: 'Email (ixtiyoriy)', type: 'email' },
    { name: 'role', label: 'Rol', type: 'select', required: true, options: ROLE_OPTIONS, default: 'mechanic' },
    { name: 'password', label: 'Vaqtincha parol', type: 'password', required: true, hidden: !isNew },
    { name: 'is_active', label: 'Hisob faol (o\'chirilsa, tizimga kira olmaydi)', type: 'checkbox', hidden: isNew },
  ]

  async function save(v) {
    if (isNew) {
      await api.post('/auth/users/', v)
    } else {
      await api.patch(`/auth/users/${editing.id}/`, {
        first_name: v.first_name,
        last_name: v.last_name,
        phone: v.phone,
        email: v.email,
        role: v.role,
        is_active: v.is_active,
      })
    }
    list.reload()
  }

  const columns = [
    {
      label: 'Foydalanuvchi',
      primary: true,
      render: (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username,
    },
    { label: 'Login', render: (r) => r.username },
    { label: 'Rol', render: (r) => ROLE_LABELS[r.role] },
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
        title="Foydalanuvchilar"
        actionLabel="Yangi foydalanuvchi"
        onAction={() => setEditing('new')}
        list={list}
        searchPlaceholder="Ism, login yoki telefon"
        columns={columns}
        empty="Foydalanuvchi topilmadi."
        filters={
          <label className="block">
            <span className="sr-only">Rol bo'yicha</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                list.setPage(1)
              }}
              className="h-12 px-3 rounded-xl border-[1.5px] border-[#8FA09C] bg-white"
            >
              <option value="">Hamma rollar</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        }
      />
      {editing && (
        <FormModal
          key={isNew ? 'new' : editing.id}
          title={isNew ? 'Yangi foydalanuvchi' : 'Foydalanuvchini tahrirlash'}
          note={isNew ? 'Loginni va vaqtincha parolni xodimga o\'zingiz aytasiz. Rol uning ekranlarini belgilaydi.' : undefined}
          fields={fields}
          initial={isNew ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}