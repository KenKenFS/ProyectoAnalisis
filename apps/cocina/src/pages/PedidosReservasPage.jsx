import { useState } from 'react'
import {
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  XMarkIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'badge-ghost', bg: 'bg-gray-50' },
  preparing: { label: 'En preparacion', color: 'badge-warning', bg: 'bg-amber-50' },
  ready: { label: 'Listo', color: 'badge-success', bg: 'bg-green-50' },
}

const ordersData = [
  {
    id: 'ORD-001',
    table: 3,
    items: [
      { name: 'Ceviche Mixto', qty: 2 },
      { name: 'Coca Cola', qty: 2 },
    ],
    status: 'ready',
    time: '14:32',
    total: 29000,
  },
  {
    id: 'ORD-002',
    table: 1,
    items: [
      { name: 'Limonada', qty: 2 },
      { name: 'Ceviche Pescado', qty: 1 },
    ],
    status: 'ready',
    time: '14:15',
    total: 11550,
  },
  {
    id: 'ORD-003',
    table: 5,
    items: [
      { name: 'Ceviche de Camaron', qty: 1 },
      { name: 'Tostones', qty: 1 },
    ],
    status: 'preparing',
    time: '14:35',
    total: 18000,
  },
  {
    id: 'ORD-004',
    table: 7,
    items: [
      { name: 'Causa Limena', qty: 1 },
    ],
    status: 'pending',
    time: '14:40',
    total: 8500,
  },
]

const reservationsData = [
  {
    id: 'RES-001',
    name: 'Carlos Gonzalez',
    date: '15 Ene 2026',
    time: '19:00',
    guests: 4,
    phone: '+506 8234-5678',
  },
  {
    id: 'RES-002',
    name: 'Maria Lopez',
    date: '15 Ene 2026',
    time: '20:30',
    guests: 2,
    phone: '+506 7654-3210',
  },
  {
    id: 'RES-003',
    name: 'Juan Perez',
    date: '16 Ene 2026',
    time: '18:30',
    guests: 6,
    phone: '+506 8765-4321',
  },
]

export default function PedidosReservasPage() {
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orders] = useState(ordersData)
  const [reservations] = useState(reservationsData)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-8 h-8 text-cyan-600" />
          Pedidos y Reservas
        </h1>
        <p className="text-gray-600 text-sm">Gestion de ordenes activas y reservaciones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ClipboardDocumentListIcon className="w-5 h-5" />
          Pedidos
          <span className={`badge ${activeTab === 'orders' ? 'bg-white/20 text-white' : 'badge-ghost'}`}>
            {orders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'reservations'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CalendarDaysIcon className="w-5 h-5" />
          Reservas
          <span className={`badge ${activeTab === 'reservations' ? 'bg-white/20 text-white' : 'badge-ghost'}`}>
            {reservations.length}
          </span>
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-300 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <ClockIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
              <div className="text-3xl font-bold text-gray-700">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-500">Pendientes</div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <FireIcon className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <div className="text-3xl font-bold text-amber-700">
                {orders.filter(o => o.status === 'preparing').length}
              </div>
              <div className="text-sm text-amber-600">En preparacion</div>
            </div>
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <CheckCircleIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <div className="text-3xl font-bold text-green-700">
                {orders.filter(o => o.status === 'ready').length}
              </div>
              <div className="text-sm text-green-600">Listos</div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mesa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Hora</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={`${statusConfig[o.status].bg} hover:bg-opacity-75 transition-colors border-b border-gray-200`}>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-800">{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                            {o.table}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.items.map((i, idx) => (
                          <span key={idx}>
                            {i.qty}x {i.name}
                            {idx < o.items.length - 1 && ', '}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 text-sm">
                          <ClockIcon className="w-4 h-4" />
                          {o.time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
                          o.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                          o.status === 'preparing' ? 'bg-amber-200 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {o.status === 'pending' && <ClockIcon className="w-4 h-4" />}
                          {o.status === 'preparing' && <FireIcon className="w-4 h-4" />}
                          {o.status === 'ready' && <CheckCircleIcon className="w-4 h-4" />}
                          {statusConfig[o.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">₡{o.total.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reservations Tab */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {/* Add Reservation Button */}
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              <CalendarDaysIcon className="w-5 h-5" />
              Nueva Reserva
            </button>
          </div>

          {/* Reservations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservations.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{r.name}</h3>
                      <span className="text-xs text-gray-500 font-mono">{r.id}</span>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      Confirmada
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mt-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                      <span>{r.date} - {r.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <UserGroupIcon className="w-4 h-4 text-blue-600" />
                      <span>{r.guests} personas</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <PhoneIcon className="w-4 h-4 text-blue-600" />
                      <span>{r.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirmar
                    </button>
                    <button className="flex-1 border border-red-300 hover:bg-red-50 text-red-600 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <XCircleIcon className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xl">Detalle del Pedido</h3>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="hover:bg-white/20 p-1 rounded transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">ID:</span>
                <span className="font-mono font-bold text-gray-800">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Mesa:</span>
                <span className="font-bold text-lg text-gray-800">{selectedOrder.table}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Estado:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
                  selectedOrder.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                  selectedOrder.status === 'preparing' ? 'bg-amber-200 text-amber-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {statusConfig[selectedOrder.status].label}
                </span>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Items:</h4>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-700">{item.qty}x {item.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="font-semibold text-gray-800">Total:</span>
                <span className="font-bold text-xl text-blue-600">
                  ₡{selectedOrder.total.toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2 mt-6">
                <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <FireIcon className="w-4 h-4" />
                  En preparacion
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  Marcar listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
