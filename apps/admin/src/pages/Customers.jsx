import { useState } from 'react'
import {
  UsersIcon,
  StarIcon,
  GiftIcon,
  TrophyIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const tiers = [
  { id: 'standard', name: 'Estándar', color: 'from-gray-500 to-gray-600', minPoints: 0, benefits: ['Descuento 5%', 'Cumpleaños gratis'] },
  { id: 'bronze', name: 'Bronce', color: 'from-amber-600 to-amber-700', minPoints: 100, benefits: ['Descuento 10%', 'Prioridad atención', 'Acceso a promociones'] },
  { id: 'silver', name: 'Plata', color: 'from-slate-400 to-slate-500', minPoints: 500, benefits: ['Descuento 15%', 'Mesa reservada', 'Chef exclusivo'] },
  { id: 'gold', name: 'Oro', color: 'from-yellow-500 to-yellow-600', minPoints: 1500, benefits: ['Descuento 20%', 'Private room', 'Cena especial mensual'] },
]

const customers = [
  { id: 1, name: 'Carlos Rodríguez', tier: 'gold', points: 2450, totalSpend: '₡125,500', visits: 24 },
  { id: 2, name: 'María García', tier: 'silver', points: 850, totalSpend: '₡45,200', visits: 12 },
  { id: 3, name: 'Juan López', tier: 'bronze', points: 250, totalSpend: '₡18,900', visits: 5 },
  { id: 4, name: 'Ana Martínez', tier: 'standard', points: 45, totalSpend: '₡8,500', visits: 2 },
  { id: 5, name: 'Pedro Sánchez', tier: 'gold', points: 3100, totalSpend: '₡210,800', visits: 41 },
]

export default function Customers() {
  const [activeTab, setActiveTab] = useState('customers')

  const getTierColor = (tierId) => {
    const tier = tiers.find(t => t.id === tierId)
    return tier ? tier.color : 'from-gray-500 to-gray-600'
  }

  const getTierName = (tierId) => {
    const tier = tiers.find(t => t.id === tierId)
    return tier ? tier.name : 'Desconocido'
  }

  const getTierIcon = (tierId) => {
    const tierMap = {
      standard: '⭐',
      bronze: '🥉',
      silver: '🥈',
      gold: '👑'
    }
    return tierMap[tierId] || '⭐'
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-poppins">Gestión de Clientes</h1>
        <p className="text-gray-600 mt-1">Programa de fidelización y rewards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="text-blue-100 text-sm">Total Clientes</div>
            <div className="text-3xl font-bold">156</div>
            <div className="text-blue-200 text-xs">+12 este mes</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="text-yellow-100 text-sm">VIP (Oro)</div>
            <div className="text-3xl font-bold">24</div>
            <div className="text-yellow-200 text-xs">15% del total</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="text-green-100 text-sm">Gasto Total</div>
            <div className="text-3xl font-bold">₡2.5M</div>
            <div className="text-green-200 text-xs">Año actual</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="text-purple-100 text-sm">Puntos Emitidos</div>
            <div className="text-3xl font-bold">8.4K</div>
            <div className="text-purple-200 text-xs">Disponibles</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card bg-white shadow-lg">
        <div className="tabs tabs-bordered">
          <button
            onClick={() => setActiveTab('customers')}
            className={`tab tab-lg ${activeTab === 'customers' ? 'tab-active' : ''}`}
          >
            <UsersIcon className="w-5 h-5 mr-2" />
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`tab tab-lg ${activeTab === 'tiers' ? 'tab-active' : ''}`}
          >
            <TrophyIcon className="w-5 h-5 mr-2" />
            Niveles
          </button>
        </div>

        <div className="p-6">
          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left">Cliente</th>
                    <th className="text-center">Nivel</th>
                    <th className="text-right">Puntos</th>
                    <th className="text-right">Gasto Total</th>
                    <th className="text-center">Visitas</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="font-medium">{customer.name}</td>
                      <td className="text-center">
                        <span className={`badge badge-lg gap-2 bg-gradient-to-r ${getTierColor(customer.tier)} text-white`}>
                          {getTierIcon(customer.tier)} {getTierName(customer.tier)}
                        </span>
                      </td>
                      <td className="text-right font-bold">{customer.points}</td>
                      <td className="text-right">{customer.totalSpend}</td>
                      <td className="text-center">{customer.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tiers Tab */}
          {activeTab === 'tiers' && (
            <div className="space-y-4">
              {tiers.map(tier => (
                <div key={tier.id} className={`p-4 rounded-xl border-2 border-gray-200 bg-gradient-to-r ${tier.color} bg-opacity-10`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                    <span className="text-4xl">{tiers.indexOf(tier) === 0 ? '⭐' : tiers.indexOf(tier) === 1 ? '🥉' : tiers.indexOf(tier) === 2 ? '🥈' : '👑'}</span>
                  </div>
                  <p className="text-gray-600 mb-3">Mínimo de puntos: {tier.minPoints}</p>
                  <div className="flex flex-wrap gap-2">
                    {tier.benefits.map(benefit => (
                      <span key={benefit} className="badge badge-lg">{benefit}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
