import { useState } from 'react'

export default function KitchenDisplay() {
  const [orders] = useState([
    {
      id: 1,
      table: 5,
      items: ['2x Hamburguesa', '1x Papas fritas'],
      notes: 'Sin cebolla',
      status: 'pending',
      time: '5 min'
    },
    {
      id: 2,
      table: 7,
      items: ['3x Tacos', '1x Agua'],
      notes: '',
      status: 'preparing',
      time: '3 min'
    }
  ])

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-5xl font-bold text-white mb-2">🍳 PANTALLA DE COCINA</h1>
          <p className="text-gray-400">Ordenes pendientes: {orders.length}</p>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-2 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-lg shadow-xl p-6 border-4 ${
                order.status === 'pending'
                  ? 'bg-red-500 border-red-700'
                  : 'bg-yellow-500 border-yellow-700'
              }`}
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-5xl font-bold text-white">MESA {order.table}</p>
                  <p className="text-2xl text-white opacity-75">Orden #{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-white">{order.time}</p>
                  <p className="text-lg text-white opacity-75">Tiempo</p>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
                <p className="text-white text-2xl font-semibold mb-3">Orden:</p>
                {order.items.map((item, idx) => (
                  <p key={idx} className="text-3xl font-bold text-white mb-2">
                    • {item}
                  </p>
                ))}
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-blue-900 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 text-lg font-semibold">⚠️ NOTA ESPECIAL:</p>
                  <p className="text-white text-2xl">{order.notes}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`py-4 rounded-lg font-bold text-2xl transition-all ${
                    order.status === 'preparing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {order.status === 'preparing' ? '🔄 PREPARANDO' : '🔄 PREPARAR'}
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold text-2xl transition-all">
                  ✅ LISTO
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sound Alert */}
        <audio autoPlay src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" />
      </div>
    </div>
  )
}
