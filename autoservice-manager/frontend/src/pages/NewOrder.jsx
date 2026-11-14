import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { parseApiError } from '../api/errors'
import { createOrder } from '../api/orders'
import Button from '../components/Button'
import Field from '../components/Field'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { useAuth } from '../context/auth-context'

export default function NewOrder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isClient = user.role === 'client'

  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [vehiclesData, setVehiclesData] = useState(null) // { key, list }
  const [vehicleId, setVehicleId] = useState('')
  const [problem, setProblem] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Menejer/admin: mijozni qidirish
  useEffect(() => {
    if (isClient) return
    const timer = setTimeout(() => {
      api
        .get('/auth/users/', { params: { role: 'client', search: clientSearch } })
        .then((res) => setClients(res.data.results))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, isClient])

  // Tanlangan mijozning (yoki mijozning o'zining) avtomobillari
  const vehiclesKey = isClient ? 'me' : clientId
  useEffect(() => {
    if (!vehiclesKey) return
    let ignore = false
    const params = isClient ? {} : { owner: clientId }
    api
      .get('/vehicles/', { params })
      .then((res) => {
        if (!ignore) setVehiclesData({ key: vehiclesKey, list: res.data.results })
      })
      .catch(() => {
        if (!ignore) setVehiclesData({ key: vehiclesKey, list: [] })
      })
    return () => {
      ignore = true
    }
  }, [vehiclesKey, isClient, clientId])

  const vehicles = vehiclesData?.key === vehiclesKey ? vehiclesData.list : []
  const vehiclesLoaded = vehiclesData?.key === vehiclesKey
  const noVehicles = vehiclesKey && vehiclesLoaded && vehicles.length === 0

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      const payload = { vehicle: vehicleId, problem_description: problem }
      if (!isClient) payload.client = clientId
      const order = await createOrder(payload)
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      const parsed = parseApiError(err)
      setErrors(parsed.fields)
      setMessage(parsed.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link to="/orders" className="text-[15px] font-semibold text-brand-ink hover:underline">
          &larr; Buyurtmalar
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold">
          {isClient ? "Ta'mirlashga so'rov yuborish" : 'Yangi buyurtma'}
        </h1>
        {isClient && (
          <p className="text-muted">So'rovingizni menejer ko'rib chiqib, ustaga biriktiradi.</p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-line p-6 flex flex-col gap-5">
        {!isClient && (
          <div className="flex flex-col gap-3">
            <Field
              label="Mijozni qidiring"
              id="client-search"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Ism, login yoki telefon"
            />
            <Select
              label="Mijoz"
              id="client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setVehicleId('')
              }}
              error={errors.client}
              required
            >
              <option value="">Mijozni tanlang</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.username}
                  {c.phone ? `, ${c.phone}` : ''}
                </option>
              ))}
            </Select>
          </div>
        )}

        <Select
          label="Avtomobil"
          id="vehicle"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          disabled={!vehiclesKey || vehicles.length === 0}
          error={errors.vehicle}
          required
        >
          <option value="">
            {!vehiclesKey ? 'Avval mijozni tanlang' : 'Avtomobilni tanlang'}
          </option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}, {v.plate_number}
            </option>
          ))}
        </Select>

        {noVehicles && (
          <p className="rounded-xl bg-[#FEF3E2] px-4 py-3 text-[#6B3A00]">
            {isClient ? "Sizda hali avtomobil yo'q. " : "Bu mijozning avtomobili yo'q. "}
            <Link to="/vehicles" className="font-semibold underline">
              Avtomobil qo'shish
            </Link>
          </p>
        )}

        <Textarea
          label="Muammo tavsifi"
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Masalan: motor g'alati ovoz chiqaryapti, tormoz yumshoq"
          error={errors.problem_description}
          required
        />

        {message && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {message}
          </p>
        )}

        <Button type="submit" disabled={submitting || !vehicleId || (!isClient && !clientId)} className="h-14 text-[17px]">
          {submitting ? 'Yuborilmoqda...' : isClient ? "So'rov yuborish" : 'Buyurtma yaratish'}
        </Button>
      </form>
    </div>
  )
}