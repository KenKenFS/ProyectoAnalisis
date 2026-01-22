import { useState } from 'react'
import {
  GiftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const promotions = [
  { id: 1, title: 'Descuento en Ceviches', description: 'Todos los ceviches con 20% de descuento', discount: '20%', active: true },
  { id: 2, title: 'Happy Hour Bebidas', description: 'Bebidas alcohólicas al 30% menos', discount: '30%', active: true },
  { id: 3, title: 'Menú Ejecutivo', description: 'Entrada + plato principal + postre', discount: '15%', active: true },
  { id: 4, title: 'Promoción Grupo', description: 'Grupos de 6+ personas: descuento en factura', discount: '25%', active: false },
  { id: 5, title: 'Viernes Especial', description: 'Platos seleccionados con 40% de descuento', discount: '40%', active: false },
  { id: 6, title: 'Programa de Puntos', description: 'Acumula puntos en cada compra', discount: '10%', active: true },
]

export default function Promotions() {
  const [showForm, setShowForm] = useState(false)

  const activePromos = promotions.filter(p => p.active).length
  const inactivePromos = promotions.filter(p => !p.active).length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Promociones y Fidelización</h1>
          <p className="text-gray-600 text-sm">Gestión de ofertas y programa de lealtad</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {showForm ? 'Cerrar' : 'Nueva Promoción'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 shadow-lg shadow-green-500/20">
          <div className="flex items-center gap-3">
            <GiftIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">{activePromos}</div>
              <div className="text-green-100 text-xs">Activas</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-violet-600 text-white p-4 shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">{inactivePromos}</div>
              <div className="text-purple-100 text-xs">Inactivas</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-lg shadow-orange-500/20">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">{promotions.length}</div>
              <div className="text-amber-100 text-xs">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Promotions */}
      <div>
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
          Promociones Activas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.filter(p => p.active).map(p => (
            <div key={p.id} className="card bg-white border-l-4 border-green-500 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{p.title}</h4>
                    <span className="badge badge-success badge-sm">Activa</span>
                  </div>
                  <span className="badge bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-lg px-3 py-2">
                    {p.discount}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{p.description}</p>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm flex-1 gap-1">
                    <PencilSquareIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button className="btn btn-ghost btn-sm text-red-500 gap-1">
                    <XCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Promotions */}
      <div>
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <XCircleIcon className="w-5 h-5 text-gray-400" />
          Promociones Inactivas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.filter(p => !p.active).map(p => (
            <div key={p.id} className="card bg-gray-50 border-l-4 border-gray-300 opacity-75 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-700 text-lg">{p.title}</h4>
                    <span className="badge badge-ghost badge-sm">Inactiva</span>
                  </div>
                  <span className="badge bg-gray-400 text-white border-0 text-lg px-3 py-2">
                    {p.discount}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{p.description}</p>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm flex-1 gap-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    Activar
                  </button>
                  <button className="btn btn-ghost btn-sm text-red-500 gap-1">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
