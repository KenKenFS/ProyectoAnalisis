import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

const transactions = [
  { id: 1, date: '2026-01-17', description: 'Venta - Mesa 1', amount: 45000, type: 'ingreso' },
  { id: 2, date: '2026-01-17', description: 'Venta - Mesa 2', amount: 32000, type: 'ingreso' },
  { id: 3, date: '2026-01-17', description: 'Venta - Mesa 3', amount: 58000, type: 'ingreso' },
  { id: 4, date: '2026-01-17', description: 'Compra de insumos', amount: 15000, type: 'egreso' },
  { id: 5, date: '2026-01-16', description: 'Venta - Mesa 4', amount: 67000, type: 'ingreso' },
  { id: 6, date: '2026-01-16', description: 'Pago de servicios', amount: 25000, type: 'egreso' },
  { id: 7, date: '2026-01-16', description: 'Venta - Mesa 5', amount: 42000, type: 'ingreso' },
  { id: 8, date: '2026-01-16', description: 'Compra de bebidas', amount: 18000, type: 'egreso' },
  { id: 9, date: '2026-01-15', description: 'Venta - Mesa 6', amount: 55000, type: 'ingreso' },
  { id: 10, date: '2026-01-15', description: 'Mantenimiento', amount: 8000, type: 'egreso' },
  { id: 11, date: '2026-01-15', description: 'Venta - Mesa 7', amount: 38000, type: 'ingreso' },
  { id: 12, date: '2026-01-15', description: 'Salarios', amount: 120000, type: 'egreso' },
  { id: 13, date: '2026-01-14', description: 'Venta - Eventos', amount: 150000, type: 'ingreso' },
  { id: 14, date: '2026-01-14', description: 'Decoración', amount: 35000, type: 'egreso' },
  { id: 15, date: '2026-01-14', description: 'Venta - Mesa 8', amount: 61000, type: 'ingreso' },
  { id: 16, date: '2026-01-13', description: 'Transporte', amount: 12000, type: 'egreso' },
  { id: 17, date: '2026-01-13', description: 'Venta - Catering', amount: 200000, type: 'ingreso' },
  { id: 18, date: '2026-01-13', description: 'Publicidad', amount: 20000, type: 'egreso' },
  { id: 19, date: '2026-01-12', description: 'Venta - Mesa 1', amount: 48000, type: 'ingreso' },
  { id: 20, date: '2026-01-12', description: 'Suministros', amount: 22000, type: 'egreso' },
]

export default function Accounting() {
  const totalIncome = transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'egreso').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpenses

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Contabilidad y Finanzas</h1>
          <p className="text-gray-600 text-sm">Control financiero y transacciones del negocio</p>
        </div>
        <button className="btn btn-outline gap-2" disabled>
          <DocumentArrowDownIcon className="w-5 h-5" />
          Exportar Reporte
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 shadow-xl shadow-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium flex items-center gap-1">
                <ArrowUpIcon className="w-4 h-4" />
                Ingresos
              </div>
              <div className="text-3xl font-bold mt-2">₡{totalIncome.toLocaleString()}</div>
              <div className="text-green-100 text-xs mt-1">Este período</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <BanknotesIcon className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-rose-600 text-white p-6 shadow-xl shadow-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-100 text-sm font-medium flex items-center gap-1">
                <ArrowDownIcon className="w-4 h-4" />
                Egresos
              </div>
              <div className="text-3xl font-bold mt-2">₡{totalExpenses.toLocaleString()}</div>
              <div className="text-red-100 text-xs mt-1">Este período</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowDownIcon className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className={`card ${balance >= 0 ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-orange-500 to-amber-600'} text-white p-6 shadow-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`${balance >= 0 ? 'text-cyan-100' : 'text-orange-100'} text-sm font-medium`}>Balance Neto</div>
              <div className="text-3xl font-bold mt-2">₡{balance.toLocaleString()}</div>
              <div className={`${balance >= 0 ? 'text-cyan-100' : 'text-orange-100'} text-xs mt-1`}>{balance >= 0 ? 'Positivo' : 'Negativo'}</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              {balance >= 0 ? (
                <ArrowUpIcon className="w-8 h-8" />
              ) : (
                <ArrowDownIcon className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card bg-white border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="font-bold text-lg text-gray-800">Últimas Transacciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="font-semibold text-gray-700">Fecha</th>
                <th className="font-semibold text-gray-700">Descripción</th>
                <th className="font-semibold text-gray-700">Monto</th>
                <th className="font-semibold text-gray-700">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                  <td className="text-sm text-gray-600">{t.date}</td>
                  <td className="text-sm text-gray-800 font-medium">{t.description}</td>
                  <td className={`font-bold ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'ingreso' ? '+' : '-'}₡{t.amount.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${t.type === 'ingreso' ? 'badge-success' : 'badge-error'}`}>
                      {t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
