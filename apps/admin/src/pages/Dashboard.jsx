import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  GiftIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  FireIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { getAllUsers } from '@shared/firebase/auth'
import {
  getResumenDiarioCaja,
  getVentasPorHoraDia,
  getTopProductosVendidosDia,
  getInventarioItems,
  getReservasByDate,
  onMesasDashboardSnapshot,
  onPedidosChange,
  onTurnosPosSnapshot,
  toDateStrCR,
  rangeForDateStr,
} from '@shared/firebase/firestore'

function tsMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

function normalizeMesaEstado(raw) {
  const value = String(raw || '').toLowerCase().trim()
  if (value === 'ocupada') return 'ocupada'
  if (value === 'esperandocuenta' || value === 'esperando_cuenta' || value === 'esperandocobro') {
    return 'esperandoCuenta'
  }
  return 'libre'
}

function normalizePedidoEstado(raw) {
  const v = String(raw || '').toLowerCase().trim()
  if (v === 'pendiente' || v === 'pending') return 'pendiente'
  if (v === 'enpreparacion' || v === 'en_preparacion' || v === 'preparing') return 'enPreparacion'
  if (v === 'listo' || v === 'ready') return 'listo'
  if (v === 'finalizado' || v === 'entregado' || v === 'completed' || v === 'finalized') return 'finalizado'
  return 'pendiente'
}

function moneyCRC(n) {
  const x = Number(n || 0)
  return `₡${Math.round(x).toLocaleString('es-CR')}`
}

/** Monto corto encima de cada barra (24 columnas). */
function moneyCompactCRC(n) {
  const x = Math.round(Number(n) || 0)
  if (x <= 0) return ''
  if (x >= 1_000_000) return `₡${(x / 1_000_000).toFixed(1)}M`
  if (x >= 1000) return `₡${Math.round(x / 1000)}k`
  return `₡${x}`
}

const modules = [
  { icon: ClipboardDocumentListIcon, name: 'Pedidos', path: '/orders', desc: 'Mesas y estados', color: 'from-emerald-500 to-green-600' },
  { icon: CubeIcon, name: 'Inventario', path: '/inventory', desc: 'Stock y catalogo', color: 'from-purple-500 to-violet-600' },
  { icon: BanknotesIcon, name: 'Contabilidad', path: '/accounting', desc: 'Finanzas', color: 'from-amber-500 to-orange-600' },
  { icon: ChartBarIcon, name: 'Reportes', path: '/reports', desc: 'Analisis', color: 'from-indigo-500 to-blue-600' },
  { icon: UsersIcon, name: 'Usuarios', path: '/users', desc: 'Personal', color: 'from-pink-500 to-rose-600' },
  { icon: GiftIcon, name: 'Promociones', path: '/promotions', desc: 'Ofertas', color: 'from-orange-500 to-red-500' },
  { icon: GlobeAltIcon, name: 'Portal Cliente', path: '/portal', desc: 'Reservas publicas', color: 'from-cyan-500 to-teal-600' },
]

/** Area de barras (px). Monto en fila superior separada para no aplastar escala. */
const CHART_AMOUNT_ROW_PX = 22
const CHART_BAR_AREA_PX = 120

function BarChartVentas({ horas, max }) {
  const peak = max > 0 ? max : 1
  const totalDia = horas.reduce((s, x) => s + x, 0)
  let peakHour = 0
  horas.forEach((v, i) => {
    if (v > (horas[peakHour] ?? 0)) peakHour = i
  })
  const tipBarra = (h, monto) =>
    `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59 · ${moneyCRC(monto)}`

  return (
    <div className="space-y-2 px-1">
      {totalDia > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
          <span className="text-gray-600 dark:text-zinc-400">
            Total del dia:{' '}
            <strong className="text-gray-900 dark:text-zinc-100">{moneyCRC(totalDia)}</strong>
          </span>
          {max > 0 && (
            <span className="text-gray-600 dark:text-zinc-400">
              Hora con mas ventas:{' '}
              <strong className="text-gray-900 dark:text-zinc-100">
                {peakHour}h
              </strong>{' '}
              ({moneyCRC(horas[peakHour])})
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-end gap-0.5 sm:gap-1 border-b border-gray-200 dark:border-zinc-700"
        style={{ height: CHART_AMOUNT_ROW_PX + CHART_BAR_AREA_PX }}
      >
        {horas.map((monto, h) => {
          const ratio = peak > 0 ? monto / peak : 0
          const barPx =
            monto > 0 ? Math.max(6, Math.round(ratio * CHART_BAR_AREA_PX)) : 3
          return (
            <div
              key={h}
              className="flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch justify-end"
            >
              <div
                className="flex items-end justify-center text-center"
                style={{ height: CHART_AMOUNT_ROW_PX }}
              >
                {monto > 0 ? (
                  <span
                    className="block max-w-full truncate px-0.5 text-[8px] font-semibold leading-tight text-cyan-800 dark:text-cyan-300"
                    title={tipBarra(h, monto)}
                  >
                    {moneyCompactCRC(monto)}
                  </span>
                ) : (
                  <span className="text-[8px] text-gray-300 dark:text-zinc-700">–</span>
                )}
              </div>
              <div
                className="tooltip tooltip-top flex w-full items-end justify-center"
                data-tip={tipBarra(h, monto)}
              >
                <div
                  className="w-full max-w-[14px] rounded-t bg-cyan-600 shadow-sm transition-all hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400"
                  style={{ height: barPx }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-0.5 sm:gap-1">
        {horas.map((_, h) => (
          <div key={`lbl-${h}`} className="min-w-0 flex-1 text-center">
            <span
              className={`text-[9px] ${h % 4 === 0 ? 'text-gray-600 dark:text-zinc-400' : 'text-gray-400 dark:text-zinc-600'}`}
            >
              {h}h
            </span>
          </div>
        ))}
      </div>

      {totalDia === 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-zinc-500">
          Sin ventas POS este dia en el rango consultado.
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [fechaDia] = useState(() => toDateStrCR(new Date()))
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState(null)
  const [ventasHora, setVentasHora] = useState({ horas: Array(24).fill(0), max: 0 })
  const [topProductos, setTopProductos] = useState([])
  const [mesas, setMesas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [turnos, setTurnos] = useState([])
  const [inventario, setInventario] = useState([])
  const [reservasHoy, setReservasHoy] = useState([])
  const [userNames, setUserNames] = useState({})
  const [loadingVentas, setLoadingVentas] = useState(true)

  const loadVentasAgregados = useCallback(async () => {
    setLoadingVentas(true)
    setError('')
    try {
      const [r, vh, tp] = await Promise.all([
        getResumenDiarioCaja(fechaDia),
        getVentasPorHoraDia(fechaDia),
        getTopProductosVendidosDia(fechaDia, 5),
      ])
      setResumen(r)
      setVentasHora(vh)
      setTopProductos(tp)
    } catch (e) {
      setError(e?.message || 'Error al cargar indicadores de ventas.')
    } finally {
      setLoadingVentas(false)
    }
  }, [fechaDia])

  useEffect(() => {
    loadVentasAgregados()
    const t = setInterval(loadVentasAgregados, 120000)
    return () => clearInterval(t)
  }, [loadVentasAgregados])

  useEffect(() => {
    let ok = true
    ;(async () => {
      try {
        const [inv, reservas, users] = await Promise.all([
          getInventarioItems(),
          getReservasByDate(fechaDia),
          getAllUsers().catch(() => []),
        ])
        if (!ok) return
        setInventario(inv || [])
        setReservasHoy(reservas || [])
        const map = {}
        ;(users || []).forEach((u) => {
          const id = String(u.uid || u.id || '').trim()
          if (!id) return
          map[id] = String(u.name || u.nombre || u.email || id).trim()
        })
        setUserNames(map)
      } catch (e) {
        if (ok) setError((prev) => prev || e?.message || 'Error al cargar datos.')
      }
    })()
    return () => {
      ok = false
    }
  }, [fechaDia])

  useEffect(() => {
    const unsubMesas = onMesasDashboardSnapshot(setMesas)
    const unsubPedidos = onPedidosChange(setPedidos)
    const unsubTurnos = onTurnosPosSnapshot(setTurnos)
    return () => {
      unsubMesas()
      unsubPedidos()
      unsubTurnos()
    }
  }, [])

  const mesaCounts = useMemo(() => {
    let libre = 0
    let ocupada = 0
    let esperandoCuenta = 0
    for (const m of mesas) {
      const e = normalizeMesaEstado(m.estadoMesa ?? m.estado)
      if (e === 'ocupada') ocupada += 1
      else if (e === 'esperandoCuenta') esperandoCuenta += 1
      else libre += 1
    }
    return { libre, ocupada, esperandoCuenta, total: mesas.length }
  }, [mesas])

  const cocinaCounts = useMemo(() => {
    let pendiente = 0
    let enPreparacion = 0
    let listo = 0
    for (const p of pedidos) {
      const s = normalizePedidoEstado(p.estado || p.estadoPedido)
      if (s === 'finalizado') continue
      if (s === 'pendiente') pendiente += 1
      else if (s === 'enPreparacion') enPreparacion += 1
      else if (s === 'listo') listo += 1
    }
    return { pendiente, enPreparacion, listo }
  }, [pedidos])

  const avgPrepMin = useMemo(() => {
    const { start, end } = rangeForDateStr(fechaDia)
    const startMs = start.getTime()
    const endMs = end.getTime()
    const samples = []
    for (const p of pedidos) {
      const listoAt = tsMs(p.listoAt || p.readyAt)
      if (listoAt < startMs || listoAt > endMs) continue
      const started = tsMs(p.startedAt || p.timestamp || p.createdAt)
      if (!started || listoAt <= started) continue
      const mins = (listoAt - started) / 60000
      if (mins >= 0 && mins < 480) samples.push(mins)
    }
    if (samples.length === 0) return null
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
  }, [pedidos, fechaDia])

  const lowStockCount = useMemo(() => {
    return (inventario || []).filter((i) => Number(i.cantidad || 0) <= Number(i.minCantidad ?? 10)).length
  }, [inventario])

  const reservasConfirmadasHoy = useMemo(
    () => reservasHoy.filter((r) => String(r.estado || '').toLowerCase() === 'confirmada').length,
    [reservasHoy]
  )

  const turnosActivos = useMemo(
    () =>
      turnos.filter((t) => t.estadoTurno === 'abierto' || t.estadoTurno === 'pausado'),
    [turnos]
  )

  const ventasTotales = resumen?.resumenActual?.ventasTotales ?? 0
  const ventasTxCount = resumen?.cantidadVentas ?? resumen?.cantidadTransacciones ?? 0
  const movimientosCfCount = resumen?.cantidadTransacciones ?? 0
  const ticketPromedio = ventasTxCount > 0 ? Math.round(ventasTotales / ventasTxCount) : 0
  const deltaVentas = resumen?.comparacion?.deltaVentas ?? 0
  const ventasAyer = Number(resumen?.resumenAnterior?.ventasTotales || 0)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-zinc-100 font-poppins">Dashboard operativo</h1>
        <p className="text-gray-600 dark:text-zinc-400 text-sm mt-1">
          Ventas del resumen y del grafico: actualizadas cada 2 minutos.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Ventas hoy</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-1 truncate">
                {loadingVentas ? '...' : moneyCRC(ventasTotales)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs">
                {deltaVentas >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span
                  className={
                    deltaVentas >= 0
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-amber-800 dark:text-amber-300'
                  }
                >
                  {deltaVentas >= 0 ? '+' : ''}
                  {moneyCRC(deltaVentas)} vs ayer
                </span>
              </div>
            </div>
            <BanknotesIcon className="w-9 h-9 text-primary/80 shrink-0" />
          </div>
        </div>

        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 shadow-sm">
          <div className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Ventas (ops.)</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-1">
            {loadingVentas ? '...' : ventasTxCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
            Pagos POS + ventas manuales. CF total: {loadingVentas ? '...' : movimientosCfCount}
          </div>
        </div>

        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 shadow-sm">
          <div className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Ticket promedio</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-1">
            {loadingVentas ? '...' : moneyCRC(ticketPromedio)}
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Ayer: {moneyCRC(ventasAyer)} total</div>
        </div>

        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Inventario critico</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-1">{lowStockCount}</div>
              <Link to="/inventory" className="text-xs text-primary font-semibold mt-1 inline-block hover:underline">
                Ir a inventario
              </Link>
            </div>
            <ExclamationTriangleIcon
              className={`w-9 h-9 shrink-0 ${lowStockCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-300 dark:text-zinc-600'}`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <TableCellsIcon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              Mesas
            </h2>
            <Link to="/orders" className="text-sm text-primary font-medium hover:underline">
              Gestionar
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 py-3 px-2 dark:border-emerald-800/50 dark:bg-emerald-950/45">
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{mesaCounts.libre}</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300/90 font-medium">Libre</div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/80 py-3 px-2 dark:border-sky-800/50 dark:bg-sky-950/45">
              <div className="text-2xl font-bold text-sky-800 dark:text-sky-200">{mesaCounts.ocupada}</div>
              <div className="text-xs text-sky-700 dark:text-sky-300/90 font-medium">Ocupada</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 py-3 px-2 dark:border-amber-800/50 dark:bg-amber-950/45">
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{mesaCounts.esperandoCuenta}</div>
              <div className="text-xs text-amber-800 dark:text-amber-300/90 font-medium">Lista pagar</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 mt-3 flex flex-wrap items-center gap-3">
            <span>Total mesas: {mesaCounts.total}</span>
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="w-4 h-4" />
              Reservas confirmadas hoy:{' '}
              <strong>{reservasConfirmadasHoy}</strong>
              <Link to="/reservas" className="text-primary font-medium hover:underline ml-1">
                Ver
              </Link>
            </span>
          </div>
        </div>

        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              Cocina (pedidos activos)
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-gray-200 bg-gray-50 py-3 px-2 dark:border-zinc-600 dark:bg-zinc-800/70">
              <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{cocinaCounts.pendiente}</div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Pendiente</div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50/80 py-3 px-2 dark:border-orange-800/50 dark:bg-orange-950/45">
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{cocinaCounts.enPreparacion}</div>
              <div className="text-xs text-orange-800 dark:text-orange-300/90 font-medium">En prep.</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/80 py-3 px-2 dark:border-green-800/50 dark:bg-green-950/45">
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">{cocinaCounts.listo}</div>
              <div className="text-xs text-green-800 dark:text-green-300/90 font-medium">Listo</div>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-zinc-400 mt-3">
            Tiempo promedio preparacion (hoy, pedidos que ya marcaron listo):{' '}
            <span className="font-semibold text-gray-900 dark:text-zinc-100">
              {avgPrepMin == null ? 'Sin datos' : `${avgPrepMin} min`}
            </span>
          </div>
        </div>
      </div>

      <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
            Turnos POS activos
          </h2>
          <span className="text-sm text-gray-500 dark:text-zinc-500">{turnosActivos.length} turno(s)</span>
        </div>
        {turnosActivos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-zinc-500">No hay turnos abiertos o en pausa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-700 text-left text-xs text-gray-500 dark:text-zinc-400">
                  <th className="py-2 pr-2">Usuario</th>
                  <th className="py-2 pr-2">Terminal</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {turnosActivos.map((t) => {
                  const uid = String(t.usuarioId || '')
                  const label = userNames[uid] || uid.slice(0, 10) || '—'
                  return (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-zinc-800 text-sm">
                      <td className="py-2 pr-2 font-medium text-gray-800 dark:text-zinc-200">{label}</td>
                      <td className="py-2 pr-2 text-gray-600 dark:text-zinc-400">{t.terminalId || '—'}</td>
                      <td className="py-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            t.estadoTurno === 'pausado'
                              ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/60'
                              : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800/60'
                          }`}
                        >
                          {t.estadoTurno === 'pausado' ? 'Pausado' : 'Abierto'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 md:p-5">
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 mb-4">Ventas por hora (hoy)</h2>
          {loadingVentas ? (
            <div className="h-40 flex items-center justify-center text-gray-500 dark:text-zinc-500 text-sm">
              Cargando...
            </div>
          ) : (
            <BarChartVentas horas={ventasHora.horas} max={ventasHora.max} />
          )}
        </div>

        <div className="card bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 p-4 md:p-5">
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 mb-4">Top 5 productos (hoy)</h2>
          {loadingVentas ? (
            <div className="text-gray-500 dark:text-zinc-500 text-sm">Cargando...</div>
          ) : topProductos.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-500">
              No hay lineas con detalle en pagos del dia (o sin ventas).
            </p>
          ) : (
            <ul className="space-y-2">
              {topProductos.map((p, idx) => (
                <li
                  key={p.productoId + p.nombre + idx}
                  className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-zinc-100 truncate">{p.nombre}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-500">{p.cantidad} u.</div>
                  </div>
                  <div className="text-sm font-bold text-gray-800 dark:text-zinc-200 shrink-0">{moneyCRC(p.monto)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 flex items-start gap-3 dark:border-amber-800/60 dark:bg-amber-950/40">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <strong>{lowStockCount}</strong> insumo(s) en stock critico (bajo minimo).{' '}
            <Link
              to="/inventory"
              className="font-semibold text-amber-950 dark:text-amber-200 underline hover:no-underline"
            >
              Revisar inventario
            </Link>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-3 font-poppins">Modulos del sistema</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules.map((m) => (
            <Link key={m.name} to={m.path}>
              <div className="card bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-700 p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 group h-full">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-md`}
                >
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold text-gray-800 dark:text-zinc-100 group-hover:text-primary transition-colors text-sm">
                  {m.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
