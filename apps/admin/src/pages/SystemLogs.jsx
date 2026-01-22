import { useState } from 'react'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

const logs = [
  { id: 1, type: 'success', user: 'admin@example.com', action: 'Creó nueva orden #1255', timestamp: '2026-01-17 14:30:22', details: 'Orden de ceviche clásico por ₡45,000' },
  { id: 2, type: 'warning', user: 'mesero@example.com', action: 'Modificó inventario - Stock bajo', timestamp: '2026-01-17 14:25:15', details: 'Producto: Camarones (2 unidades restantes)' },
  { id: 3, type: 'success', user: 'cajero@example.com', action: 'Realizó cierre de caja', timestamp: '2026-01-17 14:20:45', details: 'Total en caja: ₡287,600 (3 discrepancias)' },
  { id: 4, type: 'error', user: 'cocina@example.com', action: 'Falló login después de 3 intentos', timestamp: '2026-01-17 14:15:30', details: 'IP: 192.168.1.105' },
  { id: 5, type: 'success', user: 'admin@example.com', action: 'Cambió permisos de usuario', timestamp: '2026-01-17 14:10:12', details: 'Usuario: mesero02 - Roles modificados' },
  { id: 6, type: 'warning', user: 'sistema', action: 'Respaldo automático completado', timestamp: '2026-01-17 13:00:00', details: 'Base de datos respaldada a nube' },
  { id: 7, type: 'success', user: 'admin@example.com', action: 'Actualizó configuración del sistema', timestamp: '2026-01-17 12:45:33', details: 'Zona horaria: America/Costa_Rica' },
  { id: 8, type: 'error', user: 'mesero@example.com', action: 'Error al procesar transacción', timestamp: '2026-01-17 12:30:22', details: 'Tarjeta rechazada - Contactar banco' },
]

export default function SystemLogs() {
  const [filterType, setFilterType] = useState('all')
  const [expandedLog, setExpandedLog] = useState(null)
  const [searchText, setSearchText] = useState('')

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'warning':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getTypeLabel = (type) => {
    const labels = { success: 'Éxito', warning: 'Advertencia', error: 'Error' }
    return labels[type] || type
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'all' || log.type === filterType
    const matchesSearch = log.action.toLowerCase().includes(searchText.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchText.toLowerCase())
    return matchesType && matchesSearch
  })

  const stats = {
    success: logs.filter(l => l.type === 'success').length,
    warning: logs.filter(l => l.type === 'warning').length,
    error: logs.filter(l => l.type === 'error').length,
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-poppins">Auditoría del Sistema</h1>
        <p className="text-gray-600 mt-1">Registro de cambios y actividades del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-100 text-sm">Acciones Exitosas</div>
                <div className="text-3xl font-bold mt-1">{stats.success}</div>
              </div>
              <CheckCircleIcon className="w-10 h-10 text-green-200" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-yellow-100 text-sm">Advertencias</div>
                <div className="text-3xl font-bold mt-1">{stats.warning}</div>
              </div>
              <ExclamationCircleIcon className="w-10 h-10 text-yellow-200" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-100 text-sm">Errores</div>
                <div className="text-3xl font-bold mt-1">{stats.error}</div>
              </div>
              <XCircleIcon className="w-10 h-10 text-red-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-white border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                placeholder="Buscar por acción o usuario..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input input-bordered flex-1"
              />
              <span className="bg-primary text-white">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </span>
            </div>
          </div>
          <div className="form-control">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="select select-bordered"
            >
              <option value="all">Todos los tipos</option>
              <option value="success">Éxito</option>
              <option value="warning">Advertencia</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`card border-l-4 ${getTypeColor(log.type)} p-4 cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getTypeIcon(log.type)}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{log.action}</div>
                    <div className="text-xs text-gray-500 mt-1">{log.user} — {log.timestamp}</div>
                  </div>
                </div>
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedLog === log.id ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {expandedLog === log.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-white bg-opacity-50 rounded p-3">
                    <span className="text-sm text-gray-700">{log.details}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No se encontraron registros con los filtros seleccionados
          </div>
        )}
      </div>
    </div>
  )
}
