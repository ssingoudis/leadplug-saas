import { LayoutDashboard, Layers, Inbox, BarChart2, CreditCard } from 'lucide-react'

// Aufgabe 44: Eine Quelle für die App-Navigation (Side-Nav Desktop + Mobile-Drawer).
// Ersetzt die früheren TABS (TabNav.tsx) + TAB_ICONS (DashboardHeader.tsx).

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number }>
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',             icon: LayoutDashboard },
  { label: 'Meine Funnels', href: '/dashboard/funnels',     icon: Layers },
  { label: 'Leads',         href: '/dashboard/leads',       icon: Inbox },
  { label: 'Statistiken',   href: '/dashboard/statistiken', icon: BarChart2 },
  { label: 'Billing',       href: '/dashboard/billing',     icon: CreditCard },
]

// Aktiv-Logik: Funnels matcht per Prefix (Editor liegt unter /dashboard/funnels/*),
// alle anderen exakt.
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === '/dashboard/funnels'
    ? pathname.startsWith('/dashboard/funnels')
    : pathname === href
}
