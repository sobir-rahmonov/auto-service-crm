const DASHBOARD = { to: '/dashboard', label: 'Bosh sahifa', icon: 'dashboard' }

export const NAV = {
  admin: [
    DASHBOARD,
    { to: '/orders', label: 'Buyurtmalar', icon: 'orders' },
    { to: '/vehicles', label: 'Avtomobillar', icon: 'vehicles' },
    { to: '/clients', label: 'Mijozlar', icon: 'clients' },
    { to: '/services', label: 'Xizmatlar', icon: 'services' },
    { to: '/inventory', label: 'Ombor', icon: 'inventory' },
    { to: '/part-requests', label: "Qism so'rovlari", icon: 'requests' },
    { to: '/payments', label: "To'lovlar", icon: 'payments' },
    { to: '/reports', label: 'Hisobotlar', icon: 'reports' },
    { to: '/users', label: 'Foydalanuvchilar', icon: 'users' },
  ],
  manager: [
    DASHBOARD,
    { to: '/orders', label: 'Buyurtmalar', icon: 'orders' },
    { to: '/vehicles', label: 'Avtomobillar', icon: 'vehicles' },
    { to: '/clients', label: 'Mijozlar', icon: 'clients' },
    { to: '/services', label: 'Xizmatlar', icon: 'services' },
    { to: '/inventory', label: 'Ombor', icon: 'inventory' },
    { to: '/part-requests', label: "Qism so'rovlari", icon: 'requests' },
    { to: '/payments', label: "To'lovlar", icon: 'payments' },
    { to: '/reports', label: 'Hisobotlar', icon: 'reports' },
  ],
  mechanic: [
    DASHBOARD,
    { to: '/orders', label: 'Mening buyurtmalarim', icon: 'orders' },
    { to: '/part-requests', label: "Qism so'rovlari", icon: 'requests' },
  ],
  client: [
    DASHBOARD,
    { to: '/orders', label: 'Buyurtmalarim', icon: 'orders' },
    { to: '/vehicles', label: 'Avtomobillarim', icon: 'vehicles' },
    { to: '/payments', label: 'Hisoblar', icon: 'payments' },
  ],
}