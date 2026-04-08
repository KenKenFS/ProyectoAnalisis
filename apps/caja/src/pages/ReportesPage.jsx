import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { getCategorias, getVentasPorProductoRango, toDateStrCR } from '@shared/firebase/firestore'

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

function PieVentas({ rows, totalMonto }) {
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
    const tip = `${row.nombre}: ${moneyCRC(row.monto)} · ${row.cantidad} u. · ${pct.toFixed(1)}%`
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

function BarVentas({ rows, totalMonto }) {
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
          const tip = `${row.nombre} · ${moneyCRC(row.monto)} · ${row.cantidad} u. · ${pct.toFixed(1)}% del total`
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

export default function ReportesPage() {
  const initial = useMemo(() => defaultDateRange(), [])
  const [desde, setDesde] = useState(initial.start)
  const [hasta, setHasta] = useState(initial.end)
  const [categoria, setCategoria] = useState('')
  const [chartType, setChartType] = useState('bars')
  const [categorias, setCategorias] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCategorias = useCallback(async () => {
    try {
      const list = await getCategorias()
      setCategorias(list.sort((a, b) => a.localeCompare(b, 'es')))
    } catch {
      setCategorias([])
    }
  }, [])

  const fetchReport = useCallback(async () => {
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

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const totalMonto = useMemo(() => rows.reduce((s, r) => s + r.monto, 0), [rows])
  const totalUnidades = useMemo(() => rows.reduce((s, r) => s + r.cantidad, 0), [rows])
  const ticketPromedio = rows.length > 0 ? totalMonto / totalUnidades : 0

  const kpi = [
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

  const downloadCsv = () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">
          <ChartBarIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          Ventas por producto
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          RA-002 · Montos por líneas cobradas en el período (POS y venta directa)
        </p>
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
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="btn btn-primary btn-sm gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="btn btn-outline btn-sm gap-2 border-gray-300 dark:border-zinc-600"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Descargar CSV
          </button>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500">
            <CalendarIcon className="h-4 w-4" />
            Zona horaria: Costa Rica (fechas de negocio)
          </span>
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
    </div>
  )
}
