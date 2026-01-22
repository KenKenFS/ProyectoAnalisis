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
} from '@heroicons/react/24/outline'

const orders = [
  { id: 'ORD-001', table: 1, items: ['Ceviche clásico', 'Tostadas'], status: 'Listo', time: '5min', total: 12000 },
  { id: 'ORD-002', table: 2, items: ['Ceviche de camarón', 'Bebida'], status: 'Cocina', time: '8min', total: 15000 },
  { id: 'ORD-003', table: 3, items: ['Encebollado', 'Arroz', 'Cerveza'], status: 'Listo', time: '3min', total: 18000 },
  { id: 'ORD-004', table: 4, items: ['Ceviche mixto', 'Camote'], status: 'Pendiente', time: '12min', total: 22000 },
  { id: 'ORD-005', table: 5, items: ['Pulpo al ajillo', 'Limonada'], status: 'Listo', time: '2min', total: 16000 },
  { id: 'ORD-006', table: 6, items: ['Tiradito'], status: 'Cocina', time: '6min', total: 11000 },
  { id: 'ORD-007', table: 7, items: ['Causa limeña', 'Ensalada', 'Vino'], status: 'Listo', time: '4min', total: 19000 },
  { id: 'ORD-008', table: 8, items: ['Ceviche triple', 'Choclo', 'Maíz'], status: 'Pendiente', time: '10min', total: 25000 },
]

const reservations = [
  { id: 'RES-001', name: 'Carlos López', date: '2026-01-25', time: '19:30', guests: 4, phone: '8765-4321' },
  { id: 'RES-002', name: 'María Fernández', date: '2026-01-25', time: '20:00', guests: 2, phone: '8723-5678' },
  { id: 'RES-003', name: 'Juan Rodríguez', date: '2026-01-26', time: '18:00', guests: 6, phone: '8734-1234' },
  { id: 'RES-004', name: 'Ana Martínez', date: '2026-01-26', time: '20:30', guests: 3, phone: '8745-9876' },
  { id: 'RES-005', name: 'Pedro Gómez', date: '2026-01-27', time: '19:00', guests: 5, phone: '8756-5432' },
]

const statusConfig = {
  Pendiente: { label: 'Pendiente', color: 'badge-ghost', bg: 'bg-gray-50' },
  Cocina: { label: 'En Cocina', color: 'badge-warning', bg: 'bg-amber-50' },
  Listo: { label: 'Listo', color: 'badge-success', bg: 'bg-green-50' },
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrder, setSelectedOrder] = useState(null)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Pedidos y Reservas</h1>
        <p className="text-gray-600 text-sm">Gestión de órdenes activas y reservaciones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'orders'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
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
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
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
            <div className="card bg-gray-50 border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">
                {orders.filter(o => o.status === 'Pendiente').length}
              </div>
              <div className="text-xs text-gray-500">Pendientes</div>
            </div>
            <div className="card bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {orders.filter(o => o.status === 'Cocina').length}
              </div>
              <div className="text-xs text-amber-600">En Cocina</div>
            </div>
            <div className="card bg-green-50 border border-green-200 p-3 text-center">
              <div className="text-2xl font-bold text-green-700">
                {orders.filter(o => o.status === 'Listo').length}
              </div>
              <div className="text-xs text-green-600">Listos</div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="card bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="font-semibold text-gray-700">ID</th>
                    <th className="font-semibold text-gray-700">Mesa</th>
                    <th className="font-semibold text-gray-700">Items</th>
                    <th className="font-semibold text-gray-700">Tiempo</th>
                    <th className="font-semibold text-gray-700">Estado</th>
                    <th className="font-semibold text-gray-700">Total</th>
                    <th className="font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={`${statusConfig[o.status].bg} hover:bg-gray-50 transition-colors`}>
                      <td className="font-mono text-sm font-medium">{o.id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-cyan-600/10 flex items-center justify-center font-bold text-cyan-600">
                            {o.table}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {o.items.join(', ')}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-gray-600">
                          <ClockIcon className="w-4 h-4" />
                          {o.time}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          o.status === 'Listo' ? 'badge-success' :
                          o.status === 'Cocina' ? 'badge-warning' :
                          'badge-ghost'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="font-bold text-gray-800">₡{o.total.toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="btn btn-ghost btn-sm gap-1"
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
            <button className="btn bg-cyan-600 hover:bg-cyan-700 text-white border-0 gap-2">
              <CalendarDaysIcon className="w-5 h-5" />
              Nueva Reserva
            </button>
          </div>

          {/* Reservations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservations.map(r => (
              <div key={r.id} className="card bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{r.name}</h3>
                      <span className="text-xs text-gray-500 font-mono">{r.id}</span>
                    </div>
                    <span className="badge badge-success">Confirmada</span>
                  </div>

                  <div className="space-y-2 text-sm mt-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 text-cyan-600" />
                      <span>{r.date} — {r.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <UserGroupIcon className="w-4 h-4 text-cyan-600" />
                      <span>{r.guests} personas</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <PhoneIcon className="w-4 h-4 text-cyan-600" />
                      <span>{r.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                    <button className="btn btn-success btn-sm flex-1 gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirmar
                    </button>
                    <button className="btn btn-ghost btn-sm text-red-500 gap-1">
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
          <div className="card bg-white max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">Detalle del Pedido</h3>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost btn-sm btn-circle">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono font-bold">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Mesa:</span>
                  <span className="font-bold text-xl">{selectedOrder.table}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`badge ${
                    selectedOrder.status === 'Listo' ? 'badge-success' :
                    selectedOrder.status === 'Cocina' ? 'badge-warning' :
                    'badge-ghost'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-200">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-3 bg-cyan-600/10 rounded-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-cyan-600">₡{selectedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={() => setSelectedOrder(null)} className="btn bg-cyan-600 hover:bg-cyan-700 text-white border-0 flex-1">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
