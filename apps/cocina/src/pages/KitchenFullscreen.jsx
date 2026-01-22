import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline'
import { OrdersContext } from '../context/OrdersContext'
import OrderTimer from '../components/OrderTimer'

export default function KitchenFullscreen() {
  const navigate = useNavigate()
  const { orders, updateStatus, pendingCount, preparingCount, readyCount } = useContext(OrdersContext)

  const statusConfig = {
    pending: { borderColor: 'border-gray-300', bgColor: 'bg-white', label: 'Pendiente', icon: ClockIcon },
    preparing: { borderColor: 'border-amber-400', bgColor: 'bg-amber-50', label: 'En preparacion', icon: FireIcon },
    ready: { borderColor: 'border-green-400', bgColor: 'bg-green-50', label: 'Listo', icon: CheckCircleIcon },
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header minimo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FireIcon className="w-7 h-7 text-orange-500" />
            Vista de Cocina
          </h1>
          
          {/* Contadores */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-200 px-3 py-1.5 rounded-lg">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-700">{pendingCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-200 px-3 py-1.5 rounded-lg">
              <FireIcon className="w-5 h-5 text-amber-700" />
              <span className="font-bold text-amber-700">{preparingCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-green-200 px-3 py-1.5 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-700" />
              <span className="font-bold text-green-700">{readyCount}</span>
            </div>
          </div>
        </div>

        {/* Boton salir de pantalla completa */}
        <button
          onClick={() => navigate('/cocina')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
        >
          <ArrowsPointingInIcon className="w-5 h-5" />
          Salir
        </button>
      </div>

      {/* Grid de ordenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {orders.map(order => {
          const config = statusConfig[order.status]
          const StatusIcon = config.icon

          return (
            <div
              key={order.id}
              className={`border-2 ${config.borderColor} ${config.bgColor} rounded-lg p-4 transition-all duration-200 hover:shadow-lg`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-lg font-bold text-gray-800">{order.id}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {order.table}
                    </div>
                    <span className="text-sm text-gray-600">Mesa</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
                    order.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                    order.status === 'preparing' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    <StatusIcon className="w-4 h-4" />
                    {config.label}
                  </span>
                  <div className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <OrderTimer createdAt={order.createdAt} status={order.status} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white/60 p-3 rounded mb-3 border border-gray-100">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
                  Items del pedido:
                </div>
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-800 font-medium">{item.name}</span>
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                        x{item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              {order.status === 'pending' && (
                <button
                  onClick={() => updateStatus(order.id, 'preparing')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors duration-200"
                >
                  Iniciar Preparacion
                </button>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => updateStatus(order.id, 'ready')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  Listo
                </button>
              )}
              {order.status === 'ready' && (
                <div className="w-full bg-green-100 text-green-700 font-semibold py-2.5 px-3 rounded-lg text-center flex items-center justify-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Entregado a mesero
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-lg mt-8">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500 text-xl font-semibold">Cocina vacia</p>
          <p className="text-gray-400">Esperando nuevas ordenes...</p>
        </div>
      )}
    </div>
  )
}
