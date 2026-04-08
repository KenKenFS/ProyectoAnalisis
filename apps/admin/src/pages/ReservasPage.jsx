import { useState, useEffect, useMemo } from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
  TableCellsIcon,
  EnvelopeOpenIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import { formatMesaLabel } from '@shared/utils/mesaDisplay'
import ModalPortal from '@shared/layout/ModalPortal'
import {
  getReservasByDate,
  getReservasByDateRange,
  getReservaEmailDeliveryMap,
  getMesasDisponiblesParaReserva,
  checkReservaDuplicada,
  createReserva,
  cancelarReserva,
  completarReserva,
  getAlternativasReserva,
  getSolicitudesPortal,
  confirmarReservaPortal,
} from '@shared/firebase/firestore'

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const days = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado']
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  return { dayName: days[dateObj.getDay()], dayNum: parseInt(d), monthName: months[parseInt(m) - 1], year: y }
}

function addDaysToDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(d)}/${months[parseInt(m) - 1]}/${y}`
}

function getPublicReservaCode(reserva) {
  if (reserva?.codigoPublico) return reserva.codigoPublico
  const compactDate = String(reserva?.fecha || '').replaceAll('-', '')
  const suffix = String(reserva?.id || '').slice(-4).toUpperCase()
  if (compactDate && suffix) return `R-${compactDate}-${suffix}`
  return String(reserva?.id || '').slice(0, 8).toUpperCase() || '-'
}

function getCalendarCells(cursorDate) {
  const year = cursorDate.getFullYear()
  const month = cursorDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    const dayValue = i - firstDay + 1
    if (dayValue < 1) {
      const day = prevMonthDays + dayValue
      const dateObj = new Date(year, month - 1, day)
      cells.push({ dateStr: toDateStr(dateObj), day, currentMonth: false })
    } else if (dayValue > daysInMonth) {
      const day = dayValue - daysInMonth
      const dateObj = new Date(year, month + 1, day)
      cells.push({ dateStr: toDateStr(dateObj), day, currentMonth: false })
    } else {
      const dateObj = new Date(year, month, dayValue)
      cells.push({ dateStr: toDateStr(dateObj), day: dayValue, currentMonth: true })
    }
  }

  return cells
}

const ESTADO_CONFIG = {
  confirmada: {
    label: 'Confirmada',
    pill: 'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/45 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    accent: 'border-l-emerald-500',
  },
  cancelada: {
    label: 'Cancelada',
    pill: 'inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-200',
    dot: 'bg-red-500 dark:bg-red-400',
    accent: 'border-l-red-400',
  },
  completada: {
    label: 'Completada',
    pill: 'inline-flex items-center gap-1.5 rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-red-900/35 dark:bg-red-950/10 dark:text-red-200',
    dot: 'bg-sky-500 dark:bg-red-700/80',
    accent: 'border-l-sky-500 dark:border-l-red-800/90',
  },
}

function StatusPill({ cfg }) {
  return (
    <span className={cfg.pill}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

const EMAIL_STATUS = {
  en_cola: { label: 'Enviando...', color: 'text-amber-600' },
  sin_correo: { label: null, color: '' },
  pendiente: { label: 'Pendiente', color: 'text-amber-600' },
  error_cola: { label: 'Error envio', color: 'text-red-500' },
}

// Horario real de Ceviche del Rey Santa Ana (referencia operativa):
// Lun-Mie 11:45-21:30 | Jue-Sab 11:30-21:30 | Dom 11:45-20:45
const RESERVA_HOURS_BY_DAY = {
  0: { open: '11:45', close: '20:45' }, // Domingo
  1: { open: '11:45', close: '21:30' }, // Lunes
  2: { open: '11:45', close: '21:30' }, // Martes
  3: { open: '11:45', close: '21:30' }, // Miercoles
  4: { open: '11:30', close: '21:30' }, // Jueves
  5: { open: '11:30', close: '21:30' }, // Viernes
  6: { open: '11:30', close: '21:30' }, // Sabado
}

function timeToMinutes(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function getServiceWindowByDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay()
  return RESERVA_HOURS_BY_DAY[day] || RESERVA_HOURS_BY_DAY[1]
}

function buildTimeOptions(dateStr) {
  const window = getServiceWindowByDate(dateStr)
  const start = timeToMinutes(window.open)
  const end = timeToMinutes(window.close)
  const options = []
  for (let min = start; min <= end; min += 15) {
    options.push(minutesToTime(min))
  }
  return options
}

function resolveEmailInfo(reserva, deliveryState) {
  if (deliveryState === 'SUCCESS') {
    return { label: 'Enviado', color: 'text-emerald-600' }
  }
  if (deliveryState === 'ERROR') {
    return { label: 'Error envio', color: 'text-red-500' }
  }
  if (deliveryState) {
    return { label: 'Enviando...', color: 'text-amber-600' }
  }
  return EMAIL_STATUS[reserva.estadoEmail] || { label: null, color: '' }
}

export default function ReservasPage() {
  const { user } = useAuth()
  const today = toDateStr(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterEstado, setFilterEstado] = useState('todas')
  const [actionError, setActionError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    clienteNombre: '', clienteTelefono: '', clienteEmail: '', fecha: today,
    hora: '', cantidadPersonas: 2, observaciones: '',
    mesaId: '', mesaNumero: 0,
  })
  const [availableMesas, setAvailableMesas] = useState([])
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [noMesasMsg, setNoMesasMsg] = useState('')
  const [alternatives, setAlternatives] = useState([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [pendingCreate, setPendingCreate] = useState(null)

  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [detailReserva, setDetailReserva] = useState(null)
  const [viewMode, setViewMode] = useState('dia')

  const [solicitudes, setSolicitudes] = useState([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [confirmarSolicitudData, setConfirmarSolicitudData] = useState(null)
  const [confirmMesaId, setConfirmMesaId] = useState('')
  const [confirmMesaNumero, setConfirmMesaNumero] = useState(null)
  const [confirmAvailableMesas, setConfirmAvailableMesas] = useState([])
  const [loadingConfirmMesas, setLoadingConfirmMesas] = useState(false)
  const [loadingConfirmar, setLoadingConfirmar] = useState(false)
  const [confirmarError, setConfirmarError] = useState('')
  const [rechazarSolicitudId, setRechazarSolicitudId] = useState(null)
  const [calendarCursor, setCalendarCursor] = useState(new Date())
  const [monthReservaMap, setMonthReservaMap] = useState({})
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [proximasReservas, setProximasReservas] = useState([])
  const [loadingProximas, setLoadingProximas] = useState(false)
  const [emailDeliveryMap, setEmailDeliveryMap] = useState({})
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadReservas() }, [selectedDate])
  useEffect(() => { loadMonthReservaMap(calendarCursor) }, [calendarCursor])
  useEffect(() => { loadProximasReservas() }, [])
  useEffect(() => { loadEmailDeliveryStatuses() }, [reservas, proximasReservas])
  useEffect(() => { if (viewMode === 'solicitudes') loadSolicitudes() }, [viewMode])
  useEffect(() => { loadSolicitudes() }, [])

  async function loadReservas() {
    setLoading(true)
    setActionError('')
    try {
      setReservas(await getReservasByDate(selectedDate))
    } catch (err) {
      setActionError('Error al cargar reservas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMonthReservaMap(monthDate) {
    setLoadingCalendar(true)
    try {
      const year = monthDate.getFullYear()
      const month = monthDate.getMonth()
      const start = toDateStr(new Date(year, month, 1))
      const end = toDateStr(new Date(year, month + 1, 0))
      const list = await getReservasByDateRange(start, end)
      const map = {}
      list.forEach(r => {
        map[r.fecha] = (map[r.fecha] || 0) + 1
      })
      setMonthReservaMap(map)
    } catch (_) {
      setMonthReservaMap({})
    } finally {
      setLoadingCalendar(false)
    }
  }

  async function loadProximasReservas() {
    setLoadingProximas(true)
    try {
      const endDate = addDaysToDateStr(today, 45)
      const list = await getReservasByDateRange(today, endDate)
      setProximasReservas(list)
    } catch (_) {
      setProximasReservas([])
    } finally {
      setLoadingProximas(false)
    }
  }

  async function loadEmailDeliveryStatuses() {
    const queueIds = [
      ...new Set(
        [...reservas, ...proximasReservas]
          .map(r => r.emailQueueId)
          .filter(Boolean)
      ),
    ]
    if (queueIds.length === 0) {
      setEmailDeliveryMap({})
      return
    }
    try {
      const map = await getReservaEmailDeliveryMap(queueIds)
      setEmailDeliveryMap(map)
    } catch (_) {}
  }

  async function handleRefreshAll() {
    setRefreshing(true)
    setActionError('')
    try {
      await Promise.all([
        loadReservas(),
        loadMonthReservaMap(calendarCursor),
        loadProximasReservas(),
      ])
    } catch (_) {
      // Los errores individuales ya se manejan dentro de cada carga.
    } finally {
      setRefreshing(false)
    }
  }

  async function loadSolicitudes() {
    setLoadingSolicitudes(true)
    try {
      setSolicitudes(await getSolicitudesPortal())
    } catch (_) {
      setSolicitudes([])
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  async function openConfirmarModal(solicitud) {
    setConfirmarSolicitudData(solicitud)
    setConfirmMesaId('')
    setConfirmMesaNumero(null)
    setConfirmarError('')
    setLoadingConfirmMesas(true)
    setConfirmAvailableMesas([])
    try {
      const mesas = await getMesasDisponiblesParaReserva(solicitud.fecha, solicitud.hora, solicitud.cantidadPersonas)
      setConfirmAvailableMesas(mesas)
    } catch (_) {
      setConfirmAvailableMesas([])
    } finally {
      setLoadingConfirmMesas(false)
    }
  }

  async function handleConfirmarSolicitud() {
    if (!confirmarSolicitudData) return
    setLoadingConfirmar(true)
    setConfirmarError('')
    try {
      await confirmarReservaPortal({
        reservaId: confirmarSolicitudData.id,
        mesaId: confirmMesaId || null,
        mesaNumero: confirmMesaNumero,
        adminUid: user?.uid,
      })
      setConfirmarSolicitudData(null)
      await loadSolicitudes()
      await loadReservas()
    } catch (err) {
      setConfirmarError(err.message)
    } finally {
      setLoadingConfirmar(false)
    }
  }

  async function handleRechazarSolicitud() {
    if (!rechazarSolicitudId) return
    try {
      await cancelarReserva(rechazarSolicitudId, user?.uid)
      setRechazarSolicitudId(null)
      await loadSolicitudes()
    } catch (err) {
      setActionError(err.message)
      setRechazarSolicitudId(null)
    }
  }

  useEffect(() => {
    if (!showCreateModal) return
    if (!formData.hora || !formData.cantidadPersonas || !formData.fecha) return
    let cancelled = false
    ;(async () => {
      setLoadingMesas(true)
      setNoMesasMsg('')
      setAlternatives([])
      setFormData(prev => ({ ...prev, mesaId: '', mesaNumero: 0 }))
      try {
        const mesas = await getMesasDisponiblesParaReserva(formData.fecha, formData.hora, formData.cantidadPersonas)
        if (cancelled) return
        setAvailableMesas(mesas)
        if (mesas.length === 0) {
          setNoMesasMsg('No hay mesas disponibles para este horario y cantidad de personas.')
          const alts = await getAlternativasReserva(formData.fecha, formData.hora, formData.cantidadPersonas)
          if (!cancelled) setAlternatives(alts)
        }
      } catch (err) {
        if (!cancelled) setNoMesasMsg('Error al buscar mesas: ' + err.message)
      } finally {
        if (!cancelled) setLoadingMesas(false)
      }
    })()
    return () => { cancelled = true }
  }, [showCreateModal, formData.hora, formData.cantidadPersonas, formData.fecha])

  function goDay(offset) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(toDateStr(d))
  }

  const filteredDia = useMemo(() => {
    if (filterEstado === 'todas') return reservas
    return reservas.filter(r => r.estado === filterEstado)
  }, [reservas, filterEstado])

  const filteredProximas = useMemo(() => {
    if (filterEstado === 'todas') return proximasReservas
    return proximasReservas.filter(r => r.estado === filterEstado)
  }, [proximasReservas, filterEstado])

  const currentList = viewMode === 'dia' ? filteredDia : filteredProximas
  const statsSource = viewMode === 'dia' ? reservas : proximasReservas

  const stats = useMemo(() => ({
    confirmadas: statsSource.filter(r => r.estado === 'confirmada').length,
    canceladas: statsSource.filter(r => r.estado === 'cancelada').length,
    completadas: statsSource.filter(r => r.estado === 'completada').length,
    total: statsSource.length,
  }), [statsSource])

  const calendarCells = useMemo(() => getCalendarCells(calendarCursor), [calendarCursor])

  function resetForm() {
    setFormData({
      clienteNombre: '', clienteTelefono: '', clienteEmail: '', fecha: selectedDate,
      hora: '', cantidadPersonas: 2, observaciones: '',
      mesaId: '', mesaNumero: 0,
    })
    setAvailableMesas([])
    setNoMesasMsg('')
    setAlternatives([])
    setCreateError('')
  }

  function openCreateModal() {
    resetForm()
    setShowCreateModal(true)
  }

  async function handleCreate() {
    setCreateError('')
    if (!formData.clienteNombre.trim()) return setCreateError('Ingrese el nombre del cliente.')
    if (formData.clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clienteEmail.trim())) {
      return setCreateError('El correo no tiene un formato valido.')
    }
    if (!formData.fecha) return setCreateError('Seleccione una fecha.')
    if (!formData.hora) return setCreateError('Seleccione una hora.')
    if (formData.cantidadPersonas < 1) return setCreateError('Cantidad de personas invalida.')
    if (!formData.mesaId) return setCreateError('Seleccione una mesa.')

    setCreating(true)
    try {
      const dup = await checkReservaDuplicada(formData.clienteNombre, formData.fecha, formData.hora)
      if (dup) {
        setDuplicateWarning(dup)
        setPendingCreate({ ...formData })
        setCreating(false)
        return
      }
      await doCreate(formData)
    } catch (err) {
      setCreateError(err.message)
      setCreating(false)
    }
  }

  async function doCreate(data) {
    setCreating(true)
    try {
      await createReserva({ ...data, adminUid: user?.uid })
      setShowCreateModal(false)
      resetForm()
      await loadReservas()
      await loadMonthReservaMap(calendarCursor)
      await loadProximasReservas()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function confirmDuplicate() {
    if (!pendingCreate) return
    setDuplicateWarning(null)
    doCreate(pendingCreate)
    setPendingCreate(null)
  }

  function cancelDuplicate() {
    setDuplicateWarning(null)
    setPendingCreate(null)
  }

  async function handleComplete(id) {
    setActionError('')
    try {
      await completarReserva(id, user?.uid)
      setDetailReserva(null)
      await loadReservas()
      await loadMonthReservaMap(calendarCursor)
      await loadProximasReservas()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function doCancel() {
    if (!confirmCancelId) return
    setActionError('')
    try {
      await cancelarReserva(confirmCancelId, user?.uid)
      setConfirmCancelId(null)
      setDetailReserva(null)
      await loadReservas()
      await loadMonthReservaMap(calendarCursor)
      await loadProximasReservas()
    } catch (err) {
      setActionError(err.message)
      setConfirmCancelId(null)
    }
  }

  const dateInfo = formatDateDisplay(selectedDate)
  const isToday = selectedDate === today
  const calendarMonthLabel = calendarCursor.toLocaleString('es-CR', { month: 'long', year: 'numeric' })
  const isCurrentListLoading = viewMode === 'dia' ? loading : loadingProximas
  const timeOptions = useMemo(() => buildTimeOptions(formData.fecha || selectedDate), [formData.fecha, selectedDate])
  const lunchSlots = useMemo(() => timeOptions.filter(t => timeToMinutes(t) < 17 * 60), [timeOptions])
  const dinnerSlots = useMemo(() => timeOptions.filter(t => timeToMinutes(t) >= 17 * 60), [timeOptions])

  useEffect(() => {
    if (!showCreateModal) return
    if (!formData.hora) return
    if (timeOptions.includes(formData.hora)) return
    setFormData(prev => ({ ...prev, hora: '', mesaId: '', mesaNumero: 0 }))
  }, [showCreateModal, formData.hora, timeOptions])

  return (
    <div className="space-y-5 pb-8">
      <div className="bg-gradient-to-r from-cyan-700 via-cyan-800 to-blue-900 rounded-xl p-5 text-white shadow-lg border border-white/10 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:border-red-950/25">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              <CalendarDaysIcon className="w-8 h-8 text-cyan-200 dark:text-red-800/85" />
              Reservas
            </h1>
            <p className="text-cyan-200 text-sm mt-1 dark:text-zinc-400">Gestion de reservaciones del restaurante</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-medium rounded-xl transition-all border border-white/20 dark:border-red-900/35">
            <PlusIcon className="w-5 h-5 text-white dark:text-red-200/90" />
            Nueva Reserva
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center gap-1">
            <button onClick={() => goDay(-1)} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronLeftIcon className="w-5 h-5 text-cyan-200/90 dark:text-red-800/70" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-red-900/50"
            />
            <button onClick={() => goDay(1)} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronRightIcon className="w-5 h-5 text-cyan-200/90 dark:text-red-800/70" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center leading-tight">
              <div className="text-3xl font-bold">{dateInfo.dayNum}</div>
              <div className="text-xs text-cyan-200/80 uppercase tracking-wider dark:text-zinc-500">{dateInfo.monthName.slice(0, 3)}</div>
            </div>
            <div>
              <div className="font-semibold">{dateInfo.dayName}</div>
              <div className="text-xs text-cyan-100 dark:text-zinc-400">{dateInfo.monthName} {dateInfo.year}</div>
            </div>
            {!isToday && (
              <button onClick={() => setSelectedDate(today)} className="ml-2 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition border border-white/20">
                Ir a hoy
              </button>
            )}
            {isToday && (
              <span className="ml-2 text-xs bg-cyan-500/30 px-3 py-1 rounded-full border border-cyan-400/30 dark:bg-red-950/50 dark:border-red-900/40">Hoy</span>
            )}
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="sm:ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition disabled:opacity-60 dark:border-red-900/30"
          >
            <ArrowPathIcon className={`w-4 h-4 text-cyan-200 dark:text-red-800/75 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setViewMode('dia')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'dia' ? 'bg-cyan-600 text-white shadow dark:bg-red-950 dark:border dark:border-red-900/50' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
        >
          Vista del dia
        </button>
        <button
          onClick={() => setViewMode('proximas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'proximas' ? 'bg-cyan-600 text-white shadow dark:bg-red-950 dark:border dark:border-red-900/50' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
        >
          Proximas reservas
        </button>
        <button
          onClick={() => setViewMode('solicitudes')}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'solicitudes' ? 'bg-amber-500 text-white shadow dark:bg-amber-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
        >
          Solicitudes del portal
          {solicitudes.length > 0 && viewMode !== 'solicitudes' && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 shadow">
              {solicitudes.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-red-900/55" />
            </button>
            <p className="text-sm font-semibold text-gray-700 capitalize dark:text-zinc-200">{calendarMonthLabel}</p>
            <button
              onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-red-900/55" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-center text-gray-400 mb-1 dark:text-zinc-500">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(cell => {
              const count = monthReservaMap[cell.dateStr] || 0
              const selected = cell.dateStr === selectedDate
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => {
                    setSelectedDate(cell.dateStr)
                    setViewMode('dia')
                    setCalendarCursor(new Date(`${cell.dateStr}T12:00:00`))
                  }}
                  className={`h-9 rounded-md text-xs relative transition ${selected ? 'bg-cyan-600 font-semibold text-white dark:bg-red-950' : cell.currentMonth ? 'text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800' : 'text-gray-300 hover:bg-gray-50 dark:text-zinc-600 dark:hover:bg-zinc-800/50'}`}
                >
                  {cell.day}
                  {count > 0 && (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-cyan-500 dark:bg-red-700/85'}`} />
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 dark:text-zinc-500">
            {loadingCalendar ? 'Actualizando calendario...' : 'Punto = dia con reservas'}
          </p>
        </div>

        <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => setFilterEstado('todas')} className={`rounded-xl p-3.5 text-center transition-all border-2 ${filterEstado === 'todas' ? 'border-gray-400 shadow-md bg-white dark:border-zinc-600 dark:bg-zinc-900/50' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-zinc-600'}`}>
            <CalendarDaysIcon className="w-6 h-6 mx-auto text-gray-500 mb-1 dark:text-zinc-400" />
            <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{stats.total}</div>
            <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide dark:text-zinc-500">Total</div>
          </button>
          <button onClick={() => setFilterEstado('confirmada')} className={`rounded-xl p-3.5 text-center transition-all border-2 ${filterEstado === 'confirmada' ? 'border-emerald-400 shadow-md bg-emerald-50 dark:bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/20'}`}>
            <CheckCircleIcon className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.confirmadas}</div>
            <div className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide dark:text-emerald-500/90">Confirmadas</div>
          </button>
          <button onClick={() => setFilterEstado('completada')} className={`rounded-xl p-3.5 text-center transition-all border-2 ${filterEstado === 'completada' ? 'border-sky-400 shadow-md bg-sky-50 dark:border-red-800/70 dark:bg-zinc-50' : 'border-sky-200 bg-sky-50/50 hover:border-sky-300 dark:border-zinc-200 dark:bg-zinc-50/50 dark:hover:border-red-900/30'}`}>
            <CheckCircleIcon className="w-6 h-6 mx-auto text-sky-500 mb-1 dark:text-red-800/75" />
            <div className="text-2xl font-bold text-sky-700 dark:text-zinc-800">{stats.completadas}</div>
            <div className="text-[11px] text-sky-600 font-medium uppercase tracking-wide dark:text-zinc-600">Completadas</div>
          </button>
          <button onClick={() => setFilterEstado('cancelada')} className={`rounded-xl p-3.5 text-center transition-all border-2 ${filterEstado === 'cancelada' ? 'border-red-400 shadow-md bg-red-50 dark:bg-red-950/40' : 'border-red-200 bg-red-50/50 hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/25'}`}>
            <XCircleIcon className="w-6 h-6 mx-auto text-red-400 mb-1" />
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.canceladas}</div>
            <div className="text-[11px] text-red-500 font-medium uppercase tracking-wide dark:text-red-400/90">Canceladas</div>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {viewMode !== 'solicitudes' && isCurrentListLoading ? (
        <div className="text-center py-16">
          <ArrowPathIcon className="w-10 h-10 mx-auto animate-spin mb-3 text-cyan-500 dark:text-red-800/70" />
          <p className="text-gray-500 dark:text-zinc-400">Cargando reservas...</p>
        </div>
      ) : viewMode !== 'solicitudes' && currentList.length === 0 ? (
        <div className="text-center py-16 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 dark:bg-zinc-900/30">
          <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-zinc-600" />
          <p className="text-lg font-semibold text-gray-500 dark:text-zinc-400">Sin reservas</p>
          <p className="text-sm text-gray-400 mt-1 mb-4 dark:text-zinc-500">
            {viewMode === 'dia'
              ? `No hay reservas ${filterEstado !== 'todas' ? ESTADO_CONFIG[filterEstado]?.label.toLowerCase() + 's' : ''} para esta fecha`
              : `No hay proximas reservas ${filterEstado !== 'todas' ? ESTADO_CONFIG[filterEstado]?.label.toLowerCase() + 's' : ''}`}
          </p>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-sm font-medium text-white rounded-lg transition hover:bg-cyan-700 dark:border dark:border-red-900/40 dark:bg-red-950 dark:hover:bg-red-900">
            <PlusIcon className="w-4 h-4" />
            Crear reserva
          </button>
        </div>
      ) : viewMode !== 'solicitudes' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentList.map(r => {
            const cfg = ESTADO_CONFIG[r.estado] || ESTADO_CONFIG.confirmada
            const deliveryState = r.emailQueueId ? emailDeliveryMap[r.emailQueueId] : null
            const emailInfo = resolveEmailInfo(r, deliveryState)
            const publicCode = getPublicReservaCode(r)
            return (
              <div
                key={r.id}
                onClick={() => setDetailReserva(r)}
                className={`group cursor-pointer rounded-xl border border-gray-200 bg-white transition-all hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/50 border-l-4 ${cfg.accent}`}
              >
                <div className="p-4">
                  {viewMode === 'proximas' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-md text-[11px] font-medium mb-2 dark:border-red-900/20 dark:bg-zinc-100 dark:text-red-900/90">
                      <CalendarDaysIcon className="w-3 h-3" />
                      {r.fecha === today ? 'Hoy' : formatShortDate(r.fecha)}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-[60px] rounded-lg bg-gray-900 px-3 py-1.5 text-center text-white ring-1 ring-black/10 dark:ring-red-950/35">
                        <ClockIcon className="mx-auto mb-0.5 w-3.5 h-3.5 text-gray-400 dark:text-red-800/70" />
                        <div className="text-sm font-bold tracking-wide">{r.hora}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 transition group-hover:text-cyan-700 dark:group-hover:text-red-300 dark:text-zinc-100">{r.clienteNombre}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <UserGroupIcon className="w-3.5 h-3.5" />
                          {r.cantidadPersonas} persona{r.cantidadPersonas > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <StatusPill cfg={cfg} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <TableCellsIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span>Mesa</span>
                      <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[11px] font-bold text-cyan-800 dark:border dark:border-red-900/25 dark:bg-red-950/10 dark:text-red-200">{formatMesaLabel(r.mesaNumero)}</span>
                    </div>
                    {r.clienteEmail && (
                      <div className="flex items-center gap-1 truncate">
                        <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{r.clienteEmail}</span>
                      </div>
                    )}
                    {r.clienteTelefono && (
                      <div className="flex items-center gap-1">
                        <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{r.clienteTelefono}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                    Codigo: <span className="font-mono text-gray-800">{publicCode}</span>
                  </div>

                  {r.observaciones && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                      <span className="line-clamp-2">{r.observaciones}</span>
                    </div>
                  )}

                  {r.clienteEmail && emailInfo.label && (
                    <div className={`flex items-center gap-1 mt-2 text-[11px] ${emailInfo.color}`}>
                      <EnvelopeOpenIcon className="w-3 h-3" />
                      {emailInfo.label}
                    </div>
                  )}
                </div>

                {r.estado === 'confirmada' && (
                  <div className="border-t border-gray-100 px-4 py-2.5 flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleComplete(r.id) }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50 dark:text-red-900/85 dark:hover:bg-red-950/10"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Cliente llego
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmCancelId(r.id) }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {viewMode === 'solicitudes' && (
        <div>
          {loadingSolicitudes ? (
            <div className="text-center py-16">
              <ArrowPathIcon className="w-10 h-10 mx-auto animate-spin mb-3 text-amber-500" />
              <p className="text-gray-500 dark:text-zinc-400">Cargando solicitudes...</p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-16 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 dark:bg-zinc-900/30">
              <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
              <p className="text-lg font-semibold text-gray-500 dark:text-zinc-400">Sin solicitudes pendientes</p>
              <p className="text-sm text-gray-400 mt-1 dark:text-zinc-500">Todas las reservas del portal han sido gestionadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {solicitudes.map(r => (
                <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/40 border-l-4 border-l-amber-400 dark:border-amber-900/40 dark:bg-amber-950/10">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-[60px] rounded-lg bg-gray-900 px-3 py-1.5 text-center text-white ring-1 ring-black/10">
                          <ClockIcon className="mx-auto mb-0.5 w-3.5 h-3.5 text-gray-400" />
                          <div className="text-sm font-bold tracking-wide">{r.hora}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-zinc-100">{r.clienteNombre}</div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            {r.cantidadPersonas} persona{r.cantidadPersonas > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        Portal web
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-2 text-xs text-gray-600 font-medium">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                      {formatShortDate(r.fecha)}
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-gray-500 mb-3">
                      {r.clienteEmail && (
                        <div className="flex items-center gap-1.5">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{r.clienteEmail}</span>
                        </div>
                      )}
                      {r.clienteTelefono && (
                        <div className="flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                          {r.clienteTelefono}
                        </div>
                      )}
                    </div>

                    {r.observaciones && (
                      <div className="flex items-start gap-1.5 mb-3 text-xs text-gray-500 bg-white/60 rounded-lg px-2.5 py-1.5 border border-amber-100 dark:bg-zinc-900/30 dark:border-amber-900/20">
                        <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                        <span className="line-clamp-2">{r.observaciones}</span>
                      </div>
                    )}

                    {r.clienteUid && (
                      <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mb-2">Cliente registrado</p>
                    )}
                  </div>

                  <div className="border-t border-amber-200/60 px-4 py-2.5 flex gap-2 dark:border-amber-900/25">
                    <button
                      onClick={() => openConfirmarModal(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirmar
                    </button>
                    <button
                      onClick={() => setRechazarSolicitudId(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detailReserva && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-cyan-700 to-blue-800 p-5 text-white dark:from-zinc-950 dark:to-zinc-900 dark:border-b dark:border-red-950/25">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-cyan-200 dark:text-zinc-500">Detalle de reserva</p>
                  <h3 className="font-bold text-xl mt-1">{detailReserva.clienteNombre}</h3>
                  <p className="mt-1 text-xs text-cyan-100 dark:text-zinc-400">
                    Codigo: <span className="font-mono">{getPublicReservaCode(detailReserva)}</span>
                  </p>
                </div>
                <button onClick={() => setDetailReserva(null)} className="hover:bg-white/20 p-1 rounded-lg transition">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-cyan-100 dark:text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-cyan-200 dark:text-red-800/75" />
                  {formatShortDate(detailReserva.fecha)}
                </div>
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4 text-cyan-200 dark:text-red-800/75" />
                  {detailReserva.hora}
                </div>
                <div className="flex items-center gap-1.5">
                  <UserGroupIcon className="h-4 w-4 text-cyan-200 dark:text-red-800/75" />
                  {detailReserva.cantidadPersonas} persona{detailReserva.cantidadPersonas > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5">
                  <TableCellsIcon className="h-4 w-4 text-cyan-200 dark:text-red-800/75" />
                  {formatMesaLabel(detailReserva.mesaNumero)}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5 dark:text-zinc-200">
              {detailReserva.clienteEmail && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    {detailReserva.clienteEmail}
                  </div>
                  {(() => {
                    const detailDeliveryState = detailReserva.emailQueueId ? emailDeliveryMap[detailReserva.emailQueueId] : null
                    const detailEmailInfo = resolveEmailInfo(detailReserva, detailDeliveryState)
                    if (!detailEmailInfo.label) return null
                    return (
                      <div className={`flex items-center gap-1 text-xs ${detailEmailInfo.color}`}>
                        <EnvelopeOpenIcon className="w-3.5 h-3.5" />
                        {detailEmailInfo.label}
                      </div>
                    )
                  })()}
                </>
              )}
              {detailReserva.clienteTelefono && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  {detailReserva.clienteTelefono}
                </div>
              )}
              {detailReserva.observaciones && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-zinc-400">Observaciones</p>
                  {detailReserva.observaciones}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-500">Estado:</span>
                {(() => {
                  const c = ESTADO_CONFIG[detailReserva.estado] || ESTADO_CONFIG.confirmada
                  return <StatusPill cfg={c} />
                })()}
              </div>
            </div>

            {detailReserva.estado === 'confirmada' && (
              <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-zinc-700">
                <button
                  onClick={() => handleComplete(detailReserva.id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-transparent bg-sky-600 py-2.5 text-sm font-medium text-white transition hover:bg-sky-700 dark:border-red-900/40 dark:bg-red-950 dark:hover:bg-red-900"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Cliente llego
                </button>
                <button
                  onClick={() => { setConfirmCancelId(detailReserva.id) }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}

            {detailReserva.estado !== 'confirmada' && (
              <div className="border-t border-gray-200 p-4 dark:border-zinc-700">
                <button onClick={() => setDetailReserva(null)} className="w-full rounded-lg py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {showCreateModal && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-cyan-700 to-blue-800 p-5 text-white dark:from-zinc-950 dark:to-zinc-900 dark:border-b dark:border-red-950/25">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-cyan-200 dark:text-zinc-500">Formulario</p>
                  <h3 className="mt-0.5 text-xl font-bold">Nueva Reserva</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 dark:text-zinc-200">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Nombre del cliente *</label>
                <input
                  type="text"
                  value={formData.clienteNombre}
                  onChange={e => setFormData(p => ({ ...p, clienteNombre: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-red-900/45 dark:focus:ring-red-900/35"
                  placeholder="Ej: Carlos Gonzalez"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Telefono</label>
                  <input
                    type="tel"
                    value={formData.clienteTelefono}
                    onChange={e => setFormData(p => ({ ...p, clienteTelefono: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:focus:border-red-900/45 dark:focus:ring-red-900/35 dark:border-zinc-600 dark:bg-zinc-950"
                    placeholder="+506 8888-8888"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Correo</label>
                  <input
                    type="email"
                    value={formData.clienteEmail}
                    onChange={e => setFormData(p => ({ ...p, clienteEmail: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:focus:border-red-900/45 dark:focus:ring-red-900/35 dark:border-zinc-600 dark:bg-zinc-950"
                    placeholder="cliente@correo.com"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2 flex items-center gap-1">
                <EnvelopeOpenIcon className="w-3 h-3" />
                Si se indica correo, se envia confirmacion automatica
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:focus:border-red-900/45 dark:focus:ring-red-900/35 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Personas *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.cantidadPersonas}
                    onChange={e => setFormData(p => ({ ...p, cantidadPersonas: Math.max(1, Number(e.target.value)) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:focus:border-red-900/45 dark:focus:ring-red-900/35 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-zinc-300">Hora *</label>

                {!formData.hora ? (
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2">
                    Selecciona una hora para continuar
                  </div>
                ) : (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs text-cyan-700 dark:border-red-900/25 dark:bg-zinc-100 dark:text-red-900/90">
                    Hora seleccionada:
                    <span className="font-semibold">{formData.hora}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Almuerzo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lunchSlots.map(hora => (
                        <button
                          type="button"
                          key={hora}
                          onClick={() => setFormData(p => ({ ...p, hora }))}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                            formData.hora === hora
                              ? 'border-cyan-600 bg-cyan-600 text-white dark:border-red-950 dark:bg-red-950'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-900/35 dark:hover:bg-red-950/5'
                          }`}
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Cena</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dinnerSlots.map(hora => (
                        <button
                          type="button"
                          key={hora}
                          onClick={() => setFormData(p => ({ ...p, hora }))}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                            formData.hora === hora
                              ? 'border-cyan-600 bg-cyan-600 text-white dark:border-red-950 dark:bg-red-950'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-900/35 dark:hover:bg-red-950/5'
                          }`}
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mesa disponible *</label>
                {loadingMesas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-cyan-500 dark:text-red-800/70" />
                    Buscando mesas...
                  </div>
                ) : !formData.hora ? (
                  <div className="text-sm text-gray-400 py-3 bg-gray-50 rounded-lg px-3 border border-dashed border-gray-200 text-center">
                    Complete fecha, hora y personas para ver mesas
                  </div>
                ) : availableMesas.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableMesas.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setFormData(p => ({ ...p, mesaId: m.id, mesaNumero: m.numero }))}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                          formData.mesaId === m.id
                            ? 'border-cyan-500 bg-cyan-50 shadow-md ring-2 ring-cyan-200 dark:border-red-800 dark:bg-red-950/10 dark:ring-red-900/20'
                            : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50 dark:hover:border-red-900/30 dark:hover:bg-red-950/5'
                        }`}
                      >
                        <div className={`text-lg font-bold ${formData.mesaId === m.id ? 'text-cyan-700 dark:text-red-200' : 'text-gray-700 dark:text-zinc-300'}`}>{formatMesaLabel(m.numero)}</div>
                        <div className="text-[10px] text-gray-500">{m.capacidad} pers.</div>
                        <div className="text-[10px] text-gray-400">{m.zona || 'General'}</div>
                      </button>
                    ))}
                  </div>
                ) : noMesasMsg ? (
                  <div className="space-y-2">
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{noMesasMsg}</span>
                    </div>
                    {alternatives.length > 0 && (
                      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-zinc-200 dark:bg-zinc-100">
                        <p className="mb-2 text-sm font-medium text-sky-800 dark:text-zinc-800">Horarios alternativos:</p>
                        <div className="flex flex-wrap gap-2">
                          {alternatives.map(alt => (
                            <button
                              key={alt.hora}
                              onClick={() => setFormData(p => ({ ...p, hora: alt.hora }))}
                              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100 dark:border-red-900/30 dark:text-red-200 dark:hover:bg-red-950/10"
                            >
                              {alt.hora} ({alt.mesasDisponibles} mesa{alt.mesasDisponibles > 1 ? 's' : ''})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={e => setFormData(p => ({ ...p, observaciones: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 dark:focus:border-red-900/45 dark:focus:ring-red-900/35 dark:border-zinc-600 dark:bg-zinc-950 resize-none"
                  rows={2}
                  placeholder="Ej: Cumpleanos, silla para bebe, etc."
                />
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg border border-transparent bg-gradient-to-r from-cyan-600 to-cyan-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 dark:border-red-900/40 dark:from-red-950 dark:to-red-900 dark:hover:from-red-900 dark:hover:to-red-950"
              >
                {creating ? 'Creando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {duplicateWarning && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-amber-50 p-5 border-b border-amber-100">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 rounded-full p-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Posible duplicado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Ya existe una reserva para <strong>{duplicateWarning.clienteNombre}</strong> a las <strong>{duplicateWarning.hora}</strong> en <strong>{formatMesaLabel(duplicateWarning.mesaNumero)}</strong>.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">Desea crear la reserva de todas formas?</p>
              <div className="flex justify-end gap-2">
                <button onClick={cancelDuplicate} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition">
                  Cancelar
                </button>
                <button onClick={confirmDuplicate} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg text-sm transition">
                  Crear de todas formas
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {confirmCancelId && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:shadow-black/50">
            <div className="border-b border-red-100 bg-red-50 p-5 dark:border-red-950/30 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-950/40">
                  <XCircleIcon className="h-6 w-6 text-red-500 dark:text-red-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Cancelar reserva</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                    La mesa quedara libre para este horario.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 bg-white p-5 dark:bg-zinc-900">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Volver
              </button>
              <button
                onClick={doCancel}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Si, cancelar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {confirmarSolicitudData && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 p-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-200">Confirmar solicitud</p>
                  <h3 className="mt-0.5 text-xl font-bold">{confirmarSolicitudData.clienteNombre}</h3>
                  <div className="mt-1.5 flex items-center gap-3 text-sm text-emerald-100">
                    <span className="flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4" />{formatShortDate(confirmarSolicitudData.fecha)}</span>
                    <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" />{confirmarSolicitudData.hora}</span>
                    <span className="flex items-center gap-1"><UserGroupIcon className="w-4 h-4" />{confirmarSolicitudData.cantidadPersonas} pers.</span>
                  </div>
                </div>
                <button onClick={() => setConfirmarSolicitudData(null)} className="hover:bg-white/20 p-1 rounded-lg transition">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 dark:text-zinc-200">
              <div className="flex flex-col gap-1.5 text-sm text-gray-600 dark:text-zinc-400">
                {confirmarSolicitudData.clienteEmail && (
                  <div className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4 text-gray-400" />{confirmarSolicitudData.clienteEmail}</div>
                )}
                {confirmarSolicitudData.clienteTelefono && (
                  <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-gray-400" />{confirmarSolicitudData.clienteTelefono}</div>
                )}
              </div>

              {confirmarSolicitudData.observaciones && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-zinc-400">Observaciones</p>
                  {confirmarSolicitudData.observaciones}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Asignar mesa (opcional)
                </label>
                {loadingConfirmMesas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-emerald-500" />
                    Buscando mesas disponibles...
                  </div>
                ) : confirmAvailableMesas.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {confirmAvailableMesas.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (confirmMesaId === m.id) { setConfirmMesaId(''); setConfirmMesaNumero(null) }
                          else { setConfirmMesaId(m.id); setConfirmMesaNumero(m.numero) }
                        }}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                          confirmMesaId === m.id
                            ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200 dark:bg-emerald-950/20 dark:ring-emerald-900/30'
                            : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-800'
                        }`}
                      >
                        <div className={`text-lg font-bold ${confirmMesaId === m.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-zinc-300'}`}>{formatMesaLabel(m.numero)}</div>
                        <div className="text-[10px] text-gray-500">{m.capacidad} pers.</div>
                        <div className="text-[10px] text-gray-400">{m.zona || 'General'}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
                    No hay mesas disponibles para este horario. Puedes confirmar sin mesa y asignarla despues.
                  </div>
                )}
                {confirmMesaId && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Mesa seleccionada: {formatMesaLabel(confirmMesaNumero)} — toca de nuevo para deseleccionar
                  </p>
                )}
                {!confirmMesaId && (
                  <p className="text-xs text-gray-400 mt-1">Sin mesa seleccionada. Se confirmara sin asignacion de mesa.</p>
                )}
              </div>

              {confirmarError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  {confirmarError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <button
                onClick={() => setConfirmarSolicitudData(null)}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarSolicitud}
                disabled={loadingConfirmar}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingConfirmar ? 'Confirmando...' : 'Confirmar y notificar'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {rechazarSolicitudId && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
            <div className="border-b border-red-100 bg-red-50 p-5 dark:border-red-950/30 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-950/40">
                  <XCircleIcon className="h-6 w-6 text-red-500 dark:text-red-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Rechazar solicitud</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                    La reserva quedara como cancelada. El cliente no recibira un correo automatico de rechazo.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 bg-white p-5 dark:bg-zinc-900">
              <button
                onClick={() => setRechazarSolicitudId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Volver
              </button>
              <button
                onClick={handleRechazarSolicitud}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                Si, rechazar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
