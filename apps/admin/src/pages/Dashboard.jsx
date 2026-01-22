import { Link } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  GiftIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// DATOS DE MÓDULOS
const modules = [
  { icon: ClipboardDocumentListIcon, name: 'Pedidos', path: '/orders', desc: 'Órdenes y reservas', color: 'from-emerald-500 to-green-600' },
  { icon: CubeIcon, name: 'Inventario', path: '/inventory', desc: 'Stock y catálogo', color: 'from-purple-500 to-violet-600' },
  { icon: BanknotesIcon, name: 'Contabilidad', path: '/accounting', desc: 'Finanzas y transacciones', color: 'from-amber-500 to-orange-600' },
  { icon: ChartBarIcon, name: 'Reportes', path: '/reports', desc: 'Análisis y gráficos', color: 'from-indigo-500 to-blue-600' },
  { icon: UsersIcon, name: 'Usuarios', path: '/users', desc: 'Gestión de personal', color: 'from-pink-500 to-rose-600' },
  { icon: GiftIcon, name: 'Promociones', path: '/promotions', desc: 'Ofertas y descuentos', color: 'from-orange-500 to-red-500' },
  { icon: GlobeAltIcon, name: 'Portal Cliente', path: '/portal', desc: 'Reservas y menú público', color: 'from-cyan-500 to-teal-600' },
]

// DATOS DE ÓRDENES
const orders = [
  { id: 'ORD-001', table: 5, total: 12500, status: 'pending', items: 3, time: '5 min' },
  { id: 'ORD-002', table: 8, total: 28900, status: 'completed', items: 5, time: '15 min' },
  { id: 'ORD-003', table: 12, total: 45600, status: 'pending', items: 7, time: '3 min' },
  { id: 'ORD-004', table: 2, total: 18900, status: 'completed', items: 4, time: '20 min' },
  { id: 'ORD-005', table: 7, total: 35200, status: 'pending', items: 6, time: '8 min' },
]

// DATOS DE INVENTARIO
const inventory = [
  { id: 1, name: 'Camarones', qty: 15, minQty: 5, category: 'Proteína' },
  { id: 2, name: 'Limón', qty: 3, minQty: 10, category: 'Frutas' },
  { id: 3, name: 'Cebolla', qty: 45, minQty: 20, category: 'Vegetales' },
  { id: 4, name: 'Cilantro', qty: 8, minQty: 5, category: 'Hierbas' },
  { id: 5, name: 'Ají Rojo', qty: 120, minQty: 30, category: 'Vegetales' },
  { id: 6, name: 'Tomate', qty: 25, minQty: 15, category: 'Vegetales' },
]

// DATOS DE USUARIOS
const users = [
  { id: 1, name: 'Juan Pérez', role: 'Admin', status: 'Activo' },
  { id: 2, name: 'María García', role: 'Mesero', status: 'Activo' },
  { id: 3, name: 'Carlos López', role: 'Cocina', status: 'Activo' },
  { id: 4, name: 'Ana Rodríguez', role: 'Cajero', status: 'Inactivo' },
]

// DATOS DE MENÚ
const menuItems = [
  { id: 1, name: 'Ceviche Clásico', category: 'Ceviches', price: 12500 },
  { id: 2, name: 'Ceviche Mixto', category: 'Ceviches', price: 18900 },
  { id: 3, name: 'Ceviche de Camarones', category: 'Ceviches', price: 16500 },
  { id: 4, name: 'Tiradito', category: 'Tiraditos', price: 14200 },
  { id: 5, name: 'Leche de Tigre', category: 'Bebidas', price: 4500 },
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

      {/* Alerts */}
      {lowStockItems > 0 && (
        <div className="alert alert-warning shadow-lg">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>
            Hay <strong>{lowStockItems}</strong> {lowStockItems === 1 ? 'artículo' : 'artículos'} con stock crítico. <a href="/inventory" className="link font-semibold">Ver inventario</a>
          </span>
        </div>
      )}
    </div>
  )
}
