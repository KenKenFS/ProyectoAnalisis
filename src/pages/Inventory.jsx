import { useState } from 'react'
import { inventory, menuItems } from '../data/fakeData'
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

export default function Inventory() {
  const [showForm, setShowForm] = useState(false)
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Inventario y Catálogo</h1>
          <p className="text-gray-600 text-sm">Gestión de stock y productos del menú</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {showForm ? 'Cerrar' : 'Agregar Item'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CubeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{inventory.length}</div>
              <div className="text-xs text-gray-500">Total items</div>
            </div>
          </div>
        </div>
        <div className="card bg-white border border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{warningStockCount}</div>
              <div className="text-xs text-gray-500">Stock bajo</div>
            </div>
          </div>
        </div>
        <div className="card bg-white border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
              <div className="text-xs text-gray-500">Crítico</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Nuevo Artículo de Inventario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nombre</span></label>
              <input className="input input-bordered" placeholder="Ej: Pescado fresco" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Cantidad</span></label>
              <input className="input input-bordered" type="number" placeholder="0" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Unidad</span></label>
              <select className="select select-bordered">
                <option>kg</option>
                <option>uds</option>
                <option>L</option>
                <option>g</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Mínimo</span></label>
              <input className="input input-bordered" type="number" placeholder="10" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-success gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              Guardar
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'stock'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Stock ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'menu'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Menú ({menuItems.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input input-bordered w-full pl-10"
        />
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="card bg-white border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                  <th>Último Restock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(i => (
                  <tr
                    key={i.id}
                    className={`${
                      i.qty <= i.minQty ? 'bg-red-50' : i.qty < 20 ? 'bg-amber-50' : ''
                    }`}
                  >
                    <td className="font-medium">{i.name}</td>
                    <td>
                      <span className={`font-bold ${
                        i.qty <= i.minQty ? 'text-red-600' : i.qty < 20 ? 'text-amber-600' : 'text-gray-800'
                      }`}>
                        {i.qty} {i.unit}
                      </span>
                    </td>
                    <td className="text-gray-600">{i.minQty} {i.unit}</td>
                    <td>
                      {i.qty <= i.minQty ? (
                        <span className="badge badge-error gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          URGENTE
                        </span>
                      ) : i.qty < 20 ? (
                        <span className="badge badge-warning gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          BAJO
                        </span>
                      ) : (
                        <span className="badge badge-success gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-gray-500">{i.lastRestock}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm btn-circle">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-circle text-primary">
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-circle text-red-500">
                          <TrashIcon className="w-4 h-4" />
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

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenu.map(m => (
            <div key={m.id} className="card bg-white border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <span className="text-5xl">
                  {m.category === 'Ceviches' ? '🐟' : 
                   m.category === 'Bebidas' ? '🍹' : 
                   m.category === 'Entradas' ? '🥗' : 
                   m.category === 'Acompañamientos' ? '🍟' : '🍽️'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{m.name}</h3>
                    <span className="badge badge-ghost badge-sm">{m.category}</span>
                  </div>
                  <div className="font-bold text-primary">₡{(m.price * 700).toLocaleString()}</div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{m.desc}</p>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-outline btn-sm flex-1 gap-1">
                    <PencilSquareIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button className="btn btn-ghost btn-sm text-red-500">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Low Stock Alert Section */}
      {lowStockCount > 0 && (
        <div className="card bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-800">Alertas de Stock Crítico</h3>
          </div>
          <div className="space-y-2">
            {inventory.filter(i => i.qty <= i.minQty).map(i => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-red-500">
                <div>
                  <div className="font-medium text-gray-800">{i.name}</div>
                  <div className="text-sm text-gray-500">
                    Actual: {i.qty} {i.unit} | Mínimo: {i.minQty} {i.unit}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm gap-1">
                  <ArrowPathIcon className="w-4 h-4" />
                  Reabastecer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
