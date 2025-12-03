import { useState } from 'react'
import { promotions } from '../data/fakeData'
import {
  GiftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'

export default function Promotions() {
  const [showForm, setShowForm] = useState(false)

  const activePromos = promotions.filter(p => p.active).length

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 shadow-lg shadow-green-500/20">
          <div className="flex items-center gap-3">
            <GiftIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">{activePromos}</div>
              <div className="text-green-100 text-xs">Promos activas</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-violet-600 text-white p-4 shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <StarIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">24</div>
              <div className="text-purple-100 text-xs">Clientes VIP</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 shadow-lg shadow-pink-500/20">
          <div className="flex items-center gap-3">
            <TicketIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">3,480</div>
              <div className="text-pink-100 text-xs">Puntos totales</div>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-lg shadow-orange-500/20">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 opacity-80" />
            <div>
              <div className="text-2xl font-bold">17</div>
              <div className="text-amber-100 text-xs">Canjes este mes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-pink-500" />
            Nueva Promoción
          </h3>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nombre de la promoción</span></label>
              <input className="input input-bordered" placeholder="Ej: 2x1 en Ceviches" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Descripción</span></label>
              <textarea className="textarea textarea-bordered" placeholder="Detalles de la promoción..." rows="2"></textarea>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Descuento</span></label>
                <input className="input input-bordered" type="number" placeholder="10" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tipo</span></label>
                <select className="select select-bordered">
                  <option>Porcentaje</option>
                  <option>Monto fijo</option>
                  <option>2x1</option>
                  <option>3x2</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Válido hasta</span></label>
                <input className="input input-bordered" type="date" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-success gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Crear promoción
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Promotions */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            Promociones Activas
          </h3>
          <div className="space-y-4">
            {promotions.filter(p => p.active).map(p => (
              <div key={p.id} className="card bg-white border-l-4 border-green-500 shadow-md hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800">{p.title}</h4>
                      <span className="badge badge-success badge-sm">Activa</span>
                    </div>
                    <span className="badge bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-lg px-3 py-2">
                      {p.discount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{p.desc}</p>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm flex-1 gap-1">
                      <PencilSquareIcon className="w-4 h-4" />
                      Editar
                    </button>
                    <button className="btn btn-ghost btn-sm text-red-500 gap-1">
                      <XCircleIcon className="w-4 h-4" />
                      Desactivar
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
          <div className="space-y-4">
            {promotions.filter(p => !p.active).map(p => (
              <div key={p.id} className="card bg-gray-50 border-l-4 border-gray-300 opacity-75">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-700">{p.title}</h4>
                      <span className="badge badge-ghost badge-sm">Inactiva</span>
                    </div>
                    <span className="badge bg-gray-400 text-white border-0 text-lg px-3 py-2">
                      {p.discount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm flex-1 gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Activar
                    </button>
                    <button className="btn btn-ghost btn-sm text-red-500 gap-1">
                      <TrashIcon className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loyalty Program */}
      <div className="card bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100 border border-purple-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-500" />
          Programa de Fidelización
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border-l-4 border-purple-500 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-800">24</div>
                <div className="text-xs text-gray-500">Clientes VIP</div>
              </div>
            </div>
            <div className="text-xs text-purple-600 mt-2">+5 este mes</div>
          </div>

          <div className="bg-white rounded-xl p-4 border-l-4 border-pink-500 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-800">128</div>
                <div className="text-xs text-gray-500">Visitas frecuentes</div>
              </div>
            </div>
            <div className="text-xs text-pink-600 mt-2">Este mes</div>
          </div>

          <div className="bg-white rounded-xl p-4 border-l-4 border-rose-500 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <GiftIcon className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-800">17</div>
                <div className="text-xs text-gray-500">Recompensas canjeadas</div>
              </div>
            </div>
            <div className="text-xs text-rose-600 mt-2">Este mes</div>
          </div>
        </div>

        {/* Rewards Tiers */}
        <div className="bg-white rounded-xl p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Niveles de Recompensas</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl">🥉</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">Bronce</div>
                <div className="text-xs text-gray-500">0 - 500 puntos</div>
              </div>
              <div className="text-amber-600 font-semibold">5% descuento</div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
              <div className="text-2xl">🥈</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">Plata</div>
                <div className="text-xs text-gray-500">501 - 1000 puntos</div>
              </div>
              <div className="text-gray-600 font-semibold">10% descuento</div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl">🥇</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">Oro</div>
                <div className="text-xs text-gray-500">1001+ puntos</div>
              </div>
              <div className="text-yellow-600 font-semibold">15% descuento</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
