import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'
import { OrdersContext } from '../context/OrdersContext'
import OrderTimer from '../components/OrderTimer'

export default function KitchenPage() {
  const navigate = useNavigate()
  const { orders, updateStatus, removeOrder } = useContext(OrdersContext)

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header - Vista de Cocina */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FireIcon className="w-8 h-8 text-orange-500" />
            Vista de Cocina
          </h1>
          <p className="text-gray-600 text-sm">Cola de pedidos en tiempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BellAlertIcon className="w-5 h-5 text-red-500 animate-bounce" />
            <span className="text-sm text-gray-600">Actualizaciones en vivo</span>
          </div>
          <button
            onClick={() => navigate('/cocina/fullscreen')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <ArrowsPointingOutIcon className="w-5 h-5" />
            Pantalla Completa
          </button>
        </div>
      </div>

      {/* Orders Grid - Optimized for visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onUpdateStatus={updateStatus}
            onRemove={removeOrder}
          />
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-semibold">Cocina vacia</p>
          <p className="text-gray-400 text-sm">Esperando nuevas ordenes...</p>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus, onRemove }) {
  const statusConfig = {
    pending: { borderColor: 'border-gray-300', bgColor: 'bg-white', label: 'Pendiente', icon: ClockIcon },
    preparing: { borderColor: 'border-amber-400', bgColor: 'bg-amber-50', label: 'En preparacion', icon: FireIcon },
    ready: { borderColor: 'border-green-400', bgColor: 'bg-green-50', label: 'Listo', icon: CheckCircleIcon },
  }

  const config = statusConfig[order.status]
  const StatusIcon = config.icon

  return (
    <div className={`border-2 ${config.borderColor} ${config.bgColor} rounded-lg p-4 transition-all duration-200 hover:shadow-lg`}>
      {/* Header con ID y Estado */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-lg font-bold text-gray-800">{order.id}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
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
          <div className="text-xs text-gray-500 mt-2 flex items-center justify-end gap-2">
            <ClockIcon className="w-4 h-4" />
            <OrderTimer createdAt={order.createdAt} status={order.status} />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white/60 p-3 rounded mb-4 border border-gray-100">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
          Items del pedido:
        </div>
        <div className="space-y-2">
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
          onClick={() => onUpdateStatus(order.id, 'preparing')}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-200 mb-3"
        >
          Iniciar Preparacion
        </button>
      )}
      {order.status === 'preparing' && (
        <button
          onClick={() => onUpdateStatus(order.id, 'ready')}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-200 mb-3 flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Listo
        </button>
      )}
      {order.status === 'ready' && (
        <div className="w-full bg-green-100 text-green-700 font-semibold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-2 mb-3">
          <CheckCircleIcon className="w-5 h-5" />
          Entregado a mesero
        </div>
      )}

      {/* Warning for pending orders */}
      {order.status === 'pending' && (
        <div className="px-4 py-2 bg-red-100 border-t border-red-200 text-center -mx-4 -mb-4 rounded-b-lg">
          <span className="text-red-600 text-sm font-medium animate-pulse">
            Esperando preparacion
          </span>
        </div>
      )}
    </div>
  )
}
