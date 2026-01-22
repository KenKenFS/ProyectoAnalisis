import { useState } from 'react'
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CreditCardIcon,
  BanknotesIcon,
  PrinterIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

// Datos de ejemplo - Ordenes de meseros
const pendingOrders = [
  {
    id: 1,
    table: 5,
    items: [
      { id: 1, name: 'Ceviche Clasico', qty: 2, price: 12.5 },
      { id: 6, name: 'Coca Cola', qty: 2, price: 2 },
    ],
    status: 'Listo',
    time: '15 min',
    total: 29000,
  },
  {
    id: 2,
    table: 8,
    items: [
      { id: 2, name: 'Ceviche Mixto', qty: 1, price: 14 },
      { id: 7, name: 'Inca Kola', qty: 1, price: 2.5 },
    ],
    status: 'En cocina',
    time: '8 min',
    total: 11550,
  },
  {
    id: 3,
    table: 12,
    items: [
      { id: 3, name: 'Causa Limena', qty: 3, price: 8 },
      { id: 5, name: 'Papa a la Huancaina', qty: 2, price: 6 },
    ],
    status: 'Listo',
    time: '5 min',
    total: 30800,
  },
]

// Datos de ejemplo - Menu para venta directa
const menuItems = [
  { id: 1, name: 'Ceviche Clasico', category: 'Ceviches', price: 12.5, desc: 'Ceviche tradicional con limon' },
  { id: 2, name: 'Ceviche Mixto', category: 'Ceviches', price: 14, desc: 'Mixto de mariscos premium' },
  { id: 3, name: 'Causa Limena', category: 'Entradas', price: 8, desc: 'Causa de papa con pulpa de atun' },
  { id: 4, name: 'Tiradito', category: 'Ceviches', price: 13, desc: 'Lomo de atun en tecnica tiradito' },
  { id: 5, name: 'Papa a la Huancaina', category: 'Acompañamientos', price: 6, desc: 'Papa criolla con salsa huancaina' },
  { id: 6, name: 'Coca Cola', category: 'Bebidas', price: 2, desc: 'Bebida refrescante' },
  { id: 7, name: 'Inca Kola', category: 'Bebidas', price: 2.5, desc: 'Bebida peruana' },
  { id: 8, name: 'Leche de Tigre', category: 'Bebidas', price: 3, desc: 'Bebida tipica del ceviche' },
]

const categories = ['Todos', ...new Set(menuItems.map(m => m.category))]

function OrderTableCard({ order, onSelect }) {
  const statusColors = {
    'Listo': 'bg-green-50 border-green-300',
    'En cocina': 'bg-yellow-50 border-yellow-300',
    'Pendiente': 'bg-blue-50 border-blue-300',
  }

  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all ${statusColors[order.status]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-gray-900">Mesa {order.table}</div>
          <div className="text-xs text-gray-600">{order.time}</div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
          order.status === 'Listo' ? 'bg-green-100 text-green-800' :
          order.status === 'En cocina' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {order.status === 'Listo' && <CheckCircleIcon className="w-4 h-4" />}
          {order.status === 'En cocina' && <ClockIcon className="w-4 h-4" />}
          {order.status}
        </div>
      </div>

      <div className="space-y-1 mb-3 max-h-20 overflow-y-auto">
        {order.items.map(item => (
          <div key={item.id} className="text-xs text-gray-700">
            {item.qty}x {item.name}
          </div>
        ))}
      </div>

      <div className="border-t border-current border-opacity-20 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Total:</span>
          <span className="font-bold text-lg text-gray-900">₡{order.total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function MenuCard({ item, onAdd }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-cyan-400 transition-all duration-300 overflow-hidden group cursor-pointer">
      <div className="h-28 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative overflow-hidden">
        <ShoppingCartIcon className="w-12 h-12 text-cyan-600/50 group-hover:scale-110 transition-transform duration-300" />
        <div className="absolute top-2 right-2">
          <span className="badge badge-sm bg-white/90 text-gray-600 font-semibold">{item.category}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-1">{item.desc}</p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="font-bold text-cyan-600 text-base">₡{(item.price * 700).toLocaleString()}</div>
          <button
            onClick={() => onAdd(item)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 text-sm truncate">{item.name}</div>
        <div className="text-xs text-gray-500">₡{(item.price * 700).toLocaleString()} c/u</div>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
        <button
          onClick={onDecrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <MinusIcon className="w-3 h-3 text-gray-600" />
        </button>
        <span className="w-8 text-center font-semibold text-sm">{item.qty}</span>
        <button
          onClick={onIncrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <PlusIcon className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      <div className="font-bold text-gray-800 w-20 text-right text-sm">
        ₡{(item.price * item.qty * 700).toLocaleString()}
      </div>

      <button
        onClick={onRemove}
        className="p-1 hover:bg-red-50 text-red-500 rounded transition"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

function OrderDetailModal({ order, visible, onClose, onPay }) {
  if (!visible || !order) return null

  const subtotal = Math.round(order.items.reduce((s, i) => s + i.price * i.qty * 700, 0))
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">Mesa {order.table}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Estado:</span> {order.status}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Tiempo:</span> {order.time}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">Productos</h4>
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-800">{item.qty}x {item.name}</span>
                <span className="font-semibold">₡{(item.price * item.qty * 700).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₡{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA (13%)</span>
              <span>₡{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 bg-cyan-50 p-3 rounded border-2 border-cyan-300">
              <span>TOTAL A PAGAR</span>
              <span className="text-cyan-600">₡{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4">
            <button
              onClick={() => onPay('efectivo')}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition font-semibold"
            >
              <BanknotesIcon className="w-5 h-5" />
              Efectivo
            </button>
            <button
              onClick={() => onPay('tarjeta')}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-semibold"
            >
              <CreditCardIcon className="w-5 h-5" />
              Tarjeta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceiptModal({ visible, order, onClose }) {
  if (!visible || !order) return null

  const subtotal = Math.round(order.items.reduce((s, i) => s + i.price * i.qty * 700, 0))
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">Recibo - Mesa {order.table}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
            <div className="font-bold text-lg text-gray-900">Ceviche del Rey</div>
            <div className="text-xs text-gray-600 mt-1">San Jose, Costa Rica</div>
          </div>

          <div className="space-y-2 pb-4 border-b-2 border-dashed border-gray-300">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.qty}x {item.name}</span>
                <span className="font-semibold">₡{(item.price * item.qty * 700).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₡{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (13%):</span>
              <span>₡{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 bg-cyan-50 p-2 rounded">
              <span>TOTAL:</span>
              <span className="text-cyan-600">₡{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 pt-4 border-t-2 border-dashed">
            Gracias por su visita
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-semibold">
              <PrinterIcon className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition font-semibold">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VentasPage() {
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p)
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(id, delta) {
    setCart(prev =>
      prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)
          .filter(p => p.qty > 0)
    )
  }

  function removeItem(id) {
    setCart(prev => prev.filter(p => p.id !== id))
  }

  const subtotal = Math.round(cart.reduce((s, i) => s + i.price * i.qty * 700, 0))
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  return (
    <div className="space-y-6 pb-4">
      {/* SECTION 1: PEDIDOS POR MESA */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-cyan-600" />
          Pedidos Por Mesa
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingOrders.map(order => (
            <OrderTableCard
              key={order.id}
              order={order}
              onSelect={() => {
                setSelectedOrder(order)
                setShowOrderDetail(true)
              }}
            />
          ))}
        </div>

        {pendingOrders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay pedidos pendientes</p>
          </div>
        )}
      </div>

      {/* SEPARATOR */}
      <div className="border-t-2 border-gray-200 pt-6 my-6">
        <div className="text-center mb-6">
          <span className="bg-gray-100 px-4 py-2 rounded-full text-sm font-semibold text-gray-700">
            O
          </span>
        </div>
      </div>

      {/* SECTION 2: VENTA DIRECTA / PARA LLEVAR */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="w-6 h-6 text-cyan-600" />
          Venta Directa / Para Llevar
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-cyan-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <MenuCard key={item.id} item={item} onAdd={addToCart} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay productos que coincidan</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart Sidebar */}
          <aside className="lg:sticky lg:top-0 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col h-fit max-h-[calc(100vh-10rem)]">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCartIcon className="w-5 h-5 text-cyan-600" />
                <h2 className="font-bold text-gray-900">Carrito</h2>
                {cart.length > 0 && (
                  <span className="ml-auto badge badge-cyan badge-sm">{cart.length}</span>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Carrito vacio</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onIncrease={() => updateQty(item.id, 1)}
                    onDecrease={() => updateQty(item.id, -1)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))
              )}
            </div>

            {/* Totals & Payment */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₡{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (13%)</span>
                    <span className="font-semibold">₡{tax.toLocaleString()}</span>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 bg-white p-2 rounded border border-gray-200">
                    <span>Total</span>
                    <span className="text-cyan-600">₡{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition font-semibold active:scale-95"
                  >
                    <BanknotesIcon className="w-4 h-4" />
                    Efectivo
                  </button>
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition font-semibold active:scale-95"
                  >
                    <CreditCardIcon className="w-4 h-4" />
                    Tarjeta
                  </button>
                </div>

                {/* Clear Cart */}
                <button
                  onClick={() => setCart([])}
                  className="w-full px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition font-semibold text-sm"
                >
                  Limpiar carrito
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* MODALS */}
      <OrderDetailModal
        order={selectedOrder}
        visible={showOrderDetail}
        onClose={() => setShowOrderDetail(false)}
        onPay={(method) => {
          setShowOrderDetail(false)
          setShowReceipt(true)
        }}
      />

      <ReceiptModal
        visible={showReceipt}
        order={selectedOrder || { table: 'Mostrador', items: cart }}
        onClose={() => {
          setShowReceipt(false)
          setCart([])
          setSelectedOrder(null)
        }}
      />
    </div>
  )
}
