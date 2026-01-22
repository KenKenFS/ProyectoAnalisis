import { useState } from 'react'
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

// DATOS DE INVENTARIO
const inventory = [
  { id: 1, name: 'Camarones Grandes', qty: 15, minQty: 10, unit: 'kg', lastRestock: '2025-01-15', category: 'Proteína' },
  { id: 2, name: 'Limón Fresco', qty: 3, minQty: 20, unit: 'docena', lastRestock: '2025-01-14', category: 'Frutas' },
  { id: 3, name: 'Cebolla Blanca', qty: 45, minQty: 30, unit: 'kg', lastRestock: '2025-01-13', category: 'Vegetales' },
  { id: 4, name: 'Cilantro Fresco', qty: 8, minQty: 5, unit: 'manojo', lastRestock: '2025-01-16', category: 'Hierbas' },
  { id: 5, name: 'Ají Rojo', qty: 120, minQty: 50, unit: 'kg', lastRestock: '2025-01-12', category: 'Vegetales' },
  { id: 6, name: 'Tomate Rojo', qty: 25, minQty: 15, unit: 'kg', lastRestock: '2025-01-15', category: 'Vegetales' },
  { id: 7, name: 'Ceviche Mix', qty: 8, minQty: 5, unit: 'kg', lastRestock: '2025-01-16', category: 'Proteína' },
  { id: 8, name: 'Leche de Coco', qty: 12, minQty: 8, unit: 'litro', lastRestock: '2025-01-14', category: 'Bebidas' },
  { id: 9, name: 'Sal Marina', qty: 5, minQty: 3, unit: 'kg', lastRestock: '2025-01-10', category: 'Condimentos' },
  { id: 10, name: 'Pimienta Negra', qty: 2, minQty: 2, unit: 'kg', lastRestock: '2025-01-08', category: 'Condimentos' },
]

// DATOS DE MENÚ
const menuItems = [
  { id: 1, name: 'Ceviche Clásico', category: 'Ceviches', price: 12500, desc: 'Ceviche tradicional peruano con limón y mariscos frescos' },
  { id: 2, name: 'Ceviche Mixto', category: 'Ceviches', price: 18900, desc: 'Combinación de camarones, pez espada y pulpo' },
  { id: 3, name: 'Ceviche de Camarones', category: 'Ceviches', price: 16500, desc: 'Camarones frescos marinados en limón y ají' },
  { id: 4, name: 'Tiradito de Salmón', category: 'Tiraditos', price: 14200, desc: 'Salmón crudo en finas láminas con salsa de ají' },
  { id: 5, name: 'Leche de Tigre', category: 'Bebidas', price: 4500, desc: 'Bebida refrescante a base de limón y mariscos' },
  { id: 6, name: 'Causa Limeña', category: 'Entrada', price: 8900, desc: 'Puré de papa amarilla con limón y vegetales' },
  { id: 7, name: 'Arroz con Mariscos', category: 'Platos Fuertes', price: 15800, desc: 'Arroz con camarones, almejas y tentáculo de pulpo' },
  { id: 8, name: 'Chicha Morada', category: 'Bebidas', price: 3500, desc: 'Bebida tradicional a base de maíz morado' },
]

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('stock')
  const [searchTerm, setSearchTerm] = useState('')

  const lowStockCount = inventory.filter(i => i.qty <= i.minQty).length
  const warningStockCount = inventory.filter(i => i.qty > i.minQty && i.qty < 20).length

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMenu = menuItems.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Inventario y Catálogo</h1>
          <p className="text-gray-600 text-sm">Gestión de stock y productos del menú</p>
        </div>
        <button className="btn btn-primary btn-md gap-2 bg-cyan-600 hover:bg-cyan-700 border-0 text-white font-semibold shadow-lg shadow-cyan-600/30">
          <PlusIcon className="w-5 h-5" />
          Agregar Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
              <CubeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-blue-700">Total de Items</div>
              <div className="text-3xl font-bold text-blue-900">{inventory.length}</div>
              <div className="text-xs text-blue-600 mt-1">{inventory.length} productos en stock</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-amber-700">Stock Bajo</div>
              <div className="text-3xl font-bold text-amber-900">{warningStockCount}</div>
              <div className="text-xs text-amber-600 mt-1">Requiere restock pronto</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-red-700">Crítico</div>
              <div className="text-3xl font-bold text-red-900">{lowStockCount}</div>
              <div className="text-xs text-red-600 mt-1">Acción inmediata requerida</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 pb-3">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-2 rounded-t-lg font-semibold transition-all ${
            activeTab === 'stock'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100 border-b-2 border-transparent'
          }`}
        >
          <CubeIcon className="w-5 h-5" />
          Stock
          <span className={`badge text-xs font-bold ${activeTab === 'stock' ? 'badge-neutral' : 'badge-ghost'}`}>
            {inventory.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-5 py-2 rounded-t-lg font-semibold transition-all ${
            activeTab === 'menu'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100 border-b-2 border-transparent'
          }`}
        >
          <CheckCircleIcon className="w-5 h-5" />
          Menú
          <span className={`badge text-xs font-bold ${activeTab === 'menu' ? 'badge-neutral' : 'badge-ghost'}`}>
            {menuItems.length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="form-control">
        <div className="input-group shadow-md">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered flex-1 focus:outline-none"
          />
          <button className="btn btn-primary bg-cyan-600 hover:bg-cyan-700 border-0 text-white gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Buscar
          </button>
        </div>
      </div>

      {/* Stock Tab - Table */}
      {activeTab === 'stock' && (
        <div className="card bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="font-bold text-gray-800 text-left">Producto</th>
                  <th className="font-bold text-gray-800 text-center">Stock</th>
                  <th className="font-bold text-gray-800 text-center">Mínimo</th>
                  <th className="font-bold text-gray-800 text-center">Unidad</th>
                  <th className="font-bold text-gray-800 text-center">Categoría</th>
                  <th className="font-bold text-gray-800 text-center">Estado</th>
                  <th className="font-bold text-gray-800 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item, idx) => (
                  <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50 transition-colors border-b border-gray-200`}>
                    <td className="font-semibold text-gray-800 py-3">{item.name}</td>
                    <td className="text-center">
                      <span className="font-bold text-lg text-cyan-700">{item.qty}</span>
                    </td>
                    <td className="text-center text-gray-600">{item.minQty}</td>
                    <td className="text-center text-sm text-gray-600">{item.unit}</td>
                    <td className="text-center">
                      <span className="badge badge-sm badge-outline badge-primary">{item.category}</span>
                    </td>
                    <td className="text-center">
                      {item.qty <= item.minQty ? (
                        <span className="badge badge-error text-white font-bold">● Crítico</span>
                      ) : item.qty < 20 ? (
                        <span className="badge badge-warning text-white font-bold">● Bajo</span>
                      ) : (
                        <span className="badge badge-success text-white font-bold">✓ OK</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex gap-2 justify-center">
                        <button className="btn btn-sm btn-ghost text-cyan-600 hover:bg-cyan-100 gap-1">
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-sm btn-ghost text-gray-600 hover:bg-gray-200 gap-1">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Menu Tab - Grid */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenu.map(item => (
            <div key={item.id} className="card bg-white border border-gray-200 hover:shadow-lg transition-all">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                    <span className="badge badge-sm badge-outline badge-primary text-cyan-700 font-semibold">{item.category}</span>
                  </div>
                  <span className="font-bold text-xl text-cyan-600 ml-2">₡{item.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{item.desc}</p>
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button className="btn btn-outline btn-sm flex-1 text-cyan-600 border-cyan-600 hover:bg-cyan-600 hover:text-white gap-1">
                    <PencilSquareIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-100">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
