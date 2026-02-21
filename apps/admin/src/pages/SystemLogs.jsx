import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XCircleIcon,
  ClockIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { getAllAuditLogs, getAllUsers } from '@shared/firebase/auth'

const TIPOS = {
  creacion_usuario: { label: 'Creacion de usuario', icon: UserPlusIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cambio_rol: { label: 'Cambio de rol', icon: ShieldCheckIcon, color: 'text-violet-600', bg: 'bg-violet-50' },
  modificacion_usuario: { label: 'Modificacion de datos', icon: PencilSquareIcon, color: 'text-sky-600', bg: 'bg-sky-50' },
  desactivacion_usuario: { label: 'Desactivacion', icon: NoSymbolIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
  reactivacion_usuario: { label: 'Reactivacion', icon: CheckBadgeIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

function formatTimestamp(ts) {
  const d = ts?.toDate?.() || (ts ? new Date(ts) : null)
  if (!d) return '-'
  return d.toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildDetails(log) {
  const parts = []

  if (log.tipo === 'creacion_usuario') {
    parts.push(`Rol asignado: ${log.rolAsignado || '-'}`)
  }

  if (log.tipo === 'cambio_rol') {
    parts.push(`Rol anterior: ${log.rolAnterior || '-'}`)
    parts.push(`Rol nuevo: ${log.rolNuevo || '-'}`)
  }

  if (log.tipo === 'modificacion_usuario' && log.cambios) {
    for (const [campo, val] of Object.entries(log.cambios)) {
      parts.push(`${campo}: ${val.antes || '(vacio)'} → ${val.despues || '(vacio)'}`)
    }
  }

  if (log.motivo) {
    parts.push(`Motivo: ${log.motivo}`)
  }

  if (log.estadoAnterior) {
    parts.push(`Estado anterior: ${log.estadoAnterior}`)
  }

  return parts
}

export default function SystemLogs() {
  const [logs, setLogs] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsData, usersData] = await Promise.all([getAllAuditLogs(), getAllUsers()])
      setLogs(logsData)
      const map = {}
      usersData.forEach(u => { map[u.uid || u.id] = u })
      setUsersMap(map)
    } catch (err) {
      console.error('Error cargando logs:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hasFilters = searchQuery || filterTipo || filterDateFrom || filterDateTo

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchTarget = (log.targetName || '').toLowerCase().includes(q)
          || (log.targetEmail || '').toLowerCase().includes(q)
        const adminName = usersMap[log.adminUid]?.name || ''
        const matchAdmin = adminName.toLowerCase().includes(q)
        if (!matchTarget && !matchAdmin) return false
      }

      if (filterTipo && log.tipo !== filterTipo) return false

      if (filterDateFrom || filterDateTo) {
        const logDate = log.timestamp?.toDate?.() || (log.timestamp ? new Date(log.timestamp) : null)
        if (!logDate) return false
        if (filterDateFrom && logDate < new Date(filterDateFrom)) return false
        if (filterDateTo) {
          const to = new Date(filterDateTo)
          to.setHours(23, 59, 59, 999)
          if (logDate > to) return false
        }
      }

      return true
    })
  }, [logs, searchQuery, filterTipo, filterDateFrom, filterDateTo, usersMap])

  // Stats de actividad reciente (ultimas 24h)
  const stats = useMemo(() => {
    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const recent = logs.filter(l => {
      const d = l.timestamp?.toDate?.() || (l.timestamp ? new Date(l.timestamp) : null)
      return d && d >= oneDayAgo
    })
    const last = logs[0] || null
    const lastAdmin = last ? (usersMap[last.adminUid]?.name || last.adminUid || '-') : '-'
    return { recentCount: recent.length, lastAction: last, lastAdmin }
  }, [logs, usersMap])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterTipo('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const getAdminName = (uid) => usersMap[uid]?.name || uid || '-'

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Logs de actividad</h1>
          <p className="text-gray-600 text-sm">Registro de acciones realizadas en el sistema</p>
        </div>
        <button onClick={loadData} className="btn btn-ghost btn-sm gap-1 text-gray-500">
          <ArrowPathIcon className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{logs.length}</div>
              <div className="text-xs text-gray-400">Total de registros</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{stats.recentCount}</div>
              <div className="text-xs text-gray-400">Ultimas 24 horas</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
              <UserPlusIcon className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 truncate">
                {stats.lastAction ? (TIPOS[stats.lastAction.tipo]?.label || stats.lastAction.tipo) : '-'}
              </div>
              <div className="text-xs text-gray-400">Ultima accion por {stats.lastAdmin}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" className="input input-bordered w-full pl-9 input-sm"
            placeholder="Buscar por usuario afectado o administrador..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="select select-bordered select-sm"
          value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <input type="date" className="input input-bordered input-sm"
          value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
          title="Desde" />
        <input type="date" className="input input-bordered input-sm"
          value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
          title="Hasta" />
        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm gap-1 text-gray-500">
            <XCircleIcon className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              {hasFilters ? (
                <div className="space-y-2">
                  <p className="text-gray-400">No se encontraron registros con los filtros aplicados</p>
                  <button onClick={clearFilters} className="btn btn-ghost btn-sm text-primary">Limpiar filtros</button>
                </div>
              ) : (
                <p className="text-gray-400">No hay registros de actividad</p>
              )}
            </div>
          ) : (
            filteredLogs.map(log => {
              const tipo = TIPOS[log.tipo] || { label: log.tipo, icon: DocumentTextIcon, color: 'text-gray-600', bg: 'bg-gray-50' }
              const Icon = tipo.icon
              const details = buildDetails(log)
              const isExpanded = expandedLog === log.id

              return (
                <div key={log.id}
                  className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                    <div className={`w-9 h-9 rounded-lg ${tipo.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${tipo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${tipo.bg} ${tipo.color}`}>
                          {tipo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 truncate">
                        {log.targetName || log.targetEmail || '-'}
                        <span className="text-gray-400"> por </span>
                        {getAdminName(log.adminUid)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0 text-right">
                      {formatTimestamp(log.timestamp)}
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && details.length > 0 && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        {details.map((d, i) => (
                          <p key={i} className="text-sm text-gray-600">{d}</p>
                        ))}
                        <p className="text-xs text-gray-400 pt-1">
                          Usuario afectado: {log.targetEmail || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
