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
  CubeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  PauseIcon,
  PlayIcon,
  CreditCardIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { getAllAuditLogs, getAllUsers } from '@shared/firebase/auth'

const TIPOS = {
  creacion_usuario: { label: 'Creacion de usuario', icon: UserPlusIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cambio_rol: { label: 'Cambio de rol', icon: ShieldCheckIcon, color: 'text-violet-600', bg: 'bg-violet-50' },
  modificacion_usuario: { label: 'Modificacion de datos', icon: PencilSquareIcon, color: 'text-sky-600', bg: 'bg-sky-50' },
  desactivacion_usuario: { label: 'Desactivacion', icon: NoSymbolIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
  reactivacion_usuario: { label: 'Reactivacion', icon: CheckBadgeIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  modificacion_producto: { label: 'Modificacion de producto', icon: CubeIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
  eliminacion_producto: { label: 'Eliminacion de producto', icon: CubeIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
  entrada_insumo: { label: 'Entrada de insumo', icon: ArrowDownTrayIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  salida_insumo: { label: 'Salida de insumo', icon: ArrowUpTrayIcon, color: 'text-orange-600', bg: 'bg-orange-50' },
  modificacion_insumo: { label: 'Modificacion de insumo', icon: PencilSquareIcon, color: 'text-sky-600', bg: 'bg-sky-50' },
  eliminacion_insumo: { label: 'Eliminacion de insumo', icon: TrashIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
  ajuste_stock: { label: 'Ajuste de stock', icon: WrenchScrewdriverIcon, color: 'text-violet-600', bg: 'bg-violet-50' },
  conteo_fisico_aplicado: { label: 'Conteo fisico aplicado', icon: CubeIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  anulacion_item_cuenta: { label: 'Anulacion de item', icon: TrashIcon, color: 'text-rose-600', bg: 'bg-rose-50' },
  reversion_anulacion_item_cuenta: { label: 'Reversion de anulacion', icon: ArrowPathIcon, color: 'text-sky-600', bg: 'bg-sky-50' },
  apertura_turno: { label: 'Apertura de turno', icon: ClockIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cierre_turno: { label: 'Cierre de turno', icon: ClockIcon, color: 'text-amber-700', bg: 'bg-amber-50' },
  pausa_turno_inicio: { label: 'Inicio de pausa', icon: PauseIcon, color: 'text-amber-700', bg: 'bg-amber-50' },
  pausa_turno_fin: { label: 'Fin de pausa', icon: PlayIcon, color: 'text-cyan-700', bg: 'bg-cyan-50' },
  venta_directa_cobrada: { label: 'Venta directa cobrada', icon: CreditCardIcon, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  venta_directa_entregada: { label: 'Venta directa entregada', icon: CheckCircleIcon, color: 'text-green-700', bg: 'bg-green-50' },
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

  if ((log.tipo === 'modificacion_usuario' || log.tipo === 'modificacion_producto') && log.cambios) {
    for (const [campo, val] of Object.entries(log.cambios)) {
      const antes = val.antes ?? '(vacio)'
      const despues = val.despues ?? '(vacio)'
      parts.push(`${campo}: ${antes} → ${despues}`)
    }
  }

  if (log.tipo === 'eliminacion_producto' && log.detalles) {
    if (log.detalles.categoria) parts.push(`Categoria: ${log.detalles.categoria}`)
    if (log.detalles.precio) parts.push(`Precio: ₡${Number(log.detalles.precio).toLocaleString()}`)
  }

  if (log.tipo === 'entrada_insumo' && log.detalles) {
    parts.push(`Cantidad: ${log.detalles.cantidad} ${log.detalles.unidad || ''}`)
    parts.push(`Precio unitario: ₡${Number(log.detalles.precioUnitario || 0).toLocaleString()}`)
    if (log.detalles.fechaCaducidad) parts.push(`Caducidad: ${log.detalles.fechaCaducidad}`)
    if (log.detalles.esNuevo) parts.push('(Insumo nuevo creado)')
  }

  if (log.tipo === 'salida_insumo' && log.detalles) {
    parts.push(`Cantidad: -${log.detalles.cantidad} ${log.detalles.unidad || ''}`)
    const motivoLabels = { consumo: 'Consumo', desperdicio: 'Desperdicio', merma: 'Merma', vencimiento: 'Vencimiento', otro: 'Otro' }
    parts.push(`Motivo: ${motivoLabels[log.detalles.motivo] || log.detalles.motivo}`)
    parts.push(`Stock: ${log.detalles.stockAnterior} → ${log.detalles.stockNuevo}`)
  }

  if (log.tipo === 'modificacion_insumo' && log.cambios) {
    for (const [campo, val] of Object.entries(log.cambios)) {
      parts.push(`${campo}: ${val.antes ?? '(vacio)'} → ${val.despues ?? '(vacio)'}`)
    }
  }

  if (log.tipo === 'eliminacion_insumo' && log.detalles) {
    parts.push(`Stock al eliminar: ${log.detalles.cantidad} ${log.detalles.unidad || ''}`)
  }

  if (log.tipo === 'ajuste_stock' && log.detalles) {
    parts.push(`Stock: ${log.detalles.stockAnterior} → ${log.detalles.stockNuevo} ${log.detalles.unidad || ''}`)
  }

  if (log.tipo === 'conteo_fisico_aplicado' && log.detalles) {
    parts.push(`Insumos contados: ${log.detalles.itemsCount || 0}`)
    parts.push(`Con diferencias: ${log.detalles.conDiferencias || 0}`)
  }

  if ((log.tipo === 'anulacion_item_cuenta' || log.tipo === 'reversion_anulacion_item_cuenta') && log.detalles) {
    parts.push(`Cuenta: ${log.detalles.cuentaId || '-'}`)
    parts.push(`Comensal: ${log.detalles.comensalId || '-'}`)
    if (log.detalles.monto !== undefined) {
      parts.push(`Monto referencial: ₡${Number(log.detalles.monto || 0).toLocaleString()}`)
    }
    parts.push(`Motivo: ${log.detalles.motivo || '-'}`)
    if (log.detalles.estadoAnterior || log.detalles.estadoNuevo) {
      parts.push(`Estado: ${log.detalles.estadoAnterior || '-'} → ${log.detalles.estadoNuevo || '-'}`)
    }
  }

  if ((log.tipo === 'apertura_turno' || log.tipo === 'cierre_turno') && log.detalles) {
    if (log.detalles.turnoId) parts.push(`Turno: ${log.detalles.turnoId}`)
    if (log.detalles.rolUsuario) parts.push(`Rol usuario: ${log.detalles.rolUsuario}`)
    if (log.detalles.terminalId) parts.push(`Terminal: ${log.detalles.terminalId}`)
    if (log.detalles.duracionMinutos !== undefined) parts.push(`Duracion: ${log.detalles.duracionMinutos} min`)
    if (log.detalles.cierreForzado) parts.push('Cierre forzado: sí')
    if (log.detalles.observacionCierre) parts.push(`Observacion: ${log.detalles.observacionCierre}`)
  }

  if ((log.tipo === 'pausa_turno_inicio' || log.tipo === 'pausa_turno_fin') && log.detalles) {
    if (log.detalles.turnoId) parts.push(`Turno: ${log.detalles.turnoId}`)
    if (log.detalles.terminalId) parts.push(`Terminal: ${log.detalles.terminalId}`)
    if (log.detalles.motivoTipo) parts.push(`Motivo: ${log.detalles.motivoTipo}`)
    if (log.detalles.motivoTexto) parts.push(`Detalle: ${log.detalles.motivoTexto}`)
    if (log.detalles.duracionMinutos !== undefined) parts.push(`Duracion pausa: ${log.detalles.duracionMinutos} min`)
    if (log.detalles.totalPausaMinutos !== undefined) parts.push(`Pausa acumulada: ${log.detalles.totalPausaMinutos} min`)
  }

  if ((log.tipo === 'venta_directa_cobrada' || log.tipo === 'venta_directa_entregada') && log.detalles) {
    if (log.detalles.cuentaId) parts.push(`Cuenta: ${log.detalles.cuentaId}`)
    if (log.detalles.metodo) parts.push(`Método: ${log.detalles.metodo}`)
    if (log.detalles.itemsCount !== undefined) parts.push(`Ítems: ${log.detalles.itemsCount}`)
    if (log.detalles.subtotal !== undefined) parts.push(`Subtotal: ₡${Number(log.detalles.subtotal || 0).toLocaleString()}`)
    if (log.detalles.impuesto !== undefined) parts.push(`Impuesto: ₡${Number(log.detalles.impuesto || 0).toLocaleString()}`)
    if (log.detalles.total !== undefined) parts.push(`Total: ₡${Number(log.detalles.total || 0).toLocaleString()}`)
  }

  if (log.motivoPrecio) {
    parts.push(`Motivo del cambio de precio: ${log.motivoPrecio}`)
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
  const [technicalLogsOpen, setTechnicalLogsOpen] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTipos, setFilterTipos] = useState([])
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showTiposDropdown, setShowTiposDropdown] = useState(false)

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

  const hasFilters = searchQuery || filterTipos.length > 0 || filterDateFrom || filterDateTo

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchTarget = (log.targetName || '').toLowerCase().includes(q)
          || (log.targetEmail || '').toLowerCase().includes(q)
          || (log.tipo || '').toLowerCase().includes(q)
        const adminName = usersMap[log.adminUid]?.name || ''
        const matchAdmin = adminName.toLowerCase().includes(q)
        if (!matchTarget && !matchAdmin) return false
      }

      if (filterTipos.length > 0 && !filterTipos.includes(log.tipo)) return false

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
  }, [logs, searchQuery, filterTipos, filterDateFrom, filterDateTo, usersMap])

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
    setFilterTipos([])
    setFilterDateFrom('')
    setFilterDateTo('')
    setShowTiposDropdown(false)
  }

  const getAdminName = (uid) => usersMap[uid]?.name || uid || '-'
  const toggleTipoFilter = (tipo) => {
    setFilterTipos((prev) => (
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    ))
  }

  const looksLikeId = (value) => {
    const text = String(value || '').trim()
    if (!text) return false
    if (text.includes(' ')) return false
    // IDs típicos de Firestore: alfanuméricos largos sin espacios.
    return /^[A-Za-z0-9_-]{12,}$/.test(text)
  }

  const isTechnicalOpen = (logId) => technicalLogsOpen.includes(logId)
  const toggleTechnicalForLog = (logId) => {
    setTechnicalLogsOpen((prev) => (
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    ))
  }

  const getLogDisplayName = (log, index) => {
    if (log.targetName && !looksLikeId(log.targetName)) return log.targetName
    if (log.targetEmail) return log.targetEmail

    const targetUserName = usersMap[log.targetId]?.name
      || usersMap[log.targetId]?.email
      || ''

    if ((log.tipo === 'anulacion_item_cuenta' || log.tipo === 'reversion_anulacion_item_cuenta') && log.detalles) {
      const cuenta = log.detalles.cuentaId ? `Cuenta ${log.detalles.cuentaId}` : ''
      const comensal = log.detalles.comensalId ? `Comensal ${log.detalles.comensalId}` : ''
      if (cuenta || comensal) return [cuenta, comensal].filter(Boolean).join(' · ')
    }

    if (log.tipo === 'apertura_turno' || log.tipo === 'cierre_turno' || log.tipo === 'pausa_turno_inicio' || log.tipo === 'pausa_turno_fin') {
      if (targetUserName) return `Turno de ${targetUserName}`
      if (log.detalles?.terminalId) return `Turno en ${log.detalles.terminalId}`
      return 'Turno de usuario'
    }

    if ((log.tipo === 'entrada_insumo' || log.tipo === 'salida_insumo' || log.tipo === 'modificacion_insumo' || log.tipo === 'eliminacion_insumo' || log.tipo === 'ajuste_stock') && log.detalles?.insumoNombre) {
      return `Insumo: ${log.detalles.insumoNombre}`
    }

    const seq = String(index + 1).padStart(4, '0')
    return `Registro ${seq}`
  }

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
        <div className="relative">
          <button
            type="button"
            className="btn btn-outline btn-sm min-w-[190px] justify-between"
            onClick={() => setShowTiposDropdown((v) => !v)}
          >
            <span className="truncate">
              {filterTipos.length > 0 ? `Tipos (${filterTipos.length})` : 'Todos los tipos'}
            </span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showTiposDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showTiposDropdown && (
            <div className="absolute z-20 mt-1 w-72 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2">
              <div className="text-[11px] font-medium text-gray-500 px-1 pb-1">Selecciona uno o varios tipos</div>
              {Object.entries(TIPOS).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={filterTipos.includes(key)}
                    onChange={() => toggleTipoFilter(key)}
                  />
                  <span className={`text-xs px-2 py-0.5 rounded ${val.bg} ${val.color}`}>{val.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
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
            filteredLogs.map((log, index) => {
              const tipo = TIPOS[log.tipo] || { label: log.tipo, icon: DocumentTextIcon, color: 'text-gray-600', bg: 'bg-gray-50' }
              const Icon = tipo.icon
              const details = buildDetails(log)
              const isExpanded = expandedLog === log.id
              const displayName = getLogDisplayName(log, index)

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
                        {displayName}
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
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => toggleTechnicalForLog(log.id)}
                          >
                            {isTechnicalOpen(log.id) ? 'Ocultar IDs técnicos' : 'Mostrar IDs técnicos'}
                          </button>
                        </div>
                        {details.map((d, i) => (
                          <p key={i} className="text-sm text-gray-600">{d}</p>
                        ))}
                        {isTechnicalOpen(log.id) && (
                          <p className="text-xs text-gray-400 pt-1">
                            Log ID: {log.id} · Target ID: {log.targetId || '-'} · Admin UID: {log.adminUid || '-'}
                          </p>
                        )}
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
