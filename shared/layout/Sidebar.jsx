import { NavLink } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import {
  HomeIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  GiftIcon,
  FireIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  TableCellsIcon,
  LockClosedIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

const iconMap = {
  HomeIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  GiftIcon,
  FireIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  TableCellsIcon,
  LockClosedIcon,
  CalendarDaysIcon,
}

export default function Sidebar({ links = [], appName = 'Sistema', extraContent = null }) {
  const { role } = useAuth()
  const displayRole = role || localStorage.getItem('role') || 'Guest'

  const filteredLinks = links.filter(l => {
    if (!l.roles || l.roles.length === 0) return true
    return l.roles.includes(displayRole) || l.roles.includes('Admin')
  })

  const getIcon = (iconName) => {
    return iconMap[iconName] || HomeIcon
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white min-h-full dark:border-r dark:border-zinc-800/80 dark:from-zinc-950 dark:to-zinc-950">
        <div className="p-4 border-b border-white/10 dark:border-zinc-800/90">
          <div className="text-xs uppercase tracking-wider text-cyan-300/70 font-medium dark:text-zinc-500">
            Navegacion
          </div>
          <div className="text-sm text-cyan-200 mt-1 dark:text-zinc-400">
            Rol: <span className="font-semibold">{displayRole}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredLinks.map(l => {
            const IconComponent = getIcon(l.icon)
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-all duration-200 ${
                    isActive
                      ? 'border-transparent bg-primary text-white shadow-lg shadow-primary/30 dark:border-red-800/90 dark:bg-zinc-900/95 dark:text-zinc-50 dark:shadow-inner dark:shadow-black/20'
                      : 'border-transparent text-cyan-100 hover:bg-white/10 hover:text-white dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200'
                  }`
                }
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{l.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {extraContent && (
          <div className="p-3 border-t border-white/10 dark:border-zinc-800/90">
            {extraContent}
          </div>
        )}

        <div className="p-4 border-t border-white/10 text-xs text-cyan-300/50 dark:border-zinc-800/90 dark:text-zinc-500">
          <div>Ceviche del Rey - 2026</div>
          <div>SC-702 - Universidad Fidelitas</div>
          <div className="mt-1">v1.0.0</div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-white/10 safe-area-inset-bottom dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex justify-around items-center h-16 px-2">
          {filteredLinks.slice(0, 5).map(l => {
            const IconComponent = getIcon(l.icon)
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all ${
                    isActive
                      ? 'text-cyan-300 dark:text-red-500/85'
                      : 'text-white/60 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-300'
                  }`
                }
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 truncate max-w-[60px]">{l.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
