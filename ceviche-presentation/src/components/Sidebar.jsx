import { NavLink } from 'react-router-dom'
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
} from '@heroicons/react/24/outline'

const links = [
  { to: '/admin', label: 'Dashboard', icon: HomeIcon, roles: ['Admin'] },
  { to: '/pos', label: 'Módulo POS', icon: ShoppingCartIcon, roles: ['Cajero', 'Mesero', 'Admin'] },
  { to: '/orders', label: 'Pedidos y Reservas', icon: ClipboardDocumentListIcon, roles: ['Admin', 'Mesero', 'Cocina'] },
  { to: '/inventory', label: 'Inventario', icon: CubeIcon, roles: ['Admin'] },
  { to: '/accounting', label: 'Contabilidad', icon: BanknotesIcon, roles: ['Admin'] },
  { to: '/reports', label: 'Reportería', icon: ChartBarIcon, roles: ['Admin'] },
  { to: '/users', label: 'Usuarios', icon: UsersIcon, roles: ['Admin'] },
  { to: '/promotions', label: 'Promociones', icon: GiftIcon, roles: ['Admin', 'Mesero'] },
  { to: '/cocina', label: 'Cocina', icon: FireIcon, roles: ['Cocina'] },
  { to: '/portal', label: 'Portal Cliente', icon: GlobeAltIcon, roles: ['Guest', 'Cliente', 'Admin'] },
]

export default function Sidebar() {
  const role = localStorage.getItem('role') || 'Guest'
  const filteredLinks = links.filter(l => l.roles.includes(role) || l.roles.includes('Guest'))

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white min-h-full">
        <div className="p-4 border-b border-white/10">
          <div className="text-xs uppercase tracking-wider text-cyan-300/70 font-medium">
            Navegación
          </div>
          <div className="text-sm text-cyan-200 mt-1">
            Rol: <span className="font-semibold">{role}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-cyan-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <l.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-cyan-300/50">
          <div>Ceviche del Rey © 2025</div>
          <div>SC-702 - Universidad Fidélitas</div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-white/10 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {filteredLinks.slice(0, 5).map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all ${
                  isActive
                    ? 'text-cyan-300'
                    : 'text-white/60 hover:text-white'
                }`
              }
            >
              <l.icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">{l.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
