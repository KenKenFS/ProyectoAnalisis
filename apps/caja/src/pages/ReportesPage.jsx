import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TagIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import {
  getCategorias,
  getVentasPorProductoRango,
  getCobrosPorUsuarioRango,
  getDetalleCobrosUsuarioRango,
  toDateStrCR,
} from '@shared/firebase/firestore'

function moneyCRC(n) {
  const x = Number(n || 0)
  return `₡${Math.round(x).toLocaleString('es-CR')}`
}

function moneyCompactCRC(n) {
  const x = Math.round(Number(n) || 0)
  if (x <= 0) return ''
  if (x >= 1_000_000) return `₡${(x / 1_000_000).toFixed(1)}M`
  if (x >= 1000) return `₡${Math.round(x / 1000)}k`
  return `₡${x}`
}

const BAR_AREA_PX = 140
const LABEL_ROW_PX = 52
const MAX_BARS = 18
const PIE_MAX_SLICES = 10

const CHART_COLORS = [
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0d9488',
  '#4f46e5',
  '#be123c',
]

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function PieVentas({ rows, totalMonto, quantitySuffix = 'u.' }) {
  const prepared = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.monto - a.monto)
    if (sorted.length <= PIE_MAX_SLICES) return { slices: sorted, other: null }
    const top = sorted.slice(0, PIE_MAX_SLICES - 1)
    const rest = sorted.slice(PIE_MAX_SLICES - 1)
    const otherMonto = rest.reduce((s, r) => s + r.monto, 0)
    const otherQty = rest.reduce((s, r) => s + r.cantidad, 0)
    return {
      slices: [
        ...top,
        {
          productoId: '__otros__',
          nombre: `Otros (${rest.length})`,
          cantidad: otherQty,
          monto: otherMonto,
          categoria: '',
        },
      ],
      other: rest.length,
    }
  }, [rows])

  const cx = 100
  const cy = 100
  const r = 78

  let angle = 0
  const paths = prepared.slices.map((row, i) => {
    const sweep = totalMonto > 0 ? (row.monto / totalMonto) * 360 : 0
    const start = angle
    angle += sweep
    if (sweep <= 0.01) return null
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, start + sweep)
    const largeArc = sweep > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const pct = totalMonto > 0 ? (100 * row.monto) / totalMonto : 0
    const tip = `${row.nombre}: ${moneyCRC(row.monto)} · ${row.cantidad} ${quantitySuffix} · ${pct.toFixed(1)}%`
    return (
      <path key={`${row.productoId}-${i}`} d={d} fill={CHART_COLORS[i % CHART_COLORS.length]}>
        <title>{tip}</title>
      </path>
    )
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="h-56 w-56 max-w-full" role="img" aria-label="Ventas por producto">
        {paths}
      </svg>
      {prepared.other > 0 && (
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          Circular: top {PIE_MAX_SLICES - 1} productos + agrupación &quot;Otros&quot;.
        </p>
      )}
      <ul className="grid w-full max-w-md grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {prepared.slices.map((row, i) => (
          <li key={`${row.productoId}-${i}`} className="flex items-center gap-2 truncate">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="truncate text-gray-700 dark:text-zinc-300" title={row.nombre}>
              {row.nombre}
            </span>
            <span className="ml-auto shrink-0 font-medium text-gray-900 dark:text-zinc-100">
              {moneyCompactCRC(row.monto)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Evita solapamiento de etiquetas: ancho fijo por columna, nombre debajo de la barra. */
function formatCajeroChartName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function BarCobrosPorUsuario({ rows, totalMonto, quantitySuffix = 'op.' }) {
  const display = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.monto - a.monto)
    return sorted.slice(0, MAX_BARS)
  }, [rows])

  const max = useMemo(() => display.reduce((m, r) => Math.max(m, r.monto), 0), [display])
  const peak = max > 0 ? max : 1

  return (
    <div className="space-y-3 px-1">
      {totalMonto > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
          <span className="text-gray-600 dark:text-zinc-400">
            Total período:{' '}
            <strong className="text-gray-900 dark:text-zinc-100">{moneyCRC(totalMonto)}</strong>
          </span>
          {rows.length > MAX_BARS && (
            <span className="text-gray-500 dark:text-zinc-500">Mostrando {MAX_BARS} de {rows.length} usuarios</span>
          )}
        </div>
      )}

      <div className="overflow-x-auto pb-1">
        <div
          className="flex items-end gap-3 px-1"
          style={{ minHeight: 24 + BAR_AREA_PX + 72 }}
        >
          {display.map((row) => {
            const hPx = Math.round((row.monto / peak) * BAR_AREA_PX)
            const pct = totalMonto > 0 ? (100 * row.monto) / totalMonto : 0
            const label = formatCajeroChartName(row.nombre)
            const tip = `${label} · ${moneyCRC(row.monto)} · ${row.cantidad} ${quantitySuffix} · ${pct.toFixed(1)}% del total`
            const colKey = String(row.productoId || '').trim() || label
            return (
              <div
                key={colKey}
                className="tooltip tooltip-top flex w-[7.5rem] shrink-0 flex-col items-stretch gap-1"
                data-tip={tip}
              >
                <div className="text-center text-[10px] font-semibold leading-none text-cyan-800 dark:text-red-300">
                  {moneyCompactCRC(row.monto)}
                </div>
                <div className="flex w-full flex-col items-center justify-end" style={{ height: BAR_AREA_PX }}>
                  <div
                    className="w-4/5 max-w-[56px] rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-sm dark:from-red-800 dark:to-red-500"
                    style={{ height: Math.max(hPx, 4) }}
                  />
                </div>
                <p
                  className="min-h-[3rem] w-full overflow-hidden break-words px-0.5 text-center text-[11px] font-medium leading-snug text-gray-700 dark:text-zinc-300"
                  title={label}
                >
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BarVentas({ rows, totalMonto, quantitySuffix = 'u.' }) {
  const display = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.monto - a.monto)
    return sorted.slice(0, MAX_BARS)
  }, [rows])

  const max = useMemo(() => display.reduce((m, r) => Math.max(m, r.monto), 0), [display])
  const peak = max > 0 ? max : 1

  return (
    <div className="space-y-2 px-1">
      {totalMonto > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
          <span className="text-gray-600 dark:text-zinc-400">
            Total período:{' '}
            <strong className="text-gray-900 dark:text-zinc-100">{moneyCRC(totalMonto)}</strong>
          </span>
          {rows.length > MAX_BARS && (
            <span className="text-gray-500 dark:text-zinc-500">Mostrando {MAX_BARS} de {rows.length} productos</span>
          )}
        </div>
      )}

      <div
        className="flex max-w-full items-end gap-1 overflow-x-auto pb-1"
        style={{ minHeight: LABEL_ROW_PX + BAR_AREA_PX }}
      >
        {display.map((row) => {
          const hPx = Math.round((row.monto / peak) * BAR_AREA_PX)
          const pct = totalMonto > 0 ? (100 * row.monto) / totalMonto : 0
          const tip = `${row.nombre} · ${moneyCRC(row.monto)} · ${row.cantidad} ${quantitySuffix} · ${pct.toFixed(1)}% del total`
          return (
            <div
              key={row.productoId + row.nombre}
              className="tooltip tooltip-top flex min-w-[44px] max-w-[72px] flex-1 flex-col items-center gap-1"
              data-tip={tip}
            >
              <span className="line-clamp-2 min-h-[2.5rem] text-center text-[10px] leading-tight text-gray-600 dark:text-zinc-400">
                {row.nombre}
              </span>
              <div className="flex w-full flex-col items-center justify-end" style={{ height: BAR_AREA_PX }}>
                <span className="mb-0.5 text-[10px] font-medium text-cyan-700 dark:text-red-400">
                  {moneyCompactCRC(row.monto)}
                </span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-sm dark:from-red-800 dark:to-red-500"
                  style={{ height: Math.max(hPx, 4) }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function defaultDateRange() {
  const now = new Date()
  const end = toDateStrCR(now)
  const startD = new Date(now)
  startD.setDate(startD.getDate() - 6)
  const start = toDateStrCR(startD)
  return { start, end }
}

function rowKeyCobro(row) {
  return row.usuarioUid == null || row.usuarioUid === '' ? '__sin__' : row.usuarioUid
}

export default function ReportesPage() {
  const initial = useMemo(() => defaultDateRange(), [])
  const [desde, setDesde] = useState(initial.start)
  const [hasta, setHasta] = useState(initial.end)
  const [tab, setTab] = useState('productos')
  const [categoria, setCategoria] = useState('')
  const [chartType, setChartType] = useState('bars')
  const [categorias, setCategorias] = useState([])
  const [rows, setRows] = useState([])
  const [cobrosRows, setCobrosRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedCajaKey, setExpandedCajaKey] = useState(null)
  const [detalleCaja, setDetalleCaja] = useState({})
  const [detalleLoading, setDetalleLoading] = useState(null)

  const loadCategorias = useCallback(async () => {
    try {
      const list = await getCategorias()
      setCategorias(list.sort((a, b) => a.localeCompare(b, 'es')))
    } catch {
      setCategorias([])
    }
  }, [])

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const opt = categoria ? { categoria: categoria.toLowerCase() } : {}
      const data = await getVentasPorProductoRango(desde, hasta, opt)
      setRows(data)
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el reporte.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, categoria])

  const fetchCobros = useCallback(async () => {
    setLoading(true)
    setError('')
    setExpandedCajaKey(null)
    setDetalleCaja({})
    try {
      const data = await getCobrosPorUsuarioRango(desde, hasta)
      setCobrosRows(data)
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el reporte.')
      setCobrosRows([])
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  useEffect(() => {
    if (tab === 'productos') fetchProductos()
    else fetchCobros()
  }, [tab, fetchProductos, fetchCobros])

  const totalMonto = useMemo(() => rows.reduce((s, r) => s + r.monto, 0), [rows])
  const totalUnidades = useMemo(() => rows.reduce((s, r) => s + r.cantidad, 0), [rows])
  const ticketPromedio = rows.length > 0 ? totalMonto / totalUnidades : 0

  const totalCobrosMonto = useMemo(() => cobrosRows.reduce((s, r) => s + r.montoTotal, 0), [cobrosRows])
  const totalCobrosOps = useMemo(() => cobrosRows.reduce((s, r) => s + r.operaciones, 0), [cobrosRows])
  const promedioOpCaja = totalCobrosOps > 0 ? totalCobrosMonto / totalCobrosOps : 0

  const cobrosChartRows = useMemo(
    () =>
      cobrosRows.map((r) => ({
        productoId: rowKeyCobro(r),
        nombre: formatCajeroChartName(r.nombre),
        monto: r.montoTotal,
        cantidad: r.operaciones,
        categoria: '',
      })),
    [cobrosRows]
  )

  const kpiProductos = [
    {
      label: 'Ventas (productos)',
      value: moneyCRC(totalMonto),
      trend: `${rows.length} productos`,
      icon: ArrowTrendingUpIcon,
      color: 'green',
    },
    {
      label: 'Unidades vendidas',
      value: String(Math.round(totalUnidades)),
      trend: 'Suma de cantidades',
      icon: ChartBarIcon,
      color: 'blue',
    },
    {
      label: 'Ticket promedio / u.',
      value: Number.isFinite(ticketPromedio) ? moneyCRC(ticketPromedio) : moneyCRC(0),
      trend: 'Monto / unidad',
      icon: ChartBarIcon,
      color: 'cyan',
    },
    {
      label: 'Categoría',
      value: categoria ? categorias.find((c) => c.toLowerCase() === categoria.toLowerCase()) || categoria : 'Todas',
      trend: 'Filtro activo',
      icon: TagIcon,
      color: 'purple',
    },
  ]

  const kpiCaja = [
    {
      label: 'Total cobrado',
      value: moneyCRC(totalCobrosMonto),
      trend: 'Suma de pagos y ventas directas',
      icon: ArrowTrendingUpIcon,
      color: 'green',
    },
    {
      label: 'Operaciones',
      value: String(totalCobrosOps),
      trend: 'Cobros registrados',
      icon: ChartBarIcon,
      color: 'blue',
    },
    {
      label: 'Promedio / operación',
      value: Number.isFinite(promedioOpCaja) ? moneyCRC(promedioOpCaja) : moneyCRC(0),
      trend: 'En el período',
      icon: ChartBarIcon,
      color: 'cyan',
    },
    {
      label: 'Usuarios con cobros',
      value: String(cobrosRows.length),
      trend: 'Quien registró el cobro',
      icon: UsersIcon,
      color: 'purple',
    },
  ]

  const kpi = tab === 'productos' ? kpiProductos : kpiCaja

  const downloadCsvProductos = () => {
    if (rows.length === 0) return
    const header = ['Producto', 'Categoria', 'Cantidad', 'Monto', 'Porcentaje del total']
    const lines = rows.map((r) => {
      const pct = totalMonto > 0 ? ((100 * r.monto) / totalMonto).toFixed(2) : '0'
      return [r.nombre, r.categoria || '', String(r.cantidad), String(r.monto), pct].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    })
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas-por-producto_${desde}_${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsvCaja = () => {
    if (cobrosRows.length === 0) return
    const header = ['Usuario', 'Operaciones', 'Monto total', 'Porcentaje del total']
    const lines = cobrosRows.map((r) => {
      const pct = totalCobrosMonto > 0 ? ((100 * r.montoTotal) / totalCobrosMonto).toFixed(2) : '0'
      return [r.nombre, String(r.operaciones), String(r.montoTotal), pct].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    })
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cobros-por-usuario_${desde}_${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleDetalleCaja = async (row) => {
    const key = rowKeyCobro(row)
    if (expandedCajaKey === key) {
      setExpandedCajaKey(null)
      return
    }
    setExpandedCajaKey(key)
    if (detalleCaja[key]) return
    setDetalleLoading(key)
    setError('')
    try {
      const lineas = await getDetalleCobrosUsuarioRango(row.usuarioUid, desde, hasta)
      setDetalleCaja((prev) => ({ ...prev, [key]: lineas }))
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el detalle.')
      setExpandedCajaKey(null)
    } finally {
      setDetalleLoading(null)
    }
  }

  const refresh = () => {
    if (tab === 'productos') fetchProductos()
    else fetchCobros()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">
          <ChartBarIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          Reportes
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          {tab === 'productos'
            ? 'RA-002 · Ventas por producto'
            : 'RA-003 · Cobros por usuario de caja (quien registró el pago)'}
        </p>
      </div>

      <div role="tablist" className="tabs tabs-boxed w-full max-w-xl bg-gray-100 p-1 dark:bg-zinc-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'productos'}
          className={`tab flex-1 ${tab === 'productos' ? 'tab-active bg-white shadow dark:bg-zinc-700' : ''}`}
          onClick={() => setTab('productos')}
        >
          Por producto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'caja'}
          className={`tab flex-1 gap-1 ${tab === 'caja' ? 'tab-active bg-white shadow dark:bg-zinc-700' : ''}`}
          onClick={() => setTab('caja')}
        >
          <UsersIcon className="h-4 w-4" />
          Cobros por usuario
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-zinc-300">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-cyan-900/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-zinc-300">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-cyan-900/40"
            />
          </div>
          {tab === 'productos' ? (
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-zinc-300">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-cyan-900/40"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c} value={c.toLowerCase()}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden lg:block" aria-hidden="true" />
          )}
          <div className="flex flex-col justify-end gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-500">Visualización</span>
            <div className="join w-full">
              <button
                type="button"
                className={`btn join-item btn-sm flex-1 border-gray-300 ${chartType === 'bars' ? 'btn-active bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-white dark:bg-zinc-800'}`}
                onClick={() => setChartType('bars')}
              >
                Barras
              </button>
              <button
                type="button"
                className={`btn join-item btn-sm flex-1 border-gray-300 ${chartType === 'pie' ? 'btn-active bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-white dark:bg-zinc-800'}`}
                onClick={() => setChartType('pie')}
              >
                Circular
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={refresh} disabled={loading} className="btn btn-primary btn-sm gap-2">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          {tab === 'productos' ? (
            <button
              type="button"
              onClick={downloadCsvProductos}
              disabled={rows.length === 0}
              className="btn btn-outline btn-sm gap-2 border-gray-300 dark:border-zinc-600"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Descargar CSV
            </button>
          ) : (
            <button
              type="button"
              onClick={downloadCsvCaja}
              disabled={cobrosRows.length === 0}
              className="btn btn-outline btn-sm gap-2 border-gray-300 dark:border-zinc-600"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Descargar CSV
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error text-sm dark:bg-red-950/50 dark:text-red-100">
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpi.map((item, idx) => {
          const Icon = item.icon
          const colorClasses = {
            green: 'border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400',
            blue: 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
            cyan: 'border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400',
            purple: 'border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400',
          }
          return (
            <div key={idx} className={`rounded-lg border p-4 ${colorClasses[item.color]}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">{item.label}</h3>
                <Icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{item.value}</div>
              <div className="mt-2 text-xs font-semibold text-gray-600 dark:text-zinc-400">{item.trend}</div>
            </div>
          )
        })}
      </div>

      {tab === 'productos' && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">
              {chartType === 'bars' ? 'Gráfico de barras' : 'Gráfico circular'}
            </h3>

            {loading && (
              <div className="flex h-64 items-center justify-center text-gray-500 dark:text-zinc-400">
                <span className="loading loading-spinner loading-lg text-cyan-600" />
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 dark:border-zinc-600 dark:bg-zinc-800/40">
                <ChartBarIcon className="mb-2 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 dark:text-zinc-400">No hay ventas en este período</p>
              </div>
            )}

            {!loading && rows.length > 0 && chartType === 'bars' && <BarVentas rows={rows} totalMonto={totalMonto} />}

            {!loading && rows.length > 0 && chartType === 'pie' && <PieVentas rows={rows} totalMonto={totalMonto} />}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">Detalle por producto</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-600">
                    <th className="py-3 pl-0 pr-2 text-left font-semibold text-gray-700 dark:text-zinc-300">Producto</th>
                    <th className="hidden py-3 pr-2 text-left font-semibold text-gray-700 sm:table-cell dark:text-zinc-300">
                      Categoría
                    </th>
                    <th className="py-3 pr-2 text-right font-semibold text-gray-700 dark:text-zinc-300">Cantidad</th>
                    <th className="py-3 pr-2 text-right font-semibold text-gray-700 dark:text-zinc-300">Monto</th>
                    <th className="py-3 pr-0 text-right font-semibold text-gray-700 dark:text-zinc-300">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const pct = totalMonto > 0 ? (100 * row.monto) / totalMonto : 0
                    return (
                      <tr key={row.productoId + row.nombre} className="border-b border-gray-100 dark:border-zinc-700/80">
                        <td className="truncate py-3 pl-0 pr-2 text-gray-900 dark:text-zinc-100" title={row.nombre}>
                          {row.nombre}
                        </td>
                        <td className="hidden truncate py-3 pr-2 text-gray-600 sm:table-cell dark:text-zinc-400">
                          {row.categoria || '—'}
                        </td>
                        <td className="py-3 pr-2 text-right text-gray-700 dark:text-zinc-300">{row.cantidad}</td>
                        <td className="py-3 pr-2 text-right font-semibold text-cyan-700 dark:text-cyan-400">
                          {moneyCRC(row.monto)}
                        </td>
                        <td className="py-3 pr-0 text-right text-gray-700 dark:text-zinc-300">{pct.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'caja' && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">
              {chartType === 'bars' ? 'Gráfico de barras' : 'Gráfico circular'}
            </h3>

            {loading && (
              <div className="flex h-64 items-center justify-center text-gray-500 dark:text-zinc-400">
                <span className="loading loading-spinner loading-lg text-cyan-600" />
              </div>
            )}

            {!loading && cobrosRows.length === 0 && (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 dark:border-zinc-600 dark:bg-zinc-800/40">
                <UsersIcon className="mb-2 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 dark:text-zinc-400">No hay cobros en este período</p>
              </div>
            )}

            {!loading && cobrosRows.length > 0 && chartType === 'bars' && (
              <BarCobrosPorUsuario rows={cobrosChartRows} totalMonto={totalCobrosMonto} quantitySuffix="op." />
            )}

            {!loading && cobrosRows.length > 0 && chartType === 'pie' && (
              <PieVentas rows={cobrosChartRows} totalMonto={totalCobrosMonto} quantitySuffix="op." />
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">Resumen por usuario</h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-zinc-500">
              Toque una fila para ver el detalle de cobros (pagos y ventas directas).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-600">
                    <th className="w-10 py-3 pl-0" />
                    <th className="py-3 pr-2 text-left font-semibold text-gray-700 dark:text-zinc-300">Usuario</th>
                    <th className="py-3 pr-2 text-right font-semibold text-gray-700 dark:text-zinc-300">Operaciones</th>
                    <th className="py-3 pr-2 text-right font-semibold text-gray-700 dark:text-zinc-300">Monto</th>
                    <th className="py-3 pr-0 text-right font-semibold text-gray-700 dark:text-zinc-300">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrosRows.map((row) => {
                    const key = rowKeyCobro(row)
                    const open = expandedCajaKey === key
                    const pct = totalCobrosMonto > 0 ? (100 * row.montoTotal) / totalCobrosMonto : 0
                    const lineas = detalleCaja[key]
                    return (
                      <Fragment key={key}>
                        <tr
                          className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-zinc-700/80 dark:hover:bg-zinc-800/60"
                          onClick={() => toggleDetalleCaja(row)}
                        >
                          <td className="py-3 pl-0">
                            {open ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                            )}
                          </td>
                          <td className="py-3 pr-2 font-medium text-gray-900 dark:text-zinc-100">
                            {formatCajeroChartName(row.nombre)}
                          </td>
                          <td className="py-3 pr-2 text-right text-gray-700 dark:text-zinc-300">{row.operaciones}</td>
                          <td className="py-3 pr-2 text-right font-semibold text-cyan-700 dark:text-cyan-400">
                            {moneyCRC(row.montoTotal)}
                          </td>
                          <td className="py-3 pr-0 text-right text-gray-700 dark:text-zinc-300">{pct.toFixed(1)}%</td>
                        </tr>
                        {open && (
                          <tr className="border-b border-gray-100 bg-gray-50/90 dark:border-zinc-700/80 dark:bg-zinc-800/40">
                            <td colSpan={5} className="px-0 pb-4 pt-2">
                              {detalleLoading === key ? (
                                <div className="flex justify-center py-4">
                                  <span className="loading loading-spinner loading-md text-cyan-600" />
                                </div>
                              ) : lineas && lineas.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-600">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 bg-white dark:border-zinc-600 dark:bg-zinc-900/50">
                                        <th className="px-3 py-2 text-left">Tipo</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                        <th className="px-3 py-2 text-right">Monto</th>
                                        <th className="px-3 py-2 text-left">Método</th>
                                        <th className="px-3 py-2 text-left">Referencia</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lineas.map((ln) => (
                                        <tr key={`${ln.tipo}-${ln.id}`} className="border-b border-gray-100 dark:border-zinc-700/80">
                                          <td className="px-3 py-2 text-gray-700 dark:text-zinc-300">
                                            {ln.tipo === 'pago' ? 'Pago POS' : 'Venta directa'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                                            {ln.fechaStr}
                                            {ln.createdAt?.toDate && (
                                              <span className="ml-1 opacity-80">
                                                {ln.createdAt.toDate().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-zinc-100">
                                            {moneyCRC(ln.monto)}
                                          </td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-zinc-300">{ln.metodo}</td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                                            {ln.tipo === 'pago' ? `Pago ${ln.id}` : `Cuenta ${ln.cuentaId || ln.id}`}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="py-2 text-center text-xs text-gray-500">Sin líneas</p>
                              )}
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
        </>
      )}
    </div>
  )
}
