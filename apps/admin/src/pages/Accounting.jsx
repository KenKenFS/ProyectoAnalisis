import { useEffect, useMemo, useState } from 'react'
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  createMovimientoFinanciero,
  anularMovimientoFinanciero,
  corregirMovimientoFinanciero,
  createAjusteDevolucion,
  getMovimientosFinancierosByRange,
  getReporteContablePorPeriodo,
  getVentasReferenciablesParaDevolucion,
  getVentasPOSByRange,
} from '@shared/firebase/firestore'

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`)
}

function getPeriodRange(anchorDate, period) {
  const base = parseDate(anchorDate)
  if (period === 'mes') {
    const start = new Date(base.getFullYear(), base.getMonth(), 1)
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    return { start: toDateStr(start), end: toDateStr(end) }
  }
  if (period === 'semana') {
    const dayIndex = (base.getDay() + 6) % 7
    const startDate = new Date(base)
    startDate.setDate(base.getDate() - dayIndex)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    return { start: toDateStr(startDate), end: toDateStr(endDate) }
  }
  return { start: anchorDate, end: anchorDate }
}

function shiftAnchorDate(anchorDate, period, offset) {
  const base = parseDate(anchorDate)
  if (period === 'mes') {
    base.setMonth(base.getMonth() + offset)
    return toDateStr(base)
  }
  if (period === 'semana') {
    base.setDate(base.getDate() + (offset * 7))
    return toDateStr(base)
  }
  base.setDate(base.getDate() + offset)
  return toDateStr(base)
}

function getDateListBetween(startStr, endStr) {
  const list = []
  const cursor = parseDate(startStr)
  const end = parseDate(endStr)
  while (cursor <= end) {
    list.push(toDateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return list
}

function formatDateTime(value) {
  if (!value) return '-'
  const dateObj = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(dateObj.getTime())) return '-'
  return `${toDateStr(dateObj)} ${dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatCRC(amount) {
  return `₡${Number(amount || 0).toLocaleString()}`
}

const PAGE_SIZE = 20
const FORMAL_EXPENSE_MIN_AMOUNT = 50000

export default function Accounting() {
  const { user, role } = useAuth()
  const today = toDateStr(new Date())
  const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

  const [period, setPeriod] = useState('dia')
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDayFilter, setSelectedDayFilter] = useState('all')
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    fecha: today,
    tipo: 'venta',
    monto: '',
    descripcion: '',
    origen: 'Salon',
    categoria: '',
    categoriaPersonalizada: '',
    proveedor: '',
    numeroFactura: '',
  })
  const [anularModal, setAnularModal] = useState({ open: false, movement: null })
  const [anularMotivo, setAnularMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [anularError, setAnularError] = useState('')
  const [devolucionSubmitting, setDevolucionSubmitting] = useState(false)
  const [devolucionError, setDevolucionError] = useState('')
  const [devolucionOptions, setDevolucionOptions] = useState([])
  const [devolucionVisibleCount, setDevolucionVisibleCount] = useState(PAGE_SIZE)
  const [loadingDevolucionOptions, setLoadingDevolucionOptions] = useState(false)
  const [devolucionForm, setDevolucionForm] = useState({
    fecha: today,
    referenciaVenta: '',
    monto: '',
    motivo: '',
  })
  const [corregirModal, setCorregirModal] = useState({ open: false, movement: null })
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [correccionError, setCorreccionError] = useState('')
  const [correccionForm, setCorreccionForm] = useState({
    tipo: 'venta',
    monto: '',
    descripcion: '',
    origen: '',
    categoria: '',
    motivo: '',
  })
  const [reportMode, setReportMode] = useState('mensual')
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportStart, setReportStart] = useState(today)
  const [reportEnd, setReportEnd] = useState(today)
  const [reportCategory, setReportCategory] = useState('all')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [reportBreakdownVisibleCount, setReportBreakdownVisibleCount] = useState(PAGE_SIZE)

  const periodRange = useMemo(() => getPeriodRange(anchorDate, period), [anchorDate, period])
  const periodDays = useMemo(() => getDateListBetween(periodRange.start, periodRange.end), [periodRange])

  useEffect(() => {
    if (period === 'dia') {
      setSelectedDayFilter(anchorDate)
      return
    }
    setSelectedDayFilter('all')
  }, [period, anchorDate])

  useEffect(() => {
    loadMovements()
  }, [periodRange.start, periodRange.end])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [period, periodRange.start, periodRange.end, selectedDayFilter])

  useEffect(() => {
    loadReport()
  }, [reportMode, reportYear, reportMonth, reportStart, reportEnd, reportCategory])

  useEffect(() => {
    setReportBreakdownVisibleCount(PAGE_SIZE)
  }, [reportMode, reportYear, reportMonth, reportStart, reportEnd, reportCategory])

  useEffect(() => {
    loadDevolucionOptions()
  }, [anchorDate])

  useEffect(() => {
    setDevolucionVisibleCount(PAGE_SIZE)
  }, [anchorDate])

  async function loadMovements() {
    setLoading(true)
    setError('')
    try {
      const [manual, ventasPos] = await Promise.all([
        getMovimientosFinancierosByRange(periodRange.start, periodRange.end),
        getVentasPOSByRange(periodRange.start, periodRange.end),
      ])
      const merged = [...ventasPos, ...manual]
      merged.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.timestamp || 0).getTime()
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.timestamp || 0).getTime()
        return tb - ta
      })
      setMovements(merged)
    } catch (err) {
      setError('Error al cargar movimientos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadDevolucionOptions() {
    setLoadingDevolucionOptions(true)
    try {
      const end = today
      const start = shiftAnchorDate(today, 'dia', -60)
      const list = await getVentasReferenciablesParaDevolucion({
        fechaInicio: start,
        fechaFin: end,
      })
      setDevolucionOptions(list)

      if (list.length === 0) return
      const alreadySelected = list.some(item => item.value === devolucionForm.referenciaVenta)
      if (!alreadySelected) {
        setDevolucionForm(prev => ({ ...prev, referenciaVenta: list[0].value }))
      }
    } catch (_) {
      setDevolucionOptions([])
    } finally {
      setLoadingDevolucionOptions(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await createMovimientoFinanciero({
        fecha: formData.fecha,
        tipo: formData.tipo,
        monto: Number(formData.monto),
        descripcion: formData.descripcion,
        origen: formData.tipo === 'venta' ? formData.origen : '',
        categoria: formData.tipo === 'gasto' ? formData.categoria : '',
        categoriaPersonalizada: formData.tipo === 'gasto' && formData.categoria === 'otros' ? formData.categoriaPersonalizada : '',
        proveedor: formData.tipo === 'gasto' ? formData.proveedor : '',
        numeroFactura: formData.tipo === 'gasto' ? formData.numeroFactura : '',
        usuarioUid: user?.uid || null,
      })
      setFormData(prev => ({
        ...prev,
        monto: '',
        descripcion: '',
        origen: prev.tipo === 'venta' ? prev.origen : 'Salon',
        categoria: '',
        categoriaPersonalizada: '',
        proveedor: '',
        numeroFactura: '',
      }))
      if (anchorDate !== formData.fecha || period !== 'dia') {
        setPeriod('dia')
        setAnchorDate(formData.fecha)
      } else {
        await loadMovements()
      }
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAnularGasto() {
    if (!anularModal?.movement?.id) return
    setAnularError('')
    setAnulando(true)
    try {
      await anularMovimientoFinanciero({
        transaccionId: anularModal.movement.id,
        motivo: anularMotivo,
        usuarioUid: user?.uid || null,
        rolEjecutor: role,
      })
      setAnularModal({ open: false, movement: null })
      setAnularMotivo('')
      await loadMovements()
    } catch (err) {
      setAnularError(err.message)
    } finally {
      setAnulando(false)
    }
  }

  async function handleSubmitDevolucion(e) {
    e.preventDefault()
    setDevolucionError('')
    setDevolucionSubmitting(true)
    try {
      await createAjusteDevolucion({
        fecha: devolucionForm.fecha,
        referenciaVenta: devolucionForm.referenciaVenta,
        montoDevolucion: Number(devolucionForm.monto),
        motivo: devolucionForm.motivo,
        usuarioUid: user?.uid || null,
      })
      setDevolucionForm({
        fecha: devolucionForm.fecha,
        referenciaVenta: devolucionForm.referenciaVenta,
        monto: '',
        motivo: '',
      })
      await loadDevolucionOptions()
      if (anchorDate !== devolucionForm.fecha || period !== 'dia') {
        setPeriod('dia')
        setAnchorDate(devolucionForm.fecha)
      } else {
        await loadMovements()
      }
    } catch (err) {
      setDevolucionError(err.message)
    } finally {
      setDevolucionSubmitting(false)
    }
  }

  async function handleCorregirMovimiento() {
    if (!corregirModal?.movement?.id) return
    setCorreccionError('')
    setCorrigiendo(true)
    try {
      await corregirMovimientoFinanciero({
        transaccionId: corregirModal.movement.id,
        tipo: correccionForm.tipo,
        monto: Number(correccionForm.monto),
        descripcion: correccionForm.descripcion,
        origen: correccionForm.tipo === 'venta' ? correccionForm.origen : '',
        categoria: correccionForm.tipo !== 'venta' ? correccionForm.categoria : '',
        motivo: correccionForm.motivo,
        usuarioUid: user?.uid || null,
        rolEjecutor: role,
      })
      setCorregirModal({ open: false, movement: null })
      await loadMovements()
    } catch (err) {
      setCorreccionError(err.message)
    } finally {
      setCorrigiendo(false)
    }
  }

  async function loadReport() {
    setReportLoading(true)
    setReportError('')
    try {
      const data = await getReporteContablePorPeriodo({
        modo: reportMode,
        anio: reportYear,
        mes: reportMonth,
        fechaInicio: reportStart,
        fechaFin: reportEnd,
        categoria: reportCategory,
      })
      setReportData(data)
    } catch (err) {
      setReportError(err.message)
      setReportData(null)
    } finally {
      setReportLoading(false)
    }
  }

  const visibleMovements = useMemo(() => {
    if (selectedDayFilter === 'all') return movements
    return movements.filter(m => m.fecha === selectedDayFilter)
  }, [movements, selectedDayFilter])

  const paginatedMovements = useMemo(
    () => visibleMovements.slice(0, visibleCount),
    [visibleMovements, visibleCount]
  )

  const stats = useMemo(() => {
    const ingresos = visibleMovements
      .filter(m => {
        const tipo = String(m.tipo || '').toLowerCase()
        const estado = String(m.estado || 'activo').toLowerCase()
        return tipo === 'venta' && estado !== 'anulado'
      })
      .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0)
    const egresos = visibleMovements
      .filter(m => {
        const tipo = String(m.tipo || '').toLowerCase()
        const estado = String(m.estado || 'activo').toLowerCase()
        return (tipo === 'gasto' || tipo === 'devolucion') && estado !== 'anulado'
      })
      .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0)
    const ventasPos = visibleMovements
      .filter(m => m.source === 'pos_auto')
      .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0)
    return {
      ingresos,
      egresos,
      balance: ingresos - egresos,
      ventasPos,
    }
  }, [visibleMovements])

  const dayTotals = useMemo(() => {
    const map = {}
    periodDays.forEach(day => {
      map[day] = { ingresos: 0, egresos: 0, total: 0 }
    })
    movements.forEach(m => {
      const day = m.fecha
      if (!map[day]) return
      const amount = Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0))
      const tipo = String(m.tipo || '').toLowerCase()
      const isVenta = tipo === 'venta'
      const isAnulado = String(m.estado || 'activo').toLowerCase() === 'anulado'
      if (isVenta) map[day].ingresos += amount
      else if (!isAnulado) map[day].egresos += amount
      map[day].total += isVenta ? amount : (isAnulado ? 0 : -amount)
    })
    return map
  }, [periodDays, movements])

  const isFormalExpense = formData.tipo === 'gasto' && Number(formData.monto || 0) >= FORMAL_EXPENSE_MIN_AMOUNT
  const selectedVentaDevolucion = useMemo(
    () => devolucionOptions.find(item => item.value === devolucionForm.referenciaVenta) || null,
    [devolucionOptions, devolucionForm.referenciaVenta]
  )

  const paginatedDevolucionOptions = useMemo(
    () => devolucionOptions.slice(0, devolucionVisibleCount),
    [devolucionOptions, devolucionVisibleCount]
  )

  const paginatedReportBreakdown = useMemo(
    () => (reportData?.breakdown || []).slice(0, reportBreakdownVisibleCount),
    [reportData, reportBreakdownVisibleCount]
  )

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Contabilidad y Finanzas</h1>
          <p className="text-gray-600 text-sm">Control de movimientos financieros diarios</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button onClick={() => setPeriod('dia')} className={`px-3 py-1.5 text-xs rounded-md transition ${period === 'dia' ? 'bg-white text-cyan-700 shadow-sm font-medium' : 'text-gray-500'}`}>Día</button>
            <button onClick={() => setPeriod('semana')} className={`px-3 py-1.5 text-xs rounded-md transition ${period === 'semana' ? 'bg-white text-cyan-700 shadow-sm font-medium' : 'text-gray-500'}`}>Semana</button>
            <button onClick={() => setPeriod('mes')} className={`px-3 py-1.5 text-xs rounded-md transition ${period === 'mes' ? 'bg-white text-cyan-700 shadow-sm font-medium' : 'text-gray-500'}`}>Mes</button>
          </div>
          <button onClick={() => setAnchorDate(shiftAnchorDate(anchorDate, period, -1))} className="btn btn-ghost btn-sm px-2">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className="input input-bordered input-sm" />
          <button onClick={() => setAnchorDate(shiftAnchorDate(anchorDate, period, 1))} className="btn btn-ghost btn-sm px-2">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          {anchorDate !== today && (
            <button onClick={() => setAnchorDate(today)} className="btn btn-ghost btn-sm">Hoy</button>
          )}
          <button onClick={loadMovements} className="btn btn-outline btn-sm gap-2" disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-500">
          Mostrando periodo: <span className="font-semibold text-gray-700">{periodRange.start}</span> a <span className="font-semibold text-gray-700">{periodRange.end}</span>
          {selectedDayFilter !== 'all' && <> | Día activo: <span className="font-semibold text-cyan-700">{selectedDayFilter}</span></>}
        </p>
        {period !== 'dia' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => setSelectedDayFilter('all')} className={`px-2.5 py-1.5 rounded-md text-xs border transition ${selectedDayFilter === 'all' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              Todo el periodo
            </button>
            {periodDays.map(day => {
              const d = parseDate(day)
              const daily = dayTotals[day] || { total: 0 }
              return (
                <button key={day} onClick={() => setSelectedDayFilter(day)} className={`px-2.5 py-1.5 rounded-md text-xs border transition ${selectedDayFilter === day ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {DAYS_SHORT[d.getDay()]} {String(d.getDate()).padStart(2, '0')} ({formatCRC(daily.total)})
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-xs text-emerald-700 flex items-center gap-1"><ArrowUpIcon className="w-4 h-4" />Ingresos</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCRC(stats.ingresos)}</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-xs text-red-700 flex items-center gap-1"><ArrowDownIcon className="w-4 h-4" />Egresos</p>
          <p className="text-2xl font-bold text-red-600">{formatCRC(stats.egresos)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${stats.balance >= 0 ? 'bg-cyan-50 border-cyan-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-xs ${stats.balance >= 0 ? 'text-cyan-700' : 'text-amber-700'}`}>Balance neto</p>
          <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-cyan-700' : 'text-amber-700'}`}>{formatCRC(stats.balance)}</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs text-blue-700 flex items-center gap-1"><BanknotesIcon className="w-4 h-4" />Ventas POS auto</p>
          <p className="text-2xl font-bold text-blue-700">{formatCRC(stats.ventasPos)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Registrar movimiento manual</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha *</label>
              <input type="date" value={formData.fecha} onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))} className="input input-bordered input-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Tipo *</label>
              <select value={formData.tipo} onChange={e => setFormData(p => ({ ...p, tipo: e.target.value }))} className="select select-bordered select-sm w-full">
                <option value="venta">Venta</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Monto (CRC) *</label>
              <input type="number" min="1" step="1" value={formData.monto} onChange={e => setFormData(p => ({ ...p, monto: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="15000" />
            </div>
            {formData.tipo === 'venta' ? (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Origen *</label>
                <input type="text" value={formData.origen} onChange={e => setFormData(p => ({ ...p, origen: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="POS / Evento / Catering" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Categoria *</label>
                <select value={formData.categoria} onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))} className="select select-bordered select-sm w-full">
                  <option value="">Seleccionar...</option>
                  <option value="insumos">Insumos</option>
                  <option value="alquiler">Alquiler</option>
                  <option value="servicios_publicos">Servicios públicos</option>
                  <option value="servicios">Servicios</option>
                  <option value="proveedores">Proveedores</option>
                  <option value="plataformas_delivery">Comisiones plataformas</option>
                  <option value="transporte">Transporte</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="salarios">Salarios</option>
                  <option value="marketing">Marketing</option>
                  <option value="impuestos">Impuestos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
            )}
          </div>
          {formData.tipo === 'gasto' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Proveedor {isFormalExpense ? '*' : '(opcional)'}
                </label>
                <input type="text" value={formData.proveedor} onChange={e => setFormData(p => ({ ...p, proveedor: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="Nombre del proveedor" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  No. factura proveedor {isFormalExpense ? '*' : '(opcional)'}
                </label>
                <input type="text" value={formData.numeroFactura} onChange={e => setFormData(p => ({ ...p, numeroFactura: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="FAC-001245" />
              </div>
              {formData.categoria === 'otros' && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Categoria personalizada *</label>
                  <input type="text" value={formData.categoriaPersonalizada} onChange={e => setFormData(p => ({ ...p, categoriaPersonalizada: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="Ej: Trámites municipales" />
                </div>
              )}
            </div>
          )}
          {formData.tipo === 'gasto' && (
            <p className="text-[11px] text-gray-500">
              El sistema genera un comprobante interno automático. Para gastos mayores o iguales a {formatCRC(FORMAL_EXPENSE_MIN_AMOUNT)}, se exige proveedor y factura del proveedor.
            </p>
          )}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Descripcion *</label>
            <input type="text" value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="Detalle del movimiento" />
          </div>
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {formError}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Registrar devolución</h2>
        <form onSubmit={handleSubmitDevolucion} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha *</label>
              <input type="date" value={devolucionForm.fecha} onChange={e => setDevolucionForm(p => ({ ...p, fecha: e.target.value }))} className="input input-bordered input-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Referencia venta *</label>
              <select
                value={devolucionForm.referenciaVenta}
                onChange={e => setDevolucionForm(p => ({ ...p, referenciaVenta: e.target.value }))}
                className="select select-bordered select-sm w-full"
                disabled={loadingDevolucionOptions || devolucionOptions.length === 0}
              >
                {loadingDevolucionOptions ? (
                  <option value="">Cargando ventas...</option>
                ) : devolucionOptions.length === 0 ? (
                  <option value="">No hay ventas disponibles</option>
                ) : (
                  paginatedDevolucionOptions.map(item => (
                    <option key={item.key} value={item.value}>
                      {item.fecha} | {item.tipoFuente === 'pos' ? 'POS' : 'Manual'} | Disp: {formatCRC(item.montoDisponible)}
                    </option>
                  ))
                )}
              </select>
              {devolucionOptions.length > devolucionVisibleCount && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setDevolucionVisibleCount(prev => prev + PAGE_SIZE)}
                    className="btn btn-outline btn-xs"
                  >
                    Ver más ventas
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Monto devuelto (CRC) *</label>
              <input type="number" min="1" step="1" value={devolucionForm.monto} onChange={e => setDevolucionForm(p => ({ ...p, monto: e.target.value }))} className="input input-bordered input-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Motivo *</label>
              <input type="text" value={devolucionForm.motivo} onChange={e => setDevolucionForm(p => ({ ...p, motivo: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="Detalle de la devolución" />
            </div>
          </div>
          {selectedVentaDevolucion && (
            <div className="text-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex flex-col gap-1">
              <span className="text-gray-700">
                Venta seleccionada: <span className="font-medium">{selectedVentaDevolucion.descripcion}</span>
              </span>
              <span className="text-gray-600">
                Referencia: {selectedVentaDevolucion.value} | Monto original: {formatCRC(selectedVentaDevolucion.montoOriginal)} | Disponible: {formatCRC(selectedVentaDevolucion.montoDisponible)}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => setDevolucionForm(p => ({ ...p, monto: String(Math.max(0, Math.trunc(selectedVentaDevolucion.montoDisponible))) }))}
                  className="btn btn-ghost btn-xs"
                >
                  Usar monto disponible
                </button>
              </div>
            </div>
          )}
          {devolucionError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {devolucionError}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn btn-secondary btn-sm" disabled={devolucionSubmitting}>
              {devolucionSubmitting ? 'Guardando...' : 'Guardar devolución'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="font-semibold text-gray-800">Reporte contable por período</h2>
          <button onClick={loadReport} className="btn btn-outline btn-sm gap-2" disabled={reportLoading}>
            <ArrowPathIcon className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} />
            Actualizar reporte
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Modo</label>
            <select value={reportMode} onChange={e => setReportMode(e.target.value)} className="select select-bordered select-sm w-full">
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Año</label>
            <input type="number" value={reportYear} onChange={e => setReportYear(Number(e.target.value || 0))} className="input input-bordered input-sm w-full" />
          </div>
          {reportMode === 'mensual' && (
            <div>
              <label className="text-xs text-gray-600 block mb-1">Mes</label>
              <input type="number" min="1" max="12" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value || 1))} className="input input-bordered input-sm w-full" />
            </div>
          )}
          {reportMode === 'personalizado' && (
            <>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Desde</label>
                <input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Hasta</label>
                <input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="input input-bordered input-sm w-full" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Categoría</label>
            <select value={reportCategory} onChange={e => setReportCategory(e.target.value)} className="select select-bordered select-sm w-full">
              <option value="all">Todas</option>
              <option value="ventas">Solo ventas</option>
              <option value="egresos">Solo egresos</option>
              <option value="insumos">Insumos</option>
              <option value="servicios">Servicios</option>
              <option value="devolucion">Devolución</option>
            </select>
          </div>
        </div>
        {reportError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reportError}</div>
        )}
        {reportData && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              Rango: <span className="font-medium">{reportData.rango.inicio}</span> a <span className="font-medium">{reportData.rango.fin}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                Ingresos: <span className="font-semibold text-emerald-700">{formatCRC(reportData.totalIngresos)}</span>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                Egresos: <span className="font-semibold text-red-600">{formatCRC(reportData.totalEgresos)}</span>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm">
                Balance: <span className="font-semibold text-cyan-700">{formatCRC(reportData.balance)}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                Movimientos: <span className="font-semibold text-gray-700">{reportData.cantidadMovimientos}</span>
              </div>
            </div>
            {reportData.cantidadMovimientos === 0 ? (
              <div className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2">No hay datos para este período.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-600">Período</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-600">Ingresos</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-600">Egresos</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-600">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReportBreakdown.map(row => (
                        <tr key={row.periodo} className="border-t border-gray-100">
                          <td className="px-3 py-2">{row.periodo}</td>
                          <td className="px-3 py-2 text-right text-emerald-700 font-medium">{formatCRC(row.ingresos)}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">{formatCRC(row.egresos)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCRC(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(reportData.breakdown || []).length > reportBreakdownVisibleCount && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setReportBreakdownVisibleCount(prev => prev + PAGE_SIZE)}
                      className="btn btn-outline btn-sm"
                    >
                      Ver más
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">
            Movimientos {selectedDayFilter === 'all' ? `del periodo (${periodRange.start} a ${periodRange.end})` : `del día (${selectedDayFilter})`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">Fecha/Hora</th>
                <th className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">Descripcion</th>
                <th className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">Origen/Categoria</th>
                <th className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">Tipo</th>
                <th className="text-right px-4 py-2 text-xs text-gray-600 font-semibold">Monto</th>
                <th className="text-right px-4 py-2 text-xs text-gray-600 font-semibold">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Cargando...</td></tr>
              ) : visibleMovements.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Sin movimientos para el filtro seleccionado.</td></tr>
              ) : paginatedMovements.map(m => {
                const tipo = String(m.tipo || '').toLowerCase()
                const isVenta = tipo === 'venta'
                const isDevolucion = tipo === 'devolucion'
                const amount = Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0))
                const isAnulado = String(m.estado || 'activo').toLowerCase() === 'anulado'
                const isPosAuto = String(m.source || '').startsWith('pos_auto')
                const canCorregir = !isAnulado && !isPosAuto
                const canAnular = !isAnulado && !isPosAuto
                const categoriaLabel = m.categoriaLabel || m.categoria || '-'
                return (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(m.createdAt || m.timestamp)}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">
                      <div className="font-medium">{m.descripcion || '-'}</div>
                      {m.source === 'pos_auto' && <div className="text-[11px] text-blue-600">Importado automatico desde POS</div>}
                      {m.comprobanteInterno && <div className="text-[11px] text-gray-500">Comp. interno: {m.comprobanteInterno}</div>}
                      {m.numeroFactura && <div className="text-[11px] text-gray-500">Factura proveedor: {m.numeroFactura}</div>}
                      {m.proveedor && <div className="text-[11px] text-gray-500">Proveedor: {m.proveedor}</div>}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{m.origen || categoriaLabel}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-md border text-xs font-medium ${isVenta ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : isDevolucion ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {isVenta ? 'Venta' : isDevolucion ? 'Devolución' : 'Gasto'}
                      </span>
                      {isAnulado && (
                        <span className="ml-2 px-2 py-1 rounded-md border text-xs font-medium bg-gray-50 border-gray-200 text-gray-600">
                          Anulado
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${isVenta ? 'text-emerald-700' : isDevolucion ? 'text-amber-700' : 'text-red-600'}`}>
                      {isVenta ? '+' : (isAnulado ? '' : '-')}{formatCRC(amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canCorregir || canAnular ? (
                        <div className="flex justify-end gap-1">
                          {canCorregir && (
                            <button
                              onClick={() => {
                                setCorregirModal({ open: true, movement: m })
                                setCorreccionError('')
                                setCorreccionForm({
                                  tipo: tipo || 'venta',
                                  monto: String(amount || ''),
                                  descripcion: m.descripcion || '',
                                  origen: m.origen || '',
                                  categoria: m.categoria || '',
                                  motivo: '',
                                })
                              }}
                              className="btn btn-ghost btn-xs text-cyan-700"
                            >
                              Corregir
                            </button>
                          )}
                          {canAnular && (
                            <button
                              onClick={() => {
                                setAnularModal({ open: true, movement: m })
                                setAnularMotivo('')
                                setAnularError('')
                              }}
                              className="btn btn-ghost btn-xs text-red-600"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visibleMovements.length > visibleCount && (
          <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
            <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="btn btn-outline btn-sm">Ver más</button>
          </div>
        )}
      </div>

      {anularModal.open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Anular movimiento</h3>
            <p className="text-sm text-gray-600">
              Este movimiento dejará de afectar el balance.
            </p>
            <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div><span className="text-gray-500">Descripcion:</span> {anularModal.movement?.descripcion || '-'}</div>
              <div><span className="text-gray-500">Comp. interno:</span> {anularModal.movement?.comprobanteInterno || '-'}</div>
              <div><span className="text-gray-500">Factura proveedor:</span> {anularModal.movement?.numeroFactura || '-'}</div>
              <div><span className="text-gray-500">Monto:</span> {formatCRC(anularModal.movement?.montoAbsoluto || anularModal.movement?.monto || 0)}</div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Motivo de anulacion *</label>
              <textarea
                value={anularMotivo}
                onChange={e => setAnularMotivo(e.target.value)}
                className="textarea textarea-bordered textarea-sm w-full"
                placeholder="Explique por qué se anula este gasto"
                rows={3}
              />
            </div>
            {anularError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {anularError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (anulando) return
                  setAnularModal({ open: false, movement: null })
                  setAnularMotivo('')
                  setAnularError('')
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnularGasto}
                className="btn btn-error btn-sm text-white"
                disabled={anulando}
              >
                {anulando ? 'Anulando...' : 'Confirmar anulacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {corregirModal.open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Corregir movimiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Tipo</label>
                <select value={correccionForm.tipo} onChange={e => setCorreccionForm(p => ({ ...p, tipo: e.target.value }))} className="select select-bordered select-sm w-full">
                  <option value="venta">Venta</option>
                  <option value="gasto">Gasto</option>
                  <option value="devolucion">Devolución</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Monto</label>
                <input type="number" min="1" step="1" value={correccionForm.monto} onChange={e => setCorreccionForm(p => ({ ...p, monto: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Descripción</label>
                <input type="text" value={correccionForm.descripcion} onChange={e => setCorreccionForm(p => ({ ...p, descripcion: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              {correccionForm.tipo === 'venta' ? (
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600 block mb-1">Origen</label>
                  <input type="text" value={correccionForm.origen} onChange={e => setCorreccionForm(p => ({ ...p, origen: e.target.value }))} className="input input-bordered input-sm w-full" />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600 block mb-1">Categoría</label>
                  <input type="text" value={correccionForm.categoria} onChange={e => setCorreccionForm(p => ({ ...p, categoria: e.target.value }))} className="input input-bordered input-sm w-full" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Motivo de corrección *</label>
                <textarea
                  value={correccionForm.motivo}
                  onChange={e => setCorreccionForm(p => ({ ...p, motivo: e.target.value }))}
                  className="textarea textarea-bordered textarea-sm w-full"
                  rows={3}
                />
              </div>
            </div>
            {correccionError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {correccionError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (corrigiendo) return
                  setCorregirModal({ open: false, movement: null })
                  setCorreccionError('')
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button onClick={handleCorregirMovimiento} className="btn btn-primary btn-sm" disabled={corrigiendo}>
                {corrigiendo ? 'Guardando...' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
