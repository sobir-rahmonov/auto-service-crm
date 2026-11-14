import DataList from './DataList'
import Icon from './Icon'
import Pagination from './Pagination'

export default function ListPage({ title, actionLabel, onAction, list, searchPlaceholder, columns, empty, filters, tabs, notice }) {
  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-brand text-white font-semibold cursor-pointer hover:bg-brand-ink"
          >
            <Icon name="plus" size={18} />
            {actionLabel}
          </button>
        )}
      </header>

      {tabs}
      {notice}

      <div className="flex flex-wrap items-center gap-3">
        <label className="block">
          <span className="sr-only">Qidirish</span>
          <input
            type="search"
            value={list.searchText}
            onChange={(e) => list.setSearchText(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 w-full sm:w-96 px-4 rounded-xl border-[1.5px] border-[#8FA09C] bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>
        {filters}
      </div>

      {list.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {list.error}
        </p>
      )}

      <section className={`rounded-2xl bg-white border border-line transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
        <DataList columns={columns} rows={list.items} empty={empty} loading={list.loading} />
      </section>

      <Pagination count={list.count} page={list.page} setPage={list.setPage} />
    </div>
  )
}