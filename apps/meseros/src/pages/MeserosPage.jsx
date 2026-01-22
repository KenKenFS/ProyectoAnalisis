import { useState } from 'react'
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XMarkIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

// Datos de ejemplo - Mesas
const tablesData = [
  { id: 1, table: 1, capacity: 4, status: 'disponible' },
  { id: 2, table: 2, capacity: 4, status: 'disponible' },
  { id: 3, table: 3, capacity: 6, status: 'ocupada' },
  { id: 4, table: 4, capacity: 2, status: 'disponible' },
  { id: 5, table: 5, capacity: 6, status: 'ocupada' },
  { id: 6, table: 6, capacity: 4, status: 'disponible' },
  { id: 7, table: 7, capacity: 8, status: 'disponible' },
  { id: 8, table: 8, capacity: 4, status: 'ocupada' },
]

// Menu disponible
const menuItems = [
  { id: 1, name: 'Ceviche Clasico', category: 'Ceviches', price: 12.5 },
  { id: 2, name: 'Ceviche Mixto', category: 'Ceviches', price: 14 },
  { id: 3, name: 'Causa Limena', category: 'Entradas', price: 8 },
  { id: 4, name: 'Tiradito', category: 'Ceviches', price: 13 },
  { id: 5, name: 'Papa a la Huancaina', category: 'Acompañamientos', price: 6 },
  { id: 6, name: 'Coca Cola', category: 'Bebidas', price: 2 },
  { id: 7, name: 'Inca Kola', category: 'Bebidas', price: 2.5 },
  { id: 8, name: 'Leche de Tigre', category: 'Bebidas', price: 3 },
]

const categories = ['Todos', ...new Set(menuItems.map(m => m.category))]

function TableCard({ table, isSelected, onClick }) {
  const statusColors = {
    disponible: 'bg-green-50 border-green-300 hover:border-green-500',
    ocupada: 'bg-blue-50 border-blue-300',
    reservada: 'bg-yellow-50 border-yellow-300',
  }

  const StatusIcon = table.status === 'disponible' ? CheckCircleIcon : 
                     table.status === 'ocupada' ? UserGroupIcon : ClockIcon

  return (
    <button
      onClick={onClick}
      className={`border-2 rounded-lg p-4 transition-all ${statusColors[table.status]} ${
        isSelected ? 'ring-4 ring-cyan-500 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <div className="mb-2">
        <StatusIcon className={`w-8 h-8 mx-auto ${
          table.status === 'disponible' ? 'text-green-600' :
          table.status === 'ocupada' ? 'text-blue-600' : 'text-yellow-600'
        }`} />
      </div>
      <div className="text-xl font-bold text-gray-900">Mesa {table.table}</div>
      <div className="text-xs text-gray-600 mt-1">Capacidad: {table.capacity}</div>
      <div className="text-xs font-semibold text-gray-700 mt-2 capitalize">{table.status}</div>
    </button>
  )
}

function MenuItemCard({ item, onAdd }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
      <div className="text-sm font-semibold text-gray-800">{item.name}</div>
      <div className="text-xs text-gray-500 mb-2">{item.category}</div>
      <div className="flex justify-between items-center">
        <div className="font-bold text-cyan-600">₡{(item.price * 700).toLocaleString()}</div>
        <button
          onClick={() => onAdd(item)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white p-1.5 rounded transition active:scale-95"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function OrderItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 truncate">{item.name}</div>
        <div className="text-xs text-gray-500">₡{(item.price * 700).toLocaleString()}</div>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded">
        <button
          onClick={onDecrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <MinusIcon className="w-3 h-3 text-gray-600" />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
        <button
          onClick={onIncrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <PlusIcon className="w-3 h-3 text-gray-600" />
        </button>
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

export default function MeserosPage() {
  const [tables, setTables] = useState(tablesData)
  const [selectedTable, setSelectedTable] = useState(null)
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [showConfirm, setShowConfirm] = useState(false)

  const filteredItems = menuItems.filter(item =>
    selectedCategory === 'Todos' || item.category === selectedCategory
  )

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

  function sendOrder() {
    if (!selectedTable || cart.length === 0) return

    // Cambiar estado de mesa a ocupada
    setTables(prev =>
      prev.map(t =>
        t.id === selectedTable.id ? { ...t, status: 'ocupada' } : t
      )
    )

    // Limpiar
    setShowConfirm(false)
    setCart([])
    setSelectedTable(null)
  }

  const subtotal = Math.round(cart.reduce((s, i) => s + i.price * i.qty * 700, 0))
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <UserGroupIcon className="w-10 h-10" />
          MESEROS
        </h1>
        <p className="text-blue-200 mt-2">Toma de ordenes desde tablet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mesas */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TableCellsIcon className="w-6 h-6 text-cyan-600" />
            Mesas Disponibles
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                isSelected={selectedTable?.id === table.id}
                onClick={() => setSelectedTable(table)}
              />
            ))}
          </div>
        </div>

        {/* Orden */}
          <aside className="lg:sticky lg:top-0 bg-white border border-gray-200 rounded-lg shadow-lg h-fit max-h-[calc(100vh-10rem)]">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-cyan-600" />
              <h3 className="font-bold text-gray-900">Nueva Orden</h3>
            </div>
            {selectedTable && (
              <div className="mt-2 text-sm font-semibold text-blue-700">
                Mesa {selectedTable.table}
              </div>
            )}
          </div>

          {!selectedTable ? (
            <div className="p-6 text-center text-gray-500">
              <TableCellsIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Selecciona una mesa para empezar</p>
            </div>
          ) : (
            <>
              {/* Menu */}
              <div className="p-4 border-b border-gray-100 max-h-[300px] overflow-y-auto">
                {/* Categorias */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        selectedCategory === cat
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
                  ))}
                </div>
              </div>

              {/* Carrito */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[200px]">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    <p className="text-sm">Sin items</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <OrderItem
                      key={item.id}
                      item={item}
                      onIncrease={() => updateQty(item.id, 1)}
                      onDecrease={() => updateQty(item.id, -1)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))
                )}
              </div>

              {/* Totales */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
                  <div className="text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₡{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA (13%)</span>
                      <span>₡{tax.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between font-bold text-gray-900 bg-white p-2 rounded border">
                    <span>Total</span>
                    <span className="text-cyan-600">₡{total.toLocaleString()}</span>
                  </div>

                  {/* Botones */}
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full bg-cyan-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2 active:scale-95"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Enviar a Cocina
                  </button>

                  <button
                    onClick={() => {
                      setCart([])
                      setSelectedTable(null)
                    }}
                    className="w-full text-red-600 hover:bg-red-50 py-2 rounded-lg transition font-semibold border border-red-300"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full">
            <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Confirmar Orden</h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-2">Mesa {selectedTable?.table}</div>
                <div className="space-y-1 text-sm text-gray-700">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.qty}x {item.name}</span>
                      <span>₡{(item.price * item.qty * 700).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span className="text-cyan-600">₡{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendOrder}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
