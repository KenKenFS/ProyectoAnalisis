import {
  ChartBarIcon,
  ArrowUpIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

const salesData = [
  { day: 'Mon', value: 145000 },
  { day: 'Tue', value: 132000 },
  { day: 'Wed', value: 165000 },
  { day: 'Thu', value: 178000 },
  { day: 'Fri', value: 195000 },
  { day: 'Sat', value: 245000 },
  { day: 'Sun', value: 189000 },
]

const topProducts = [
  { name: 'Ceviche Clásico', sold: 156 },
  { name: 'Encebollado', sold: 128 },
  { name: 'Tiradito', sold: 95 },
  { name: 'Causa Limeña', sold: 87 },
  { name: 'Pulpo al Ajillo', sold: 76 },
]

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-3 h-52 p-4">
      {data.map(d => (
        <div key={d.day} className="flex-1 flex flex-col items-center">
          <div className="text-xs font-bold text-gray-700 mb-2">₡{(d.value / 1000).toFixed(0)}k</div>
          <div
            className="w-full bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-cyan-600 hover:to-blue-500"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: '20px' }}
          />
          <div className="text-xs font-semibold text-gray-600 mt-2">{d.day}</div>
        </div>
      ))}
    </div>
  )
}

function TopProductsChart({ data }) {
  const maxSold = Math.max(...data.map(d => d.sold))
  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
            idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
            'bg-gray-400'
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
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(item.sold / maxSold) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const totalSales = salesData.reduce((s, d) => s + d.value, 0)
  const avgSale = totalSales / salesData.length
  const profit = totalSales * 0.35
  const margin = 35
  const roi = 78

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 shadow-xl shadow-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-green-100 font-medium text-sm">Venta Total</span>
          </div>
          <div className="text-3xl font-bold">₡{totalSales.toLocaleString()}</div>
          <div className="text-green-100 text-sm mt-2">+12% vs semana anterior</div>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpIcon className="w-6 h-6" />
            <span className="text-blue-100 font-medium text-sm">Margen %</span>
          </div>
          <div className="text-3xl font-bold">{margin}%</div>
          <div className="text-blue-100 text-sm mt-2">Ganancia neta</div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white p-6 shadow-xl shadow-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBagIcon className="w-6 h-6" />
            <span className="text-purple-100 font-medium text-sm">ROI %</span>
          </div>
          <div className="text-3xl font-bold">{roi}%</div>
          <div className="text-purple-100 text-sm mt-2">Retorno inversión</div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 shadow-xl shadow-orange-500/20">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-orange-100 font-medium text-sm">Ticket Promedio</span>
          </div>
          <div className="text-3xl font-bold">₡{Math.round(avgSale).toLocaleString()}</div>
          <div className="text-orange-100 text-sm mt-2">Por transacción</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="card bg-white border border-gray-200 shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="w-5 h-5 text-cyan-600" />
              <h2 className="font-bold text-lg text-gray-800">Ventas por Día</h2>
            </div>
            <p className="text-sm text-gray-600">Últimos 7 días</p>
          </div>
          <div className="p-4 overflow-x-auto">
            <BarChart data={salesData} />
          </div>
        </div>

        {/* Top Products */}
        <div className="card bg-white border border-gray-200 shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBagIcon className="w-5 h-5 text-cyan-600" />
              <h2 className="font-bold text-lg text-gray-800">Top 5 Productos</h2>
            </div>
            <p className="text-sm text-gray-600">Más vendidos esta semana</p>
          </div>
          <div className="p-6">
            <TopProductsChart data={topProducts} />
          </div>
        </div>
      </div>
    </div>
  )
}
