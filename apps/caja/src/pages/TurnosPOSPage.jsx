import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import { getAllUsers } from '@shared/firebase/auth'
import ModalPortal from '@shared/layout/ModalPortal'
import {
  abrirTurnoUsuario,
  cerrarTurnoUsuario,
  iniciarPausaTurnoUsuario,
  reanudarTurnoUsuario,
  getTurnosActivosPOS,
  getTurnosHistorialPOS,
} from '@shared/firebase/firestore'

function fmtDateTime(value) {
  const d = value?.toDate?.() || (value ? new Date(value) : null)
  if (!d) return '-'
  return d.toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtTime(value) {
  const d = value?.toDate?.() || (value instanceof Date ? value : value ? new Date(value) : null)
  if (!d) return ''
  return d.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDurationMinutes(totalMinutes) {
  const mins = Number(totalMinutes)
  if (!Number.isFinite(mins) || mins < 0) return '-'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function toDateValue(value) {
  return value?.toDate?.() || (value ? new Date(value) : null)
}

function pauseLabel(evento) {
  const tipo = String(evento?.motivoTipo || '').toLowerCase()
  const map = {
    almuerzo: 'Almuerzo',
    descanso: 'Descanso',
    bano: 'Baño',
    diligencia: 'Diligencia',
    reunion: 'Reunión',
    otro: 'Otro',
  }
  if (tipo === 'otro' && String(evento?.motivoTexto || '').trim()) {
    return `Otro: ${String(evento.motivoTexto).trim()}`
  }
  return map[tipo] || 'Pausa'
}

function buildTurnoTimeline(turno) {
  const inicio = toDateValue(turno.horaInicio)
  const fin = toDateValue(turno.horaCierre) || new Date()
  if (!inicio || !fin || fin <= inicio) return []

  const events = (turno.eventosTurno || [])
    .map(e => ({ ...e, ts: toDateValue(e.timestamp) }))
    .filter(e => e.ts && e.ts >= inicio && e.ts <= fin)
    .sort((a, b) => a.ts - b.ts)

  let cursor = inicio
  let mode = 'activo'
  let motivo = ''
  const segments = []

  for (const e of events) {
    if (e.tipo === 'inicio') continue
    if (e.ts > cursor) {
      segments.push({ start: cursor, end: e.ts, mode, motivo })
      cursor = e.ts
    }
    if (e.tipo === 'pausa_inicio') {
      mode = 'pausa'
      motivo = pauseLabel(e)
    } else if (e.tipo === 'pausa_fin') {
      mode = 'activo'
      motivo = ''
    } else if (e.tipo === 'cierre') {
      mode = 'fin'
    }
  }

  if (cursor < fin) {
    segments.push({ start: cursor, end: fin, mode, motivo })
  }

  return segments.map(s => {
    const ms = Math.max(0, s.end.getTime() - s.start.getTime())
    return { ...s, minutes: Math.round(ms / 60000) }
  }).filter(s => s.minutes > 0)
}

function TurnoTimeline({ turno, timeline }) {
  const inicio = toDateValue(turno.horaInicio)
  const fin = toDateValue(turno.horaCierre) || new Date()
  if (!inicio) return null

  const startHour = inicio.getHours()
  const endHour = fin.getHours() + (fin.getMinutes() > 0 ? 1 : 0)
  const hours = []
  for (let h = startHour; h <= Math.min(endHour, 23); h++) hours.push(h)
  if (hours.length < 2) hours.push(startHour + 1)

  const timelineStart = new Date(inicio)
  timelineStart.setMinutes(0, 0, 0)
  const timelineEnd = new Date(inicio)
  timelineEnd.setHours(hours[hours.length - 1] + 1, 0, 0, 0)
  const totalMs = Math.max(1, timelineEnd.getTime() - timelineStart.getTime())
  const toPct = (d) => Math.max(0, Math.min(100, ((d.getTime() - timelineStart.getTime()) / totalMs) * 100))

  const isActive = turno.estadoTurno !== 'cerrado'
  const nowPct = isActive ? toPct(new Date()) : null
  const activoSegs = timeline.filter(s => s.mode === 'activo')
  const pausaSegs = timeline.filter(s => s.mode === 'pausa')
  const hasPausas = pausaSegs.length > 0

  const ROW_H = 24
  const GAP = 6

  function renderSegments(segs, rowTop, isPausa) {
    return segs.map((seg, idx) => {
      const leftPct = toPct(seg.start)
      const rightPct = toPct(seg.end)
      const widthPct = Math.max(0.4, rightPct - leftPct)
      return (
        <div
          key={`seg-${isPausa ? 'p' : 'a'}-${idx}`}
          className={`absolute rounded-sm border group cursor-default ${isPausa ? 'bg-amber-400/80 border-amber-500' : 'bg-cyan-500/80 border-cyan-600'}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: `${rowTop}px`, height: `${ROW_H}px` }}
        >
          {widthPct > 5 && (
            <div className={`text-[9px] font-semibold truncate px-1 ${isPausa ? 'text-amber-900' : 'text-white'}`} style={{ lineHeight: `${ROW_H}px` }}>
              {isPausa ? (seg.motivo || 'Pausa') : fmtTime(seg.start)}
            </div>
          )}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-20 shadow-lg">
            {fmtTime(seg.start)} – {fmtTime(seg.end)} · {isPausa ? (seg.motivo || 'Pausa') : 'Activo'} · {fmtDurationMinutes(seg.minutes)}
          </div>
        </div>
      )
    })
  }

  const chartH = hasPausas ? ROW_H * 2 + GAP : ROW_H

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-600">Línea de tiempo</div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500 inline-block" /> Activo</span>
          {hasPausas && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Pausa</span>}
          {isActive && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-500 inline-block" /> Ahora</span>}
        </div>
      </div>

      <div className="relative w-full overflow-visible" style={{ height: `${chartH + 28}px` }}>
        {/* Row labels */}
        <div className="absolute -left-0 top-0 text-[9px] text-cyan-700 font-semibold" style={{ lineHeight: `${ROW_H}px` }}>ACTIVO</div>
        {hasPausas && (
          <div className="absolute -left-0 text-[9px] text-amber-700 font-semibold" style={{ top: `${ROW_H + GAP}px`, lineHeight: `${ROW_H}px` }}>PAUSA</div>
        )}

        {/* Main chart area offset for labels */}
        <div className="absolute left-12 right-0 top-0" style={{ height: `${chartH}px` }}>
          {/* Hour grid */}
          {hours.map(h => {
            const d = new Date(inicio)
            d.setHours(h, 0, 0, 0)
            const pct = toPct(d)
            return (
              <div key={`h-${h}`} className="absolute top-0" style={{ left: `${pct}%`, height: `${chartH}px` }}>
                <div className="w-px h-full bg-gray-200" />
                <div className="absolute -translate-x-1/2 text-[10px] text-gray-400 font-medium whitespace-nowrap" style={{ top: `${chartH + 4}px` }}>
                  {`${String(h).padStart(2, '0')}:00`}
                </div>
              </div>
            )
          })}

          {/* Active row background */}
          <div className="absolute left-0 right-0 rounded bg-cyan-50/50" style={{ top: 0, height: `${ROW_H}px` }} />
          {/* Pause row background */}
          {hasPausas && <div className="absolute left-0 right-0 rounded bg-amber-50/50" style={{ top: `${ROW_H + GAP}px`, height: `${ROW_H}px` }} />}

          {/* Active segments */}
          {renderSegments(activoSegs, 0, false)}
          {/* Pause segments */}
          {hasPausas && renderSegments(pausaSegs, ROW_H + GAP, true)}

          {/* Now indicator */}
          {nowPct != null && nowPct >= 0 && nowPct <= 100 && (
            <div className="absolute top-0" style={{ left: `${nowPct}%`, height: `${chartH}px` }}>
              <div className="w-0.5 h-full bg-rose-500" />
              <div className="absolute -top-4 -translate-x-1/2 text-[9px] font-bold text-rose-600 whitespace-nowrap">Ahora</div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2 pl-12">
        <span className="text-xs px-2 py-1 rounded border bg-cyan-50 text-cyan-700 border-cyan-200">
          Activo: {fmtDurationMinutes(activoSegs.reduce((s, x) => s + x.minutes, 0))}
        </span>
        {hasPausas && (
          <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800 border-amber-200">
            Pausas: {fmtDurationMinutes(pausaSegs.reduce((s, x) => s + x.minutes, 0))} ({pausaSegs.length})
          </span>
        )}
        {pausaSegs.map((seg, idx) => (
          <span key={`pm-${idx}`} className="text-xs px-2 py-1 rounded border bg-amber-50/70 text-amber-700 border-amber-100">
            {seg.motivo || 'Pausa'}: {fmtDurationMinutes(seg.minutes)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function TurnosPOSPage() {
  const { user, role } = useAuth()
  const TERMINAL_OPTIONS = ['Caja', 'Cocina', 'Salones','Otro']

  const [users, setUsers] = useState([])
  const [activos, setActivos] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [openForm, setOpenForm] = useState({ usuarioId: '', terminalTipo: 'Caja', terminalOtro: '' })
  const [opening, setOpening] = useState(false)

  const [closeTarget, setCloseTarget] = useState(null)
  const [closeForm, setCloseForm] = useState({ observacionCierre: '', cierreForzado: false })
  const [closing, setClosing] = useState(false)
  const [pauseTarget, setPauseTarget] = useState(null)
  const [pauseForm, setPauseForm] = useState({ motivoTipo: 'almuerzo', motivoTexto: '' })
  const [pausing, setPausing] = useState(false)
  const [resumingId, setResumingId] = useState('')
  const [expandedTurnoId, setExpandedTurnoId] = useState('')
  const [expandedActivoId, setExpandedActivoId] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)
  const [filters, setFilters] = useState({ usuarioId: '', estadoTurno: '', dateFrom: todayStr, dateTo: todayStr })
  const [refreshing, setRefreshing] = useState(false)

  const usuariosOperativos = useMemo(() => {
    return users.filter(u => {
      const r = String(u.role || '').toLowerCase()
      return r === 'cajero' || r === 'mesero' || r === 'cocina' || r === 'admin'
    })
  }, [users])

  const selectedUser = useMemo(
    () => users.find(u => (u.uid || u.id) === openForm.usuarioId) || null,
    [users, openForm.usuarioId]
  )

  const userNameMap = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      const id = u.uid || u.id
      map[id] = u.name || u.email || id
    })
    return map
  }, [users])

  function userLabel(id) {
    return userNameMap[id] || id || '-'
  }

  const loadAll = useCallback(async (customFilters = filters) => {
    setRefreshing(true)
    try {
      const [usersData, activosData, historialData] = await Promise.all([
        getAllUsers(),
        getTurnosActivosPOS(),
        getTurnosHistorialPOS(customFilters),
      ])
      setUsers(usersData || [])
      setActivos(activosData || [])
      setHistorial(historialData || [])
      setError('')
    } catch (e) {
      setError(e?.message || 'Error al cargar turnos.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    const id = setInterval(() => {
      loadAll()
    }, 15000)
    return () => clearInterval(id)
  }, [loadAll])

  async function handleOpenTurno() {
    if (!openForm.usuarioId) {
      setError('Seleccione un usuario para abrir turno.')
      return
    }
    const terminalFinal = openForm.terminalTipo === 'Otro'
      ? String(openForm.terminalOtro || '').trim()
      : openForm.terminalTipo
    if (!terminalFinal) {
      setError('Indica el área/estación cuando seleccionas "Otro".')
      return
    }
    setOpening(true)
    try {
      await abrirTurnoUsuario({
        usuarioId: openForm.usuarioId,
        rolUsuario: selectedUser?.role || 'N/A',
        terminalId: terminalFinal,
        abiertoPorUid: user?.uid || null,
        rolEjecutor: role || null,
      })
      setOpenForm(prev => ({ ...prev, usuarioId: '', terminalOtro: '' }))
      await loadAll()
    } catch (e) {
      if (e?.code === 'TURNO_ACTIVO') setError('Ese usuario ya tiene un turno abierto.')
      else if (e?.code === 'PERMISSION_DENIED') setError('Solo Admin puede abrir turnos.')
      else setError(e?.message || 'Error al abrir turno.')
    } finally {
      setOpening(false)
    }
  }

  async function handleCloseTurno() {
    if (!closeTarget) return
    setClosing(true)
    try {
      await cerrarTurnoUsuario({
        turnoId: closeTarget.id,
        observacionCierre: closeForm.observacionCierre,
        cierreForzado: closeForm.cierreForzado,
        cerradoPorUid: user?.uid || null,
        rolEjecutor: role || null,
      })
      setCloseTarget(null)
      setCloseForm({ observacionCierre: '', cierreForzado: false })
      await loadAll()
    } catch (e) {
      if (e?.code === 'TURNO_NOT_FOUND') setError('El turno no existe.')
      else if (e?.code === 'TURNO_INVALIDO') setError('El turno ya está cerrado.')
      else if (e?.code === 'TURNO_EN_PAUSA') setError('No se puede cerrar un turno en pausa. Reanúdalo primero.')
      else if (e?.code === 'PERMISSION_DENIED') setError('Solo Admin puede cerrar turnos.')
      else setError(e?.message || 'Error al cerrar turno.')
    } finally {
      setClosing(false)
    }
  }

  async function handleStartPause() {
    if (!pauseTarget) return
    setPausing(true)
    try {
      await iniciarPausaTurnoUsuario({
        turnoId: pauseTarget.id,
        motivoTipo: pauseForm.motivoTipo,
        motivoTexto: pauseForm.motivoTexto,
        actorUid: user?.uid || null,
        rolEjecutor: role || null,
      })
      setPauseTarget(null)
      setPauseForm({ motivoTipo: 'almuerzo', motivoTexto: '' })
      await loadAll()
    } catch (e) {
      if (e?.code === 'MOTIVO_REQUIRED') setError('Indica el motivo cuando seleccionas "Otro".')
      else if (e?.code === 'PERMISSION_DENIED') setError('Solo Admin puede iniciar pausas.')
      else setError(e?.message || 'Error al iniciar pausa.')
    } finally {
      setPausing(false)
    }
  }

  async function handleResume(turnoId) {
    setResumingId(turnoId)
    try {
      await reanudarTurnoUsuario({
        turnoId,
        actorUid: user?.uid || null,
        rolEjecutor: role || null,
      })
      await loadAll()
    } catch (e) {
      if (e?.code === 'PERMISSION_DENIED') setError('Solo Admin puede reanudar pausas.')
      else setError(e?.message || 'Error al reanudar turno.')
    } finally {
      setResumingId('')
    }
  }

  function shiftDay(offset) {
    const current = filters.dateFrom || todayStr
    const d = new Date(current + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    const iso = d.toISOString().slice(0, 10) > todayStr ? todayStr : d.toISOString().slice(0, 10)
    const next = { ...filters, dateFrom: iso, dateTo: iso }
    setFilters(next)
    loadAll(next)
  }

  function dayLabel() {
    const from = filters.dateFrom
    if (!from) return 'Todos los días'
    const d = new Date(from + 'T12:00:00')
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
    const name = d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (diff === 0) return `Hoy · ${name}`
    if (diff === -1) return `Ayer · ${name}`
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const isToday = filters.dateFrom === todayStr

  async function applyFilters() {
    const safeFrom = filters.dateFrom && filters.dateFrom > todayStr ? todayStr : filters.dateFrom
    const safeTo = filters.dateTo && filters.dateTo > todayStr ? todayStr : filters.dateTo
    const safeFilters = { ...filters, dateFrom: safeFrom, dateTo: safeTo }
    setFilters(safeFilters)
    await loadAll(safeFilters)
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClockIcon className="w-8 h-8 text-cyan-600" />
            Turnos POS
          </h1>
          <p className="text-gray-600 text-sm">Apertura, cierre y seguimiento de turnos por usuario</p>
        </div>
        <button
          type="button"
          onClick={() => loadAll()}
          className="btn btn-ghost gap-2"
          disabled={refreshing}
        >
          <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card bg-white border border-gray-200 lg:col-span-1">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-900">Abrir turno</div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500">Usuario</label>
              <select
                className="select select-bordered w-full"
                value={openForm.usuarioId}
                onChange={(e) => setOpenForm(prev => ({ ...prev, usuarioId: e.target.value }))}
              >
                <option value="">Seleccionar usuario...</option>
                {usuariosOperativos.map(u => {
                  const uid = u.uid || u.id
                  return (
                    <option key={uid} value={uid}>
                      {(u.name || u.email || uid)} ({u.role || 'N/A'})
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Área / estación</label>
              <select
                className="select select-bordered w-full"
                value={openForm.terminalTipo}
                onChange={(e) => setOpenForm(prev => ({ ...prev, terminalTipo: e.target.value }))}
              >
                {TERMINAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {openForm.terminalTipo === 'Otro' && (
              <div>
                <label className="text-xs text-gray-500">Especificar área</label>
                <input
                  className="input input-bordered w-full"
                  value={openForm.terminalOtro}
                  onChange={(e) => setOpenForm(prev => ({ ...prev, terminalOtro: e.target.value }))}
                  placeholder="Ej: Terraza, Patio, Bodega"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenTurno}
              className="btn bg-cyan-600 hover:bg-cyan-700 text-white border-0 w-full gap-2"
              disabled={opening}
            >
              {opening ? <span className="loading loading-spinner loading-sm" /> : <PlusIcon className="w-4 h-4" />}
              Abrir turno
            </button>
          </div>
        </div>

        <div className="card bg-white border border-gray-200 lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="font-bold text-gray-900">Turnos activos</div>
            <span className="badge badge-ghost">{activos.length}</span>
          </div>
          <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : activos.length === 0 ? (
              <div className="text-sm text-gray-500">No hay turnos activos.</div>
            ) : (
              activos.map(t => {
                const isExp = expandedActivoId === t.id
                const timeline = buildTurnoTimeline(t)
                return (
                  <div key={t.id} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{userLabel(t.usuarioId)}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>Rol: {t.rolUsuario || 'N/A'} · Terminal: {t.terminalId || '-'}</span>
                          {t.estadoTurno === 'pausado' ? (
                            <span className="badge bg-amber-100 text-amber-800 border-amber-200">Pausado</span>
                          ) : (
                            <span className="badge bg-cyan-100 text-cyan-700 border-cyan-200">Activo</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Inicio: {fmtDateTime(t.horaInicio)} · Transcurrido:{' '}
                          {fmtDurationMinutes(
                            Math.max(0, Math.round((Date.now() - (t.horaInicio?.toDate?.() ? t.horaInicio.toDate().getTime() : new Date(t.horaInicio).getTime())) / 60000))
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.estadoTurno === 'abierto' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPauseTarget(t)
                              setPauseForm({ motivoTipo: 'almuerzo', motivoTexto: '' })
                            }}
                            className="btn btn-sm border border-slate-400 text-slate-700 hover:bg-slate-100 gap-1"
                          >
                            <PauseIcon className="w-4 h-4" />
                            Pausar
                          </button>
                        )}
                        {t.estadoTurno === 'pausado' && (
                          <button
                            type="button"
                            onClick={() => handleResume(t.id)}
                            className="btn btn-sm border border-cyan-600 text-cyan-700 hover:bg-cyan-50 gap-1"
                            disabled={resumingId === t.id}
                          >
                            {resumingId === t.id ? <span className="loading loading-spinner loading-xs" /> : <PlayIcon className="w-4 h-4" />}
                            Reanudar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCloseTarget(t)
                            setCloseForm({ observacionCierre: '', cierreForzado: false })
                          }}
                          className="btn btn-sm border border-amber-600 text-amber-700 hover:bg-amber-100"
                        >
                          Cerrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedActivoId(isExp ? '' : t.id)}
                          className="btn btn-ghost btn-sm"
                          title="Ver línea de tiempo"
                        >
                          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                    {isExp && timeline.length > 0 && (
                      <div className="px-3 pb-4 pt-1 border-t border-gray-200 bg-white">
                        <TurnoTimeline turno={t} timeline={timeline} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="card bg-white border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-bold text-gray-900">Historial de turnos</div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shiftDay(-1)} className="btn btn-ghost btn-sm px-2" title="Día anterior">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">{dayLabel()}</span>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              className="btn btn-ghost btn-sm px-2"
              title="Día siguiente"
              disabled={isToday}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="select select-bordered"
            value={filters.usuarioId}
            onChange={(e) => setFilters(prev => ({ ...prev, usuarioId: e.target.value }))}
          >
            <option value="">Todos los usuarios</option>
            {usuariosOperativos.map(u => {
              const uid = u.uid || u.id
              return <option key={uid} value={uid}>{u.name || u.email || uid}</option>
            })}
          </select>
          <select
            className="select select-bordered"
            value={filters.estadoTurno}
            onChange={(e) => setFilters(prev => ({ ...prev, estadoTurno: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="pausado">Pausado</option>
            <option value="cerrado">Cerrado</option>
          </select>
          <input
            type="date"
            className="input input-bordered"
            value={filters.dateFrom}
            max={todayStr}
            onChange={(e) => {
              const v = e.target.value > todayStr ? todayStr : e.target.value
              setFilters(prev => ({ ...prev, dateFrom: v, dateTo: v }))
            }}
          />
          <button type="button" onClick={applyFilters} className="btn btn-primary">Filtrar</button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Terminal</th>
                <th>Inicio</th>
                <th>Cierre</th>
                <th>Estado</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">Sin registros</td>
                </tr>
              ) : historial.map(t => {
                const isExpanded = expandedTurnoId === t.id
                const timeline = buildTurnoTimeline(t)
                const estadoBadge =
                  t.estadoTurno === 'abierto'
                    ? <span className="badge bg-cyan-100 text-cyan-700 border-cyan-200">Abierto</span>
                    : t.estadoTurno === 'pausado'
                      ? <span className="badge bg-amber-100 text-amber-800 border-amber-200">Pausado</span>
                      : <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200">Cerrado</span>

                return (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-gray-50">
                      <td>{userLabel(t.usuarioId)}</td>
                      <td>{t.rolUsuario || '-'}</td>
                      <td>{t.terminalId || '-'}</td>
                      <td>{fmtDateTime(t.horaInicio)}</td>
                      <td>{fmtDateTime(t.horaCierre)}</td>
                      <td>{estadoBadge}</td>
                      <td>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t.estadoTurno !== 'cerrado'
                              ? fmtDurationMinutes(
                                  Math.max(
                                    0,
                                    Math.round((Date.now() - (toDateValue(t.horaInicio)?.getTime() || Date.now())) / 60000)
                                  )
                                )
                              : fmtDurationMinutes(t.duracionNetaMinutos ?? t.duracionMinutos)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedTurnoId(isExpanded ? '' : t.id)}
                            className="btn btn-ghost btn-xs"
                            title="Ver línea de tiempo"
                          >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && timeline.length > 0 && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7}>
                          <div className="py-4 px-3">
                            <TurnoTimeline turno={t} timeline={timeline} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pauseTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="font-bold text-gray-900">Iniciar pausa</div>
              <button type="button" onClick={() => setPauseTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">
                Usuario: <span className="font-semibold text-gray-900">{userLabel(pauseTarget.usuarioId)}</span>
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de pausa</label>
                <select
                  className="select select-bordered w-full"
                  value={pauseForm.motivoTipo}
                  onChange={(e) => setPauseForm(prev => ({ ...prev, motivoTipo: e.target.value }))}
                >
                  <option value="almuerzo">Almuerzo</option>
                  <option value="descanso">Descanso</option>
                  <option value="bano">Baño</option>
                  <option value="diligencia">Diligencia</option>
                  <option value="reunion">Reunión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {pauseForm.motivoTipo === 'otro' && (
                <div>
                  <label className="text-xs text-gray-500">Motivo (obligatorio)</label>
                  <textarea
                    value={pauseForm.motivoTexto}
                    onChange={(e) => setPauseForm(prev => ({ ...prev, motivoTexto: e.target.value }))}
                    className="textarea textarea-bordered w-full min-h-[90px]"
                    placeholder="Escribe el motivo de la pausa..."
                  />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setPauseTarget(null)} className="flex-1 btn btn-ghost" disabled={pausing}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartPause}
                  className="flex-1 btn bg-slate-700 hover:bg-slate-800 text-white border-0 gap-1"
                  disabled={pausing}
                >
                  {pausing ? <span className="loading loading-spinner loading-sm" /> : <PauseIcon className="w-4 h-4" />}
                  Iniciar pausa
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {closeTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="font-bold text-gray-900">Cerrar turno</div>
              <button type="button" onClick={() => setCloseTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">
                Usuario: <span className="font-semibold text-gray-900">{userLabel(closeTarget.usuarioId)}</span>
              </div>
              <textarea
                value={closeForm.observacionCierre}
                onChange={(e) => setCloseForm(prev => ({ ...prev, observacionCierre: e.target.value }))}
                placeholder="Observación de cierre (opcional)"
                className="textarea textarea-bordered w-full min-h-[100px]"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={closeForm.cierreForzado}
                  onChange={(e) => setCloseForm(prev => ({ ...prev, cierreForzado: e.target.checked }))}
                />
                Cierre forzado
              </label>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setCloseTarget(null)} className="flex-1 btn btn-ghost" disabled={closing}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCloseTurno}
                  className="flex-1 btn bg-amber-600 hover:bg-amber-700 text-white border-0"
                  disabled={closing}
                >
                  {closing ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirmar cierre
                    </>
                  )}
                </button>
              </div>
              {closeForm.cierreForzado && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 mt-0.5" />
                  <span>Se registrará como cierre forzado para auditoría.</span>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
