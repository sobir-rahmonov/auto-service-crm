import api, { tokens } from './client'

export async function getProfile() {
  const { data } = await api.get('/auth/profile/')
  return data
}

// Login: tokenlarni saqlaydi va foydalanuvchi ma'lumotini (rol bilan) qaytaradi
export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password })
  tokens.set(data.access, data.refresh)
  return getProfile()
}

export async function register(payload) {
  const { data } = await api.post('/auth/register/', payload)
  return data
}