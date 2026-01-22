import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const reportData = [
  { label: 'Ventas Totales', value: '₡12,345,000', trend: '+15%', icon: ArrowTrendingUpIcon, color: 'green' },
  { label: 'Transacciones', value: '1,234', trend: '+8%', icon: ChartBarIcon, color: 'blue' },
  { label: 'Ticket Promedio', value: '₡10,012', trend: '-2%', icon: ChartBarIcon, color: 'cyan' },
  { label: 'Metodos de Pago', value: '3', trend: 'Activos', icon: DocumentArrowDownIcon, color: 'purple' },
]

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="w-8 h-8 text-cyan-600" />
          Reportes de Ventas
        </h1>
        <p className="text-gray-600 text-sm mt-1">Analisis y estadisticas de desempeno</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Desde</label>
          <input
            type="date"
            defaultValue="2025-01-01"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Hasta</label>
          <input
            type="date"
            defaultValue="2025-01-10"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <div className="flex items-end gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
            <ArrowPathIcon className="w-4 h-4" />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">
            <DocumentArrowDownIcon className="w-4 h-4" />
            Descargar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportData.map((item, idx) => {
          const Icon = item.icon
          const colorClasses = {
            green: 'bg-green-50 text-green-600 border-green-200',
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
          }

          return (
            <div key={idx} className={`rounded-lg border p-4 ${colorClasses[item.color]}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700">{item.label}</h3>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className={`text-xs mt-2 font-semibold ${item.trend.includes('+') ? 'text-green-600' : item.trend.includes('-') ? 'text-red-600' : 'text-gray-600'}`}>
                {item.trend}
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Placeholder 1 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ventas por Dia</h3>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Grafico de ventas diarias</p>
            </div>
          </div>
        </div>

        {/* Chart Placeholder 2 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Metodos de Pago</h3>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Distribucion por metodo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Detalle de Ventas por Categoria</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Categoria</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">Cantidad</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">Monto</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">% Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Ceviches', qty: 245, amount: 3087500, pct: 25 },
                { cat: 'Entradas', qty: 189, amount: 1512000, pct: 12.2 },
                { cat: 'Acompañamientos', qty: 312, amount: 1872000, pct: 15.2 },
                { cat: 'Bebidas', qty: 488, amount: 976000, pct: 7.9 },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{row.cat}</td>
                  <td className="text-right py-3 px-4 text-gray-700">{row.qty}</td>
                  <td className="text-right py-3 px-4 font-semibold text-cyan-600">₡{row.amount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-gray-700">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
