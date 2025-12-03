import { transactions, orders } from '../data/fakeData'
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

export default function Accounting() {
  const totalIncome = transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = Math.abs(transactions.filter(t => t.type === 'egreso').reduce((s, t) => s + t.amount, 0))
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
                <ArrowTrendingUpIcon className="w-4 h-4" />
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
                <ArrowTrendingDownIcon className="w-4 h-4" />
                Egresos
              </div>
              <div className="text-3xl font-bold mt-2">₡{totalExpenses.toLocaleString()}</div>
              <div className="text-red-100 text-xs mt-1">Este período</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <CurrencyDollarIcon className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className={`card ${balance >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-amber-600'} text-white p-6 shadow-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm font-medium">Balance Neto</div>
              <div className="text-3xl font-bold mt-2">₡{balance.toLocaleString()}</div>
              <div className="text-blue-100 text-xs mt-1">{balance >= 0 ? 'Positivo' : 'Negativo'}</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              {balance >= 0 ? (
                <ArrowTrendingUpIcon className="w-8 h-8" />
              ) : (
                <ArrowTrendingDownIcon className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Sheet */}
        <div className="card bg-white border border-gray-100 p-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-primary" />
            Balance General (Simulado)
          </h2>

          <div className="space-y-4">
            {/* Assets */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-green-800">Activos</span>
                <span className="font-bold text-green-800">₡1,200,000</span>
              </div>
              <div className="space-y-1 text-sm text-green-700 ml-4">
                <div className="flex justify-between">
                  <span>• Efectivo y bancos</span>
                  <span>₡450,000</span>
                </div>
                <div className="flex justify-between">
                  <span>• Equipo de cocina</span>
                  <span>₡500,000</span>
                </div>
                <div className="flex justify-between">
                  <span>• Inventario</span>
                  <span>₡250,000</span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-red-800">Pasivos</span>
                <span className="font-bold text-red-800">₡300,000</span>
              </div>
              <div className="space-y-1 text-sm text-red-700 ml-4">
                <div className="flex justify-between">
                  <span>• Cuentas por pagar</span>
                  <span>₡200,000</span>
                </div>
                <div className="flex justify-between">
                  <span>• Préstamos</span>
                  <span>₡100,000</span>
                </div>
              </div>
            </div>

            <div className="divider my-2"></div>

            {/* Equity */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-800">Patrimonio</span>
                <span className="font-bold text-2xl text-blue-800">₡900,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card bg-white border border-gray-100 p-6">
          <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-primary" />
            Historial de Transacciones
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transactions.map(t => (
              <div
                key={t.id}
                className={`p-4 rounded-lg border-l-4 ${
                  t.type === 'ingreso'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-800">{t.desc}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.date}</div>
                  </div>
                  <div className={`font-bold text-lg ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'ingreso' ? '+' : '-'} ₡{Math.abs(t.amount).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Sales */}
      <div className="card bg-white border border-gray-100 p-6">
        <h2 className="font-bold text-lg text-gray-800 mb-4">Resumen de Ventas del Día</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {orders.map((o, i) => (
            <div key={i} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-center">
              <div className="text-xs text-gray-500 mb-1">Mesa {o.table}</div>
              <div className="font-bold text-xl text-gray-800">₡{(o.total * 700).toLocaleString()}</div>
              <div className="text-xs font-mono text-gray-400 mt-1">{o.id}</div>
              <div className={`badge badge-sm mt-2 ${
                o.status === 'ready' ? 'badge-success' : 
                o.status === 'preparing' ? 'badge-warning' : 'badge-ghost'
              }`}>
                {o.status}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-primary/10 rounded-lg flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total del día:</span>
          <span className="font-bold text-2xl text-primary">
            ₡{orders.reduce((sum, o) => sum + o.total * 700, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
