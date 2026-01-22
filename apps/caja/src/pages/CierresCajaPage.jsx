import { useState } from 'react'
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PlusIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const closures = [
  {
    id: 1,
    date: '2025-01-10',
    time: '18:30',
    initialAmount: 500000,
    sales: 1245000,
    expenses: 150000,
    finalAmount: 1595000,
    cashier: 'Juan Perez',
    status: 'Completo',
  },
  {
    id: 2,
    date: '2025-01-09',
    time: '18:45',
    initialAmount: 500000,
    sales: 987500,
    expenses: 120000,
    finalAmount: 1367500,
    cashier: 'Maria Lopez',
    status: 'Completo',
  },
]

export default function CierresCajaPage() {
  const [selectedClosure, setSelectedClosure] = useState(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CurrencyDollarIcon className="w-8 h-8 text-cyan-600" />
          Cierres de Caja
        </h1>
        <p className="text-gray-600 text-sm mt-1">Gestion de cierres de turno y arqueos de caja</p>
      </div>

      {/* Actions */}
      <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition">
        <PlusIcon className="w-5 h-5" />
        Nuevo Cierre de Caja
      </button>

      {/* Closures List */}
      <div className="grid grid-cols-1 gap-4">
        {closures.map(closure => (
          <div
            key={closure.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedClosure(closure)}
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{closure.date}</div>
                  <div className="text-xs text-gray-500">{closure.time}</div>
                </div>
              </div>

              {/* Cashier */}
              <div>
                <div className="text-xs text-gray-500 uppercase">Cajero</div>
                <div className="font-semibold text-gray-900">{closure.cashier}</div>
              </div>

              {/* Amounts */}
              <div>
                <div className="text-xs text-gray-500 uppercase">Ventas</div>
                <div className="font-bold text-cyan-600">₡{closure.sales.toLocaleString()}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase">Gastos</div>
                <div className="font-semibold text-red-600">₡{closure.expenses.toLocaleString()}</div>
              </div>

              {/* Status & Final Amount */}
              <div className="md:text-right">
                <div className="flex items-center gap-1 justify-end mb-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">{closure.status}</span>
                </div>
                <div className="text-xs text-gray-500 uppercase">Total Final</div>
                <div className="font-bold text-lg text-green-600">₡{closure.finalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedClosure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-6 flex justify-between items-center">
              <h3 className="font-bold text-xl">Detalle del Cierre</h3>
              <button
                onClick={() => setSelectedClosure(null)}
                className="hover:bg-white/20 w-8 h-8 flex items-center justify-center rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Fecha</div>
                  <div className="font-bold text-lg text-gray-900">{selectedClosure.date}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Hora</div>
                  <div className="font-bold text-lg text-gray-900">{selectedClosure.time}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Cajero</div>
                  <div className="font-bold text-lg text-gray-900">{selectedClosure.cashier}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Estado</div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-600">{selectedClosure.status}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Financial Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">Monto Inicial</span>
                  <span className="font-bold text-lg text-blue-600">₡{selectedClosure.initialAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Ventas del Dia</span>
                  <span className="font-bold text-lg text-green-600">+₡{selectedClosure.sales.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-gray-700">Gastos / Retiros</span>
                  <span className="font-bold text-lg text-red-600">-₡{selectedClosure.expenses.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200">
                <span className="font-bold text-lg text-gray-900">TOTAL FINAL</span>
                <span className="font-bold text-2xl text-cyan-600">₡{selectedClosure.finalAmount.toLocaleString()}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                  <PrinterIcon className="w-4 h-4" />
                  Imprimir
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
