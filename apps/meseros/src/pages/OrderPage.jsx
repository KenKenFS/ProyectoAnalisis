import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function OrderPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const [cart, setCart] = useState([])

  const products = [
    { id: 1, name: 'Hamburguesa', price: 15 },
    { id: 2, name: 'Papas fritas', price: 8 },
    { id: 3, name: 'Refrescos', price: 3.5 },
    { id: 4, name: 'Tacos al pastor', price: 12 },
  ]

  const addToCart = (product) => {
    setCart([...cart, product])
  }

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Mesa {tableId}</h1>
        <button
          onClick={() => navigate('/tables')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
        >
          ← Atrás
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Productos */}
        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Selecciona Productos</h2>
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white p-4 rounded-lg font-semibold text-lg transition-all active:scale-95"
              >
                <p>{product.name}</p>
                <p className="text-2xl font-bold">${product.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Carrito */}
        <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
          <h2 className="text-xl font-semibold mb-4">Pedido</h2>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">${item.price}</span>
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 mb-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold">
              ✅ Enviar a Cocina
            </button>
            <button
              onClick={() => navigate('/tables')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
