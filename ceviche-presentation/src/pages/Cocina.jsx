import { useState } from 'react'
import { orders } from '../data/fakeData'
import {
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'border-gray-300 bg-gray-50', badge: 'badge-ghost', icon: ClockIcon },
  preparing: { label: 'En preparación', color: 'border-amber-400 bg-amber-50', badge: 'badge-warning', icon: FireIcon },
  ready: { label: 'Listo', color: 'border-green-500 bg-green-50', badge: 'badge-success', icon: CheckCircleIcon },
}

export default function Cocina() {
  const [orderList, setOrderList] = useState(orders)

  function updateStatus(id, newStatus) {
    setOrderList(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
  }

  const pendingCount = orderList.filter(o => o.status === 'pending').length
  const preparingCount = orderList.filter(o => o.status === 'preparing').length
  const readyCount = orderList.filter(o => o.status === 'ready').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins flex items-center gap-2">
            <FireIcon className="w-8 h-8 text-orange-500" />
            Vista de Cocina
          </h1>
          <p className="text-gray-600 text-sm">Cola de pedidos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-red-500 animate-bounce" />
          <span className="text-sm text-gray-600">Actualizaciones en vivo</span>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-gray-50 border-2 border-gray-200 p-4 text-center">
          <ClockIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
          <div className="text-3xl font-bold text-gray-700">{pendingCount}</div>
          <div className="text-sm text-gray-500">Pendientes</div>
        </div>
        <div className="card bg-amber-50 border-2 border-amber-300 p-4 text-center">
          <FireIcon className="w-8 h-8 mx-auto text-amber-500 mb-2 animate-pulse" />
          <div className="text-3xl font-bold text-amber-700">{preparingCount}</div>
          <div className="text-sm text-amber-600">En preparación</div>
        </div>
        <div className="card bg-green-50 border-2 border-green-300 p-4 text-center">
          <CheckCircleIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <div className="text-3xl font-bold text-green-700">{readyCount}</div>
          <div className="text-sm text-green-600">Listos</div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderList.map(order => {
          const config = statusConfig[order.status]
          const StatusIcon = config.icon

          return (
            <div
              key={order.id}
              className={`card border-2 ${config.color} transition-all duration-300 hover:shadow-lg`}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-bold text-gray-800">{order.id}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                        {order.table}
                      </div>
                      <span className="text-sm text-gray-600">Mesa</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${config.badge} gap-1`}>
                      <StatusIcon className="w-4 h-4" />
                      {config.label}
                    </span>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                      <ClockIcon className="w-3 h-3" />
                      {order.time}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Items del pedido:
                  </div>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-lg border flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{item.name}</span>
                      </div>
                      <span className="badge badge-lg bg-primary text-white">
                        ×{item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="btn btn-warning flex-1 gap-2"
                    >
                      <FireIcon className="w-5 h-5" />
                      Iniciar
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="btn btn-success flex-1 gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      ¡Listo!
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <div className="flex-1 text-center py-3 bg-green-100 rounded-lg">
                      <span className="text-green-700 font-semibold flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        Entregado a mesero
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Urgency indicator */}
              {order.status === 'pending' && (
                <div className="px-4 py-2 bg-red-100 border-t border-red-200 text-center">
                  <span className="text-red-600 text-sm font-medium animate-pulse">
                    Esperando preparación
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Stats Footer */}
      <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-4">
        <div className="flex flex-wrap justify-around items-center gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-800">
              {orderList.length}
            </div>
            <div className="text-xs text-blue-600">Pedidos totales</div>
          </div>
          <div className="h-10 w-px bg-blue-200 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-amber-600">
              ~8 min
            </div>
            <div className="text-xs text-amber-600">Tiempo promedio</div>
          </div>
          <div className="h-10 w-px bg-blue-200 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-green-600">
              94%
            </div>
            <div className="text-xs text-green-600">Satisfacción</div>
          </div>
        </div>
      </div>
    </div>
  )
}
