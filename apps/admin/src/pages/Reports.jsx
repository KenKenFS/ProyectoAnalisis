import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChartBarIcon,
  CubeIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@shared/context/ThemeContext'
import {
  getReporteInventarioRango,
  getReporteInventarioTendenciaInsumo,
  getInventarioItems,
  toDateStrCR,
  RA005_MOTIVOS_PERDIDA,
} from '@shared/firebase/firestore'

function moneyCRC(n) {
  const x = Number(n || 0)
  return `₡${Math.round(x).toLocaleString('es-CR')}`
}

function defaultFechaRangoDias(dias) {
  const fin = new Date()
  const ini = new Date(fin)
  ini.setDate(ini.getDate() - (dias - 1))
  return { inicio: toDateStrCR(ini), fin: toDateStrCR(fin) }
}

function labelMotivoPerdida(m) {
  const k = String(m || '').toLowerCase()
  if (k === 'desperdicio') return 'Desperdicio'
  if (k === 'merma') return 'Merma'
  if (k === 'vencimiento') return 'Vencimiento'
  return m
}

function nextDayStrCR(dateStr) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number)
  const ms = Date.UTC(y, (mo || 1) - 1, d || 1, 6, 0, 0, 0) + 86400000
  return toDateStrCR(new Date(ms))
}

function prevDayStrCR(dateStr) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number)
  const ms = Date.UTC(y, (mo || 1) - 1, d || 1, 6, 0, 0, 0) - 86400000
  return toDateStrCR(new Date(ms))
}

function weekdayLongCR(dateStr) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number)
  const utcNoonCR = Date.UTC(y, (mo || 1) - 1, d || 1, 18, 0, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    weekday: 'long',
  }).format(new Date(utcNoonCR))
}

function mondayKeyFromDateStrCR(dateStr) {
  let cur = String(dateStr || '').trim()
  for (let i = 0; i < 7; i += 1) {
    if (weekdayLongCR(cur) === 'Monday') return cur
    cur = prevDayStrCR(cur)
  }
  return cur
}

function etiquetaSemanaCorta(mondayStr) {
  const [, m, d] = String(mondayStr || '').split('-').map(Number)
  if (!m || !d) return String(mondayStr || '')
  return `Sem. ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

function aggregateSerieByWeekCR(serieDiaria) {
  const map = {}
  for (const row of serieDiaria || []) {
    const key = mondayKeyFromDateStrCR(row.fecha)
    if (!map[key]) {
      map[key] = { semanaInicio: key, semanaFin: key, entradas: 0, salidas: 0 }
    }
    map[key].entradas += Number(row.entradas || 0)
    map[key].salidas += Number(row.salidas || 0)
    map[key].semanaFin = row.fecha
  }
  const out = Object.values(map).sort((a, b) => String(a.semanaInicio).localeCompare(String(b.semanaInicio)))
  // Recalcular semanaFin como domingo (o fin del rango) para tooltip/consistencia.
  out.forEach((w) => {
    let cur = w.semanaInicio
    for (let i = 0; i < 6; i += 1) cur = nextDayStrCR(cur)
    w.semanaFin = cur
  })
  return out
}

function qtyShort(n) {
  const x = Number(n || 0)
  if (x === 0) return '0'
  if (Math.abs(x) >= 1000) return `${Math.round(x).toLocaleString('es-CR')}`
  if (Math.abs(x) >= 100) return `${Math.round(x)}`
  return x.toLocaleString('es-CR', { maximumFractionDigits: 2 })
}

function SerieSemanalChart({ weeks, theme }) {
  const max = Math.max(
    1,
    ...weeks.flatMap((d) => [d.entradas || 0, d.salidas || 0])
  )
  const barMuted = theme === 'dark' ? 'bg-zinc-600' : 'bg-slate-200'
  return (
    <div className="flex items-end gap-1 sm:gap-2 min-h-[220px] px-2 pb-2 overflow-x-auto">
      {weeks.map((d) => {
        const hEnt = max > 0 ? (d.entradas / max) * 100 : 0
        const hSal = max > 0 ? (d.salidas / max) * 100 : 0
        const label = etiquetaSemanaCorta(d.semanaInicio)
        return (
          <div key={d.semanaInicio} className="flex flex-col items-center min-w-[56px] flex-1">
            <div className={`text-[10px] leading-tight ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              <span className="text-emerald-500 font-semibold">{qtyShort(d.entradas)}</span>
              <span className="mx-1 opacity-70">/</span>
              <span className="text-rose-500 font-semibold">{qtyShort(d.salidas)}</span>
            </div>
            <div className="flex gap-0.5 items-end h-40 w-full justify-center">
              <div
                className="w-2.5 sm:w-3 rounded-t bg-emerald-500/90"
                style={{ height: `${Math.max(hEnt, 2)}%` }}
                title={`Entradas ${d.entradas.toLocaleString('es-CR')} · ${d.semanaInicio}–${d.semanaFin}`}
              />
              <div
                className="w-2.5 sm:w-3 rounded-t bg-rose-500/90"
                style={{ height: `${Math.max(hSal, 2)}%` }}
                title={`Salidas ${d.salidas.toLocaleString('es-CR')} · ${d.semanaInicio}–${d.semanaFin}`}
              />
            </div>
            <div
              className={`text-[10px] sm:text-xs mt-2 text-center leading-tight ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}
            >
              {label}
            </div>
            <div className={`h-1 w-full rounded ${barMuted} mt-1`} />
          </div>
        )
      })}
    </div>
  )
}

function TendenciaStockChart({ dias, unidad, theme }) {
  if (!dias?.length) return null
  const stocks = dias.map((d) => d.stockFin ?? 0)
  const minS = Math.min(...stocks, 0)
  const maxS = Math.max(...stocks, 1)
  const span = maxS - minS || 1
  return (
    <div className="relative h-44 px-2">
      <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}
          points={dias
            .map((d, i) => {
              const x = (i / Math.max(dias.length - 1, 1)) * 400
              const y = 110 - ((d.stockFin - minS) / span) * 100
              return `${x},${y}`
            })
            .join(' ')}
        />
      </svg>
      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
        Stock al cierre (unidad: {unidad || '—'})
      </p>
    </div>
  )
}

export default function Reports() {
  const { theme } = useTheme()
  const [{ inicio, fin }, setRango] = useState(() => defaultFechaRangoDias(7))
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [report, setReport] = useState(null)
  const [insumos, setInsumos] = useState([])
  const [insumoTendenciaId, setInsumoTendenciaId] = useState('')
  const [tendencia, setTendencia] = useState(null)
  const [loadingTendencia, setLoadingTendencia] = useState(false)

  const cardClass =
    theme === 'dark'
      ? 'card bg-zinc-900 border border-zinc-700 shadow-lg'
      : 'card bg-white border border-gray-200 shadow-lg'
  const headClass = theme === 'dark' ? 'border-zinc-700 text-zinc-100' : 'border-gray-200 text-gray-800'
  const subClass = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await getReporteInventarioRango(inicio, fin)
      setReport(data)
    } catch (e) {
      setErr(e?.message || 'No se pudo cargar el reporte.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [inicio, fin])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getInventarioItems()
      .then((list) => {
        setInsumos(list.sort((a, b) => String(a.nombre).localeCompare(b.nombre, 'es')))
      })
      .catch(() => setInsumos([]))
  }, [])

  useEffect(() => {
    if (!insumoTendenciaId) {
      setTendencia(null)
      return
    }
    let cancelled = false
    setLoadingTendencia(true)
    getReporteInventarioTendenciaInsumo(insumoTendenciaId, inicio, fin)
      .then((t) => {
        if (!cancelled) setTendencia(t)
      })
      .catch(() => {
        if (!cancelled) setTendencia(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingTendencia(false)
      })
    return () => {
      cancelled = true
    }
  }, [insumoTendenciaId, inicio, fin])

  const exportCsv = useCallback(() => {
    if (!report) return
    const rows = []
    rows.push(['Reporte inventario', report.fechaInicio, 'a', report.fechaFin].join(','))
    rows.push(['Top consumo', 'Insumo', 'Unidad', 'Cantidad', 'Costo est.'].join(','))
    report.topConsumo.forEach((r) => {
      rows.push(['', r.nombre, r.unidad, r.cantidad, Math.round(r.costoEstimado || 0)].join(','))
    })
    rows.push(['Stock bajo', 'Nombre', 'Actual', 'Mínimo', 'Déficit'].join(','))
    report.stockBajo.forEach((r) => {
      rows.push(['', r.nombre, r.cantidad, r.minCantidad, r.deficit].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-inventario-${report.fechaInicio}_${report.fechaFin}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  const top15 = useMemo(() => (report?.topConsumo ? report.topConsumo.slice(0, 15) : []), [report])

  const maxBarConsumo = useMemo(() => {
    if (!top15.length) return 1
    return Math.max(...top15.map((r) => r.cantidad), 1)
  }, [top15])

  const serieSemanal = useMemo(() => aggregateSerieByWeekCR(report?.serieDiaria || []), [report])
  const serieSemanalTotales = useMemo(() => {
    const t = { entradas: 0, salidas: 0 }
    serieSemanal.forEach((w) => {
      t.entradas += Number(w.entradas || 0)
      t.salidas += Number(w.salidas || 0)
    })
    return t
  }, [serieSemanal])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold font-poppins ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
            Reportería
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className={`label-text text-xs ${subClass}`}>Desde</span>
            <input
              type="date"
              className="input input-bordered input-sm w-40"
              value={inicio}
              onChange={(e) => setRango((r) => ({ ...r, inicio: e.target.value }))}
            />
          </label>
          <label className="form-control">
            <span className={`label-text text-xs ${subClass}`}>Hasta</span>
            <input
              type="date"
              className="input input-bordered input-sm w-40"
              value={fin}
              onChange={(e) => setRango((r) => ({ ...r, fin: e.target.value }))}
            />
          </label>
          <button type="button" className="btn btn-primary btn-sm gap-1" onClick={load} disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button type="button" className="btn btn-outline btn-sm gap-1" onClick={exportCsv} disabled={!report || loading}>
            <DocumentArrowDownIcon className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {err && (
        <div className="alert alert-error text-sm">
          <span>{err}</span>
        </div>
      )}

      {loading && !report && (
        <div className={`flex justify-center py-16 ${subClass}`}>
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                <span className={`text-sm font-medium ${subClass}`}>Entradas (cantidad)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {report.totales.entradasCantidad.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>{moneyCRC(report.totales.entradasCosto)} costo registrado</p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <CubeIcon className="w-5 h-5 text-rose-500" />
                <span className={`text-sm font-medium ${subClass}`}>Salidas (cantidad)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {report.totales.salidasCantidad.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>En el período seleccionado</p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowTrendingDownIcon className="w-5 h-5 text-amber-500" />
                <span className={`text-sm font-medium ${subClass}`}>Pérdidas (estim.)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {moneyCRC(report.totales.perdidasCosto)}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>
                {report.totales.perdidasCantidad.toLocaleString('es-CR')} u. — merma, desperdicio, vencimiento
              </p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                <span className={`text-sm font-medium ${subClass}`}>Stock bajo</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {report.stockBajo.length}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>Insumos bajo mínimo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardClass}>
              <div className={`p-5 border-b ${headClass}`}>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                  Movimiento semanal
                </h2>
                <p className={`text-sm ${subClass}`}>
                  Entradas (verde) y salidas (rojo) por semana · Total período:{' '}
                  <span className="text-emerald-500 font-semibold">{qtyShort(serieSemanalTotales.entradas)}</span>
                  <span className="mx-1 opacity-70">/</span>
                  <span className="text-rose-500 font-semibold">{qtyShort(serieSemanalTotales.salidas)}</span>
                </p>
              </div>
              <div className="p-4">
                <SerieSemanalChart weeks={serieSemanal} theme={theme} />
                <div className="flex gap-4 justify-center text-xs mt-2">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-500" /> Entradas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-rose-500" /> Salidas
                  </span>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <div className={`p-5 border-b ${headClass}`}>
                <h2 className="font-bold text-lg">Pérdidas por motivo</h2>
                <p className={`text-sm ${subClass}`}>Costo estimado con precio promedio de entradas</p>
              </div>
              <div className="p-5 space-y-3">
                {RA005_MOTIVOS_PERDIDA.map((m) => {
                  const row = report.perdidasPorMotivo[m] || { cantidad: 0, costo: 0 }
                  return (
                    <div key={m} className="flex justify-between items-center gap-2">
                      <span className="font-medium">{labelMotivoPerdida(m)}</span>
                      <span className={`text-sm ${subClass}`}>
                        {row.cantidad.toLocaleString('es-CR')} u. · {moneyCRC(row.costo)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className={`p-5 border-b ${headClass}`}>
              <h2 className="font-bold text-lg">Mayor consumo (salidas)</h2>
              <p className={`text-sm ${subClass}`}>Top 15 insumos por cantidad en el período</p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="table table-sm">
                <thead>
                  <tr className={theme === 'dark' ? 'border-zinc-700' : ''}>
                    <th>#</th>
                    <th>Insumo</th>
                    <th>Unidad</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">Costo est.</th>
                    <th className="min-w-[120px]">Proporción</th>
                  </tr>
                </thead>
                <tbody>
                  {top15.map((r, idx) => (
                    <tr key={r.insumoId} className={theme === 'dark' ? 'hover:bg-zinc-800/80' : ''}>
                      <td>{idx + 1}</td>
                      <td className="font-medium">{r.nombre}</td>
                      <td>{r.unidad}</td>
                      <td className="text-right">{r.cantidad.toLocaleString('es-CR')}</td>
                      <td className="text-right">{moneyCRC(r.costoEstimado)}</td>
                      <td>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'}`}>
                          <div
                            className="h-full bg-indigo-500/90 rounded-full"
                            style={{ width: `${(r.cantidad / maxBarConsumo) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!top15.length && (
                <p className={`text-center py-8 ${subClass}`}>No hay salidas en este período.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardClass}>
              <div className={`p-5 border-b ${headClass}`}>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                  Alertas de stock bajo
                </h2>
                <p className={`text-sm ${subClass}`}>Cantidad actual menor al mínimo configurado</p>
              </div>
              <div className="overflow-x-auto p-4 max-h-80 overflow-y-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th className="text-right">Actual</th>
                      <th className="text-right">Mín.</th>
                      <th className="text-right">Déficit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.stockBajo.map((r) => (
                      <tr key={r.id}>
                        <td>{r.nombre}</td>
                        <td className="text-right">
                          {r.cantidad.toLocaleString('es-CR')} {r.unidad}
                        </td>
                        <td className="text-right">{r.minCantidad}</td>
                        <td className="text-right text-warning font-medium">{r.deficit.toLocaleString('es-CR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!report.stockBajo.length && (
                  <p className={`text-center py-6 ${subClass}`}>Ningún insumo bajo el mínimo.</p>
                )}
              </div>
            </div>

            <div className={cardClass}>
              <div className={`p-5 border-b ${headClass}`}>
                <h2 className="font-bold text-lg">Detalle de pérdidas</h2>
                <p className={`text-sm ${subClass}`}>Registros con motivo merma, desperdicio o vencimiento</p>
              </div>
              <div className="overflow-x-auto p-4 max-h-80 overflow-y-auto">
                <table className="table table-sm table-pin-rows">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Motivo</th>
                      <th className="text-right">Cant.</th>
                      <th className="text-right">Costo est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.perdidasDetalle.slice(0, 40).map((r) => (
                      <tr key={r.id}>
                        <td className="max-w-[140px] truncate" title={r.nombre}>
                          {r.nombre}
                        </td>
                        <td>{labelMotivoPerdida(r.motivo)}</td>
                        <td className="text-right">
                          {r.cantidad.toLocaleString('es-CR')} {r.unidad}
                        </td>
                        <td className="text-right">{moneyCRC(r.costoEstimado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.perdidasDetalle.length > 40 && (
                  <p className={`text-xs mt-2 ${subClass}`}>Mostrando 40 de {report.perdidasDetalle.length} registros.</p>
                )}
                {!report.perdidasDetalle.length && (
                  <p className={`text-center py-6 ${subClass}`}>Sin pérdidas en el período.</p>
                )}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className={`p-5 border-b ${headClass}`}>
              <h2 className="font-bold text-lg">Tendencia por insumo</h2>
              <p className={`text-sm ${subClass}`}>
                Stock al cierre de cada día (reconstruido desde el inventario actual y movimientos)
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="form-control max-w-md flex-1 min-w-[200px]">
                  <span className={`label-text text-xs ${subClass}`}>Insumo</span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={insumoTendenciaId}
                    onChange={(e) => setInsumoTendenciaId(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {insumos.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nombre || it.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {loadingTendencia && (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md" />
                </div>
              )}
              {!loadingTendencia && tendencia?.error && (
                <p className="text-sm text-error">{tendencia.error}</p>
              )}
              {!loadingTendencia && tendencia && !tendencia.error && tendencia.dias?.length > 0 && (
                <>
                  <div className={`flex flex-wrap gap-4 text-sm ${subClass}`}>
                    <span>
                      Actual: <strong className={theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}>{tendencia.stockActual?.toLocaleString('es-CR')}</strong> {tendencia.unidad}
                    </span>
                    <span>
                      Stock inicio período (est.):{' '}
                      <strong className={theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}>
                        {tendencia.stockInicioRango?.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
                      </strong>
                    </span>
                  </div>
                  <TendenciaStockChart dias={tendencia.dias} unidad={tendencia.unidad} theme={theme} />
                  <div className="overflow-x-auto">
                    <table className="table table-xs mt-2">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th className="text-right">Ent. día</th>
                          <th className="text-right">Sal. día</th>
                          <th className="text-right">Stock cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tendencia.dias.map((d) => (
                          <tr key={d.fecha}>
                            <td>{d.fecha}</td>
                            <td className="text-right">{d.entradasDia?.toLocaleString('es-CR') ?? '—'}</td>
                            <td className="text-right">{d.salidasDia?.toLocaleString('es-CR') ?? '—'}</td>
                            <td className="text-right font-medium">
                              {d.stockFin != null ? Number(d.stockFin).toLocaleString('es-CR', { maximumFractionDigits: 2 }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {!loadingTendencia && insumoTendenciaId && tendencia && !tendencia.error && !tendencia.dias?.length && (
                <p className={subClass}>Sin datos en el rango.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
