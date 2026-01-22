import { useState } from 'react'

export default function TablesPage() {
  const [tables] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">🍽️ Mesas Disponibles</h1>
        <p className="text-gray-600 mt-2">Selecciona una mesa para tomar pedido</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {tables.map((table) => (
          <button
            key={table}
            className="aspect-square bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all text-3xl font-bold cursor-pointer active:scale-95"
          >
            Mesa<br />{table}
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <p className="text-blue-800 font-semibold">💡 Tip: Toca una mesa para comenzar a tomar el pedido</p>
      </div>
    </div>
  )
}
