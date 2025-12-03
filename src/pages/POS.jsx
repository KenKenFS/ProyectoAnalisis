import { useState } from 'react'
import { menuItems } from '../data/fakeData'
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CreditCardIcon,
  BanknotesIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const categories = ['Todos', ...new Set(menuItems.map(m => m.category))]

function MenuCard({ item, onAdd }) {
  return (
    <div className="card bg-white border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
      <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative overflow-hidden">
        <span className="text-5xl group-hover:scale-110 transition-transform">
          {item.category === 'Ceviches' ? '🐟' : 
           item.category === 'Bebidas' ? '🍹' : 
           item.category === 'Entradas' ? '🥗' : 
           item.category === 'Acompañamientos' ? '🍟' : '🍽️'}
        </span>
        <div className="absolute top-2 right-2">
          <span className="badge badge-sm bg-white/90 text-gray-600">{item.category}</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm">{item.name}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.desc}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="font-bold text-primary text-lg">₡{(item.price * 700).toLocaleString()}</div>
          <button
            onClick={() => onAdd(item)}
            className="btn btn-primary btn-sm btn-circle"
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
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 text-sm truncate">{item.name}</div>
        <div className="text-xs text-gray-500">₡{(item.price * 700).toLocaleString()} c/u</div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onDecrease} className="btn btn-ghost btn-xs btn-circle">
          <MinusIcon className="w-3 h-3" />
        </button>
        <span className="w-8 text-center font-semibold">{item.qty}</span>
        <button onClick={onIncrease} className="btn btn-ghost btn-xs btn-circle">
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>
      <div className="font-bold text-gray-800 w-20 text-right">
        ₡{(item.price * item.qty * 700).toLocaleString()}
      </div>
      <button onClick={onRemove} className="btn btn-ghost btn-xs btn-circle text-red-500">
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function POS() {
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [tableNumber, setTableNumber] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)

  const filteredItems = selectedCategory === 'Todos'
    ? menuItems
    : menuItems.filter(m => m.category === selectedCategory)

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

  function clearCart() {
    setCart([])
    setTableNumber('')
    setShowReceipt(false)
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty * 700, 0)
  const tax = subtotal * 0.13
  const total = subtotal + tax

  return (
    <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Módulo POS</h1>
        <p className="text-gray-600 text-sm">Punto de venta — Selecciona productos para agregar al carrito</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Menu Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {/* Category Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'btn-primary'
                    : 'btn-ghost bg-white border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map(mi => (
                <MenuCard key={mi.id} item={mi} onAdd={addToCart} />
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <aside className="card bg-white border border-gray-200 flex flex-col min-h-0 max-h-[500px] lg:max-h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-gray-800">Carrito</h2>
              {cart.length > 0 && (
                <span className="badge badge-primary badge-sm">{cart.length}</span>
              )}
            </div>
            <div className="mt-2">
              <input
                type="text"
                placeholder="# Mesa"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Carrito vacío</p>
                <p className="text-xs">Selecciona productos del menú</p>
              </div>
            ) : (
              cart.map(c => (
                <CartItem
                  key={c.id}
                  item={c}
                  onIncrease={() => updateQty(c.id, 1)}
                  onDecrease={() => updateQty(c.id, -1)}
                  onRemove={() => removeItem(c.id)}
                />
              ))
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₡{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA (13%)</span>
                  <span>₡{tax.toLocaleString()}</span>
                </div>
                <div className="divider my-2"></div>
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span>₡{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="btn btn-success gap-2"
                >
                  <BanknotesIcon className="w-4 h-4" />
                  Efectivo
                </button>
                <button
                  onClick={() => setShowReceipt(true)}
                  className="btn btn-primary gap-2"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  Tarjeta
                </button>
              </div>
              <button
                onClick={clearCart}
                className="btn btn-ghost btn-sm w-full mt-2 text-red-500"
              >
                Cancelar orden
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card bg-white max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Recibo</h3>
                <button onClick={() => setShowReceipt(false)} className="btn btn-ghost btn-sm btn-circle">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center mb-4 pb-4 border-b border-dashed">
                <div className="font-bold text-lg">Ceviche del Rey</div>
                <div className="text-xs text-gray-500">San José, Costa Rica</div>
                <div className="text-xs text-gray-500">Tel: +506 2203-5109</div>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                Mesa: {tableNumber || 'N/A'} | Fecha: {new Date().toLocaleDateString()}
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-dashed">
                {cart.map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.qty}x {c.name}</span>
                    <span>₡{(c.price * c.qty * 700).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₡{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (13%):</span>
                  <span>₡{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>TOTAL:</span>
                  <span>₡{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-dashed">
                ¡Gracias por su visita!
                <br />
                Factura electrónica disponible
              </div>

              <div className="flex gap-2 mt-4">
                <button className="btn btn-outline flex-1 gap-2">
                  <PrinterIcon className="w-4 h-4" />
                  Imprimir
                </button>
                <button onClick={clearCart} className="btn btn-primary flex-1">
                  Nuevo pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
