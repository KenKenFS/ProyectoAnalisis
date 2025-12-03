import { Link } from 'react-router-dom'
import {
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  GiftIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { menuItems, inventory, orders, users, promotions, reservations, transactions } from '../data/fakeData'

const modules = [
  { icon: ShoppingCartIcon, name: 'POS', path: '/pos', desc: 'Gestión de ventas y cobros', color: 'from-blue-500 to-blue-600' },
  { icon: ClipboardDocumentListIcon, name: 'Pedidos', path: '/orders', desc: 'Órdenes y reservas', color: 'from-emerald-500 to-green-600' },
  { icon: CubeIcon, name: 'Inventario', path: '/inventory', desc: 'Stock y catálogo', color: 'from-purple-500 to-violet-600' },
  { icon: BanknotesIcon, name: 'Contabilidad', path: '/accounting', desc: 'Finanzas y transacciones', color: 'from-amber-500 to-orange-600' },
  { icon: ChartBarIcon, name: 'Reportes', path: '/reports', desc: 'Análisis y gráficos', color: 'from-indigo-500 to-blue-600' },
  { icon: UsersIcon, name: 'Usuarios', path: '/users', desc: 'Gestión de personal', color: 'from-pink-500 to-rose-600' },
  { icon: GiftIcon, name: 'Promociones', path: '/promotions', desc: 'Ofertas y descuentos', color: 'from-orange-500 to-red-500' },
  { icon: GlobeAltIcon, name: 'Portal Cliente', path: '/portal', desc: 'Reservas y menú público', color: 'from-cyan-500 to-teal-600' },
]

export default function Dashboard() {
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const lowStockItems = inventory.filter(i => i.qty <= i.minQty).length
  const activeUsers = users.filter(u => u.status === 'Activo').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-poppins">Dashboard Administrativo</h1>
        <p className="text-gray-600 mt-1">Bienvenido a Ceviche del Rey — Vista general del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm font-medium">Ventas Hoy</div>
              <div className="text-3xl font-bold mt-1">₡47,600</div>
            </div>
            <ArrowTrendingUpIcon className="w-10 h-10 text-blue-200" />
          </div>
          <div className="text-blue-100 text-xs mt-2">+12% vs ayer</div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500 to-green-600 text-white p-4 shadow-lg shadow-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium">Pedidos Pendientes</div>
              <div className="text-3xl font-bold mt-1">{pendingOrders}</div>
            </div>
            <ClockIcon className="w-10 h-10 text-green-200" />
          </div>
          <div className="text-green-100 text-xs mt-2">{orders.length} totales hoy</div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-violet-600 text-white p-4 shadow-lg shadow-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-100 text-sm font-medium">Items en Menú</div>
              <div className="text-3xl font-bold mt-1">{menuItems.length}</div>
            </div>
            <CubeIcon className="w-10 h-10 text-purple-200" />
          </div>
          <div className="text-purple-100 text-xs mt-2">5 categorías</div>
        </div>

        <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-lg shadow-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-orange-100 text-sm font-medium">Usuarios Activos</div>
              <div className="text-3xl font-bold mt-1">{activeUsers}</div>
            </div>
            <UsersIcon className="w-10 h-10 text-orange-200" />
          </div>
          <div className="text-orange-100 text-xs mt-2">{users.length} totales</div>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 font-poppins">Módulos del Sistema</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules.map(m => (
            <Link key={m.name} to={m.path}>
              <div className="card bg-white border border-gray-100 p-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                  <m.icon className="w-6 h-6 text-white" />
                </div>
                <div className="font-semibold text-gray-800 group-hover:text-primary transition-colors">{m.name}</div>
                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Alerts */}
        <div className="lg:col-span-2 card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-800">Alertas de Inventario</h3>
            {lowStockItems > 0 && (
              <span className="badge badge-warning badge-sm">{lowStockItems} alertas</span>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {inventory.map(i => (
              <div
                key={i.id}
                className={`p-3 rounded-lg flex justify-between items-center ${
                  i.qty <= i.minQty
                    ? 'bg-red-50 border border-red-200'
                    : i.qty < 20
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <div>
                  <div className="font-medium text-gray-800">{i.name}</div>
                  <div className="text-xs text-gray-500">Mín: {i.minQty} {i.unit}</div>
                </div>
                <div className={`text-right font-bold ${i.qty <= i.minQty ? 'text-red-600' : i.qty < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                  {i.qty} {i.unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Reservations */}
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">Próximas Reservas</h3>
          </div>
          <div className="space-y-3">
            {reservations.slice(0, 4).map(r => (
              <div key={r.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-primary">
                <div className="font-medium text-gray-800">{r.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {r.date} — {r.time}
                </div>
                <div className="text-xs text-gray-500">{r.guests} personas</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <BanknotesIcon className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-800">Últimas Transacciones</h3>
          </div>
          <div className="space-y-2">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center p-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-700">{t.desc}</div>
                  <div className="text-xs text-gray-400">{t.date}</div>
                </div>
                <div className={`font-bold ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'ingreso' ? '+' : ''} ₡{Math.abs(t.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Promotions */}
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <GiftIcon className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold text-gray-800">Promociones Activas</h3>
          </div>
          <div className="space-y-2">
            {promotions.filter(p => p.active).map(p => (
              <div key={p.id} className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{p.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
                  </div>
                  <span className="badge bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                    {p.discount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
