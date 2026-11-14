import { PAGE_SIZE } from '../hooks/useList'

export default function Pagination({ count, page, setPage }) {
  if (count <= PAGE_SIZE) return null
  const pages = Math.ceil(count / PAGE_SIZE)
  const btn =
    'h-11 px-5 rounded-xl border-[1.5px] border-[#CBD3CF] bg-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  return (
    <nav aria-label="Sahifalar" className="flex items-center justify-between gap-3">
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={btn}>
        Oldingi
      </button>
      <span className="text-muted">
        {page} / {pages} sahifa, jami {count} ta
      </span>
      <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={btn}>
        Keyingi
      </button>
    </nav>
  )
}