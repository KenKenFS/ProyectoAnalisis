import { reports } from '../data/fakeData'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-3 h-52 p-4">
      {data.map(d => (
        <div key={d.day} className="flex-1 flex flex-col items-center">
          <div className="text-xs font-bold text-gray-700 mb-2">₡{d.value}</div>
          <div
            className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-cyan-500"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: '20px' }}
          />
          <div className="text-xs font-semibold text-gray-600 mt-2">{d.day}</div>
        </div>
      ))}
    </div>
  )
}

function TopItemsChart({ data }) {
  const maxSold = Math.max(...data.map(d => d.sold))
  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
            idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
            'bg-gray-200 text-gray-600'
          }`}>
            {idx + 1}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-gray-800">{item.name}</span>
              <span className="text-sm text-gray-600">{item.sold} vendidos</span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-500"
                style={{ width: `${(item.sold / maxSold) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="font-bold text-primary">₡{(item.rev * 700).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const profit = reports.monthlyRevenue - reports.monthlyExpenses
  const margin = ((profit / reports.monthlyRevenue) * 100).toFixed(1)
  const roi = ((profit / reports.monthlyExpenses) * 100).toFixed(0)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Reportería y Análisis</h1>
          <p className="text-gray-600 text-sm">Métricas de rendimiento y análisis del negocio</p>
        </div>
        <div className="flex gap-2">
          <select className="select select-bordered select-sm">
            <option>Esta semana</option>
            <option>Este mes</option>
            <option>Este año</option>
          </select>
          <button className="btn btn-outline btn-sm gap-2">
            <DocumentArrowDownIcon className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 shadow-xl shadow-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <ArrowTrendingUpIcon className="w-6 h-6" />
            <span className="text-green-100 font-medium">Ingresos del Mes</span>
          </div>
          <div className="text-3xl font-bold">₡{reports.monthlyRevenue.toLocaleString()}</div>
          <div className="text-green-100 text-sm mt-2">+15% vs mes anterior</div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-rose-600 text-white p-6 shadow-xl shadow-red-500/20">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-red-100 font-medium">Gastos del Mes</span>
          </div>
          <div className="text-3xl font-bold">₡{reports.monthlyExpenses.toLocaleString()}</div>
          <div className="text-red-100 text-sm mt-2">-5% vs mes anterior</div>
        </div>

        <div className={`card ${profit > 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-amber-600'} text-white p-6 shadow-xl`}>
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-blue-100 font-medium">Ganancia Neta</span>
          </div>
          <div className="text-3xl font-bold">₡{profit.toLocaleString()}</div>
          <div className="text-blue-100 text-sm mt-2">Margen: {margin}%</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day */}
        <div className="card bg-white border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg text-gray-800">Ventas por Día (Esta Semana)</h2>
          </div>
          <BarChart data={reports.salesByDay} />
          <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
            <span className="text-gray-600">Total semana: </span>
            <span className="font-bold text-primary">
              ₡{reports.salesByDay.reduce((s, d) => s + d.value, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top Items */}
        <div className="card bg-white border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBagIcon className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg text-gray-800">Productos Más Vendidos</h2>
          </div>
          <TopItemsChart data={reports.topItems} />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card bg-white border border-gray-100 p-6">
        <h2 className="font-bold text-lg text-gray-800 mb-6">Indicadores de Desempeño</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-center border border-blue-100">
            <div className="text-sm text-blue-600 mb-1">Margen de Ganancia</div>
            <div className="text-3xl font-bold text-blue-800">{margin}%</div>
            <div className="text-xs text-blue-500 mt-1">↑ 2.3% vs anterior</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center border border-green-100">
            <div className="text-sm text-green-600 mb-1">ROI</div>
            <div className="text-3xl font-bold text-green-800">{roi}%</div>
            <div className="text-xs text-green-500 mt-1">↑ 5.1% vs anterior</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl text-center border border-purple-100">
            <div className="text-sm text-purple-600 mb-1">Ticket Promedio</div>
            <div className="text-3xl font-bold text-purple-800">₡{Math.round(reports.monthlyRevenue / 50).toLocaleString()}</div>
            <div className="text-xs text-purple-500 mt-1">50 transacciones</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl text-center border border-orange-100">
            <div className="text-sm text-orange-600 mb-1">Items por Día</div>
            <div className="text-3xl font-bold text-orange-800">{Math.round(reports.topItems.reduce((s, i) => s + i.sold, 0) / 7)}</div>
            <div className="text-xs text-orange-500 mt-1">Promedio semanal</div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Tendencias</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Crecimiento mensual</span>
              <span className="font-bold text-green-600">+12.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Clientes nuevos</span>
              <span className="font-bold text-blue-600">+28</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Retención de clientes</span>
              <span className="font-bold text-purple-600">78%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Satisfacción promedio</span>
              <span className="font-bold text-amber-600">4.7 ⭐</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Objetivos del Mes</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Ventas</span>
                <span className="font-medium">₡{reports.monthlyRevenue.toLocaleString()} / ₡50,000</span>
              </div>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${Math.min((reports.monthlyRevenue / 50000) * 100, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Nuevos clientes</span>
                <span className="font-medium">28 / 30</span>
              </div>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '93%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Reducción de desperdicios</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
