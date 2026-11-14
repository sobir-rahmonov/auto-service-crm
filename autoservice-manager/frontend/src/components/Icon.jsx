const PATHS = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  orders: 'M9 4h6v3H9zM7 5H5v15h14V5h-2M8 12h8M8 16h5',
  vehicles: 'M3 14l2-6h14l2 6v4h-3v-2H6v2H3zM6 14h12',
  clients: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 6a3 3 0 010 6M21 19c0-2-1-3-3-4',
  services: 'M14 6a4 4 0 005 5l-9 9a2 2 0 01-3-3l9-9a4 4 0 00-2-2z',
  inventory: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  payments: 'M3 6h18v12H3zM3 10h18M7 15h4',
  reports: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  users: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  requests: 'M4 7h16M4 12h16M4 17h10',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  plus: 'M12 5v14M5 12h14',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
}

export default function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}