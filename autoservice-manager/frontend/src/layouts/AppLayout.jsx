import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/auth-context'
import { NAV } from '../utils/nav'
import { ROLE_LABELS } from '../utils/roles'

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 h-11.5 px-3 rounded-[10px] text-[15px] ${
    isActive ? 'bg-brand-soft text-brand-ink font-semibold' : 'text-[#3F4F53] font-medium hover:bg-page'
  }`

const bottomLink = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 text-xs ${
    isActive ? 'text-brand-ink font-bold' : 'text-[#4A5A5E]'
  }`

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9.5 h-9.5 rounded-[10px] bg-brand flex items-center justify-center text-white">
        <Icon name="vehicles" />
      </div>
      <span className="text-lg font-bold">AutoService</span>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const items = NAV[user.role] || []
  const name = user.first_name || user.username

  return (
    <div className="min-h-screen flex bg-page">
      {/* Katta ekran: chap menyu */}
      <aside className="hidden lg:flex w-62 shrink-0 flex-col gap-6 border-r border-line bg-white px-4 py-6 sticky top-0 h-screen">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Asosiy menyu" className="flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={sideLink}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-1 rounded-xl bg-page p-2">
          <Link to="/profile" className="min-w-0 flex-1 flex items-center gap-2.5 rounded-lg p-1 hover:bg-white">
            <div className="w-9.5 h-9.5 shrink-0 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold">
              {name[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="truncate text-[15px] font-semibold">{name}</span>
              <span className="text-[13px] text-muted">{ROLE_LABELS[user.role]}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            aria-label="Chiqish"
            title="Chiqish"
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-white"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Kichik ekran: yuqori panel */}
        <header className="lg:hidden flex items-center justify-between bg-white border-b border-line px-4 h-16">
          <Logo />
          <div className="flex items-center">
            <Link to="/profile" aria-label="Profil" className="rounded-lg p-2 text-muted">
              <Icon name="profile" />
            </Link>
            <button onClick={logout} aria-label="Chiqish" className="cursor-pointer rounded-lg p-2 text-muted">
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:px-9 lg:py-7 lg:pb-7">
          <Outlet />
        </main>
      </div>

      {/* Kichik ekran: pastki menyu (birinchi 4 bo'lim) */}
      <nav
        aria-label="Pastki menyu"
        className="lg:hidden fixed bottom-0 inset-x-0 z-10 h-17 grid bg-white border-t border-line"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
      >
        {items.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to} className={bottomLink}>
            <Icon name={item.icon} size={24} />
            <span className="truncate px-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}