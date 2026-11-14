import { useEffect, useState } from 'react'
import api from '../api/client'

export const PAGE_SIZE = 10

// Sahifalangan ro'yxat: qidiruv, sahifa va qayta yuklash bilan
export default function useList(url, fixedParams) {
  const fixedKey = JSON.stringify(fixedParams || {})
  const [searchText, setSearchText] = useState('')
  const [query, setQuery] = useState({ search: '', page: 1 })
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const key = `${url}|${fixedKey}|${JSON.stringify(query)}|${reloadKey}`
  const loading = !data || data.key !== key

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((q) => (q.search === searchText ? q : { search: searchText, page: 1 }))
    }, 350)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    let ignore = false
    const params = { ...JSON.parse(fixedKey), page: query.page }
    if (query.search) params.search = query.search

    api
      .get(url, { params })
      .then((res) => {
        if (ignore) return
        setError('')
        setData({ key, count: res.data.count, results: res.data.results })
      })
      .catch(() => {
        if (ignore) return
        setError("Ma'lumotni yuklab bo'lmadi. Qayta urinib ko'ring.")
        setData({ key, count: 0, results: [] })
      })
    return () => {
      ignore = true
    }
  }, [url, fixedKey, query, key])

  return {
    items: data?.results ?? [],
    count: data?.count ?? 0,
    loading,
    error,
    searchText,
    setSearchText,
    page: query.page,
    setPage: (page) => setQuery((q) => ({ ...q, page })),
    reload: () => setReloadKey((k) => k + 1),
  }
}