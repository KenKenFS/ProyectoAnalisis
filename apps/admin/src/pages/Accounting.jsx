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
  getMovimientosFinancierosByRange,
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

export default function Accounting() {
  const { user } = useAuth()
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
  })

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
        usuarioUid: user?.uid || null,
      })
      setFormData(prev => ({
        ...prev,
        monto: '',
        descripcion: '',
        origen: prev.tipo === 'venta' ? prev.origen : 'Salon',
        categoria: '',
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
      .filter(m => String(m.tipo || '').toLowerCase() === 'venta')
      .reduce((sum, m) => sum + Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0)), 0)
    const egresos = visibleMovements
      .filter(m => String(m.tipo || '').toLowerCase() === 'gasto')
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
      const isVenta = String(m.tipo || '').toLowerCase() === 'venta'
      if (isVenta) map[day].ingresos += amount
      else map[day].egresos += amount
      map[day].total += isVenta ? amount : -amount
    })
    return map
  }, [periodDays, movements])

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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Cargando...</td></tr>
              ) : visibleMovements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Sin movimientos para el filtro seleccionado.</td></tr>
              ) : paginatedMovements.map(m => {
                const isVenta = String(m.tipo || '').toLowerCase() === 'venta'
                const amount = Math.abs(Number(m.montoAbsoluto ?? m.monto ?? 0))
                return (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(m.createdAt || m.timestamp)}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">
                      <div className="font-medium">{m.descripcion || '-'}</div>
                      {m.source === 'pos_auto' && <div className="text-[11px] text-blue-600">Importado automatico desde POS</div>}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{m.origen || m.categoria || '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-md border text-xs font-medium ${isVenta ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {isVenta ? 'Venta' : 'Gasto'}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${isVenta ? 'text-emerald-700' : 'text-red-600'}`}>
                      {isVenta ? '+' : '-'}{formatCRC(amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visibleMovements.length > visibleCount && (
          <div className="px-4 py-3 border-t border-gray-200 flex justify-center">
            <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="btn btn-outline btn-sm">Cargar más</button>
          </div>
        )}
      </div>

    </div>
  )
}
