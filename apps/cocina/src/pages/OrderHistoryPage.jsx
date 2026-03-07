import { Fragment, useContext, useEffect, useMemo, useState } from 'react'
import {
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { OrdersContext } from '../context/OrdersContext'

function formatDateTime(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-CR')
}

export default function OrderHistoryPage() {
  const { historyOrders } = useContext(OrdersContext)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(20)

  const shownOrders = useMemo(
    () => historyOrders.slice(0, visibleCount),
    [historyOrders, visibleCount]
  )

  useEffect(() => {
    setVisibleCount(20)
    setExpandedOrderId(null)
  }, [historyOrders.length])

  const toggleExpanded = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-8 h-8 text-cyan-600" />
          Historial de pedidos
        </h1>
        <p className="text-gray-600 text-sm">Pedidos finalizados desde cocina</p>
      </div>

      {historyOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <CheckBadgeIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-semibold">No hay pedidos finalizados</p>
          <p className="text-gray-400 text-sm">Cuando finalices pedidos apareceran aqui.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mesa</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Finalizado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {shownOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id

                  return (
                    <Fragment key={order.id}>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.displayId || order.id}</td>
                        <td className="px-4 py-3 text-gray-700">Mesa {order.table}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold bg-green-100 text-green-800">
                            <CheckBadgeIcon className="w-4 h-4" />
                            Finalizado
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(order.finalizedAtMs)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpanded(order.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUpIcon className="w-4 h-4" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="w-4 h-4" />
                                Ver detalle
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
                              Items del pedido
                            </div>
                            {(order.allItems || order.items).length === 0 ? (
                              <div className="text-sm text-gray-500">Sin items registrados</div>
                            ) : (
                              <div className="space-y-2">
                                {(order.allItems || order.items).map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-sm bg-white border border-gray-200 rounded p-2">
                                    <span className="text-gray-800">{item.name}</span>
                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                      x{item.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              Finalizado: {formatDateTime(order.finalizedAtMs)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {historyOrders.length > visibleCount && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition"
              >
                Cargar más
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
