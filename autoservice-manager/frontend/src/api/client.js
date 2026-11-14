import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Tokenlar brauzerning localStorage xotirasida saqlanadi
export const tokens = {
  get access() {
    return localStorage.getItem('access')
  },
  get refresh() {
    return localStorage.getItem('refresh')
  },
  set(access, refresh) {
    localStorage.setItem('access', access)
    if (refresh) localStorage.setItem('refresh', refresh)
  },
  clear() {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
  },
}

const api = axios.create({ baseURL: API_URL })

// Har so'rovga tokenni qo'shamiz
api.interceptors.request.use((config) => {
  const token = tokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// access muddati tugasa, refresh orqali yangilab, so'rovni qaytaramiz
let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const url = original?.url || ''
    const isAuthCall = url.includes('/auth/login/') || url.includes('/auth/token/refresh/')

    if (status === 401 && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios
            .post(`${API_URL}/auth/token/refresh/`, { refresh: tokens.refresh })
            .finally(() => {
              refreshing = null
            })
        const { data } = await refreshing
        tokens.set(data.access, data.refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        // refresh ham eskirgan: tizimdan chiqaramiz
        tokens.clear()
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(error)
  },
)

export default api