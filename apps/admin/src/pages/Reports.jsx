import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChartBarIcon,
  CubeIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  UsersIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@shared/context/ThemeContext'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { utils as xlsxUtils, writeFileXLSX } from 'xlsx'
import {
  getCategorias,
  getReporteInventarioRango,
  getReporteInventarioTendenciaInsumo,
  getReporteTiemposCocinaRango,
  getInventarioItems,
  getVentasPorProductoRango,
  getCobrosPorUsuarioRango,
  getDetalleCobrosUsuarioRango,
  getReporteVentasPorPeriodo,
  toDateStrCR,
  RA005_MOTIVOS_PERDIDA,
  RA006_UMBRAL_LENTO_MINUTOS,
} from '@shared/firebase/firestore'

function moneyCRC(n) {
  const x = Number(n || 0)
  return `₡${Math.round(x).toLocaleString('es-CR')}`
}

function Toast({ toast, onClose }) {
  if (!toast) return null
  const type = toast.type || 'info'
  const base =
    type === 'error'
      ? 'alert-error'
      : type === 'warning'
        ? 'alert-warning'
        : type === 'success'
          ? 'alert-success'
          : 'alert-info'
  return (
    <div className="toast toast-top toast-end z-50">
      <div className={`alert ${base} shadow-lg max-w-sm`}>
        <span className="text-sm">{toast.message}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
    </div>
  )
}

function PlaceholderCard({ title, subtitle, theme }) {
  return (
    <div className={theme === 'dark' ? 'card bg-zinc-900 border border-zinc-700 shadow-lg p-5' : 'card bg-white border border-gray-200 shadow-lg p-5'}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={theme === 'dark' ? 'text-zinc-200 font-semibold' : 'text-gray-900 font-semibold'}>{title}</div>
          <div className={theme === 'dark' ? 'text-zinc-400 text-sm mt-1' : 'text-gray-600 text-sm mt-1'}>{subtitle}</div>
        </div>
        <span className="badge badge-ghost">Próximamente</span>
      </div>
    </div>
  )
}

function buildReportFilename(prefix, inicio, fin, ext) {
  const a = String(inicio || '').trim() || toDateStrCR(new Date())
  const b = String(fin || '').trim() || a
  return `${prefix}_${a}_${b}.${ext}`
}

function exportInventarioXlsx(reportInv) {
  const wb = xlsxUtils.book_new()
  const wsResumen = xlsxUtils.aoa_to_sheet([
    ['Reporte', 'Inventario'],
    ['Desde', reportInv.fechaInicio],
    ['Hasta', reportInv.fechaFin],
    [],
    ['Entradas (cantidad)', reportInv.totales.entradasCantidad],
    ['Entradas (costo)', reportInv.totales.entradasCosto],
    ['Salidas (cantidad)', reportInv.totales.salidasCantidad],
    ['Pérdidas (cantidad)', reportInv.totales.perdidasCantidad],
    ['Pérdidas (costo)', reportInv.totales.perdidasCosto],
    ['Stock bajo (count)', reportInv.stockBajo.length],
  ])
  xlsxUtils.book_append_sheet(wb, wsResumen, 'Resumen')

  const wsTop = xlsxUtils.json_to_sheet(
    (reportInv.topConsumo || []).map((r) => ({
      insumo: r.nombre,
      unidad: r.unidad,
      cantidad: r.cantidad,
      costoEstimado: Math.round(r.costoEstimado || 0),
    }))
  )
  xlsxUtils.book_append_sheet(wb, wsTop, 'TopConsumo')

  const wsStock = xlsxUtils.json_to_sheet(
    (reportInv.stockBajo || []).map((r) => ({
      insumo: r.nombre,
      unidad: r.unidad,
      actual: r.cantidad,
      minimo: r.minCantidad,
      deficit: r.deficit,
    }))
  )
  xlsxUtils.book_append_sheet(wb, wsStock, 'StockBajo')

  const wsPerdidas = xlsxUtils.json_to_sheet(
    (reportInv.perdidasDetalle || []).map((r) => ({
      insumo: r.nombre,
      motivo: r.motivo,
      cantidad: r.cantidad,
      unidad: r.unidad,
      costoEstimado: Math.round(r.costoEstimado || 0),
    }))
  )
  xlsxUtils.book_append_sheet(wb, wsPerdidas, 'Perdidas')

  writeFileXLSX(wb, buildReportFilename('Reporte_Inventario', reportInv.fechaInicio, reportInv.fechaFin, 'xlsx'))
}

function exportCocinaXlsx(reportCocina) {
  const wb = xlsxUtils.book_new()
  const wsResumen = xlsxUtils.aoa_to_sheet([
    ['Reporte', 'Cocina'],
    ['Desde', reportCocina.fechaInicio],
    ['Hasta', reportCocina.fechaFin],
    [],
    ['Muestras', reportCocina.totales?.muestras ?? 0],
    ['Promedio (min)', reportCocina.totales?.promedioMin ?? ''],
    ['Mediana (min)', reportCocina.totales?.medianaMin ?? ''],
    ['Pedidos lentos', reportCocina.totales?.lentosCount ?? 0],
    ['Umbral lento (min)', reportCocina.umbralLentoMinutos],
  ])
  xlsxUtils.book_append_sheet(wb, wsResumen, 'Resumen')

  const wsHora = xlsxUtils.json_to_sheet((reportCocina.porHora || []).map((r) => ({ hora: r.hora, cantidad: r.cantidad })))
  xlsxUtils.book_append_sheet(wb, wsHora, 'PorHora')

  const wsCat = xlsxUtils.json_to_sheet(
    (reportCocina.porCategoria || []).map((r) => ({
      categoria: r.categoria,
      promedioMin: r.promedioMin,
      pesoItems: r.muestrasPeso,
    }))
  )
  xlsxUtils.book_append_sheet(wb, wsCat, 'PorCategoria')

  const wsLentos = xlsxUtils.json_to_sheet(
    (reportCocina.lentos || []).map((r) => ({
      pedidoId: r.pedidoId,
      mesa: r.mesaEtiqueta,
      minutos: r.minutos,
      items: r.itemsResumen,
    }))
  )
  xlsxUtils.book_append_sheet(wb, wsLentos, 'PedidosLentos')

  writeFileXLSX(wb, buildReportFilename('Reporte_Cocina', reportCocina.fechaInicio, reportCocina.fechaFin, 'xlsx'))
}

function exportInventarioPdf(reportInv) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Ceviche del Rey — Reporte Inventario', 14, 16)
  doc.setFontSize(10)
  doc.text(`Período: ${reportInv.fechaInicio} a ${reportInv.fechaFin}`, 14, 22)

  autoTable(doc, {
    startY: 26,
    head: [['Indicador', 'Valor']],
    body: [
      ['Entradas (cantidad)', String(reportInv.totales.entradasCantidad ?? 0)],
      ['Entradas (costo)', moneyCRC(reportInv.totales.entradasCosto)],
      ['Salidas (cantidad)', String(reportInv.totales.salidasCantidad ?? 0)],
      ['Pérdidas (cantidad)', String(reportInv.totales.perdidasCantidad ?? 0)],
      ['Pérdidas (costo)', moneyCRC(reportInv.totales.perdidasCosto)],
      ['Stock bajo', String((reportInv.stockBajo || []).length)],
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Top consumo', 'Unidad', 'Cantidad', 'Costo est.']],
    body: (reportInv.topConsumo || []).slice(0, 15).map((r) => [
      r.nombre,
      r.unidad,
      String(r.cantidad ?? 0),
      moneyCRC(r.costoEstimado),
    ]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Stock bajo', 'Actual', 'Mín.', 'Déficit']],
    body: (reportInv.stockBajo || []).slice(0, 25).map((r) => [
      r.nombre,
      `${r.cantidad} ${r.unidad}`,
      String(r.minCantidad),
      String(r.deficit),
    ]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [245, 158, 11] },
  })

  doc.save(buildReportFilename('Reporte_Inventario', reportInv.fechaInicio, reportInv.fechaFin, 'pdf'))
}

function exportCocinaPdf(reportCocina) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Ceviche del Rey — Reporte Cocina', 14, 16)
  doc.setFontSize(10)
  doc.text(`Período: ${reportCocina.fechaInicio} a ${reportCocina.fechaFin}`, 14, 22)

  autoTable(doc, {
    startY: 26,
    head: [['Indicador', 'Valor']],
    body: [
      ['Muestras', String(reportCocina.totales?.muestras ?? 0)],
      ['Promedio (min)', String(reportCocina.totales?.promedioMin ?? '—')],
      ['Mediana (min)', String(reportCocina.totales?.medianaMin ?? '—')],
      ['Pedidos lentos', String(reportCocina.totales?.lentosCount ?? 0)],
      ['Umbral lento (min)', String(reportCocina.umbralLentoMinutos)],
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Hora', 'Pedidos listos']],
    body: (reportCocina.porHora || []).map((r) => [String(r.hora), String(r.cantidad)]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [217, 119, 6] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Categoría', 'Prom. min', 'Peso ítems']],
    body: (reportCocina.porCategoria || []).map((r) => [
      r.categoria,
      String(r.promedioMin),
      String(r.muestrasPeso),
    ]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Pedido', 'Mesa/origen', 'Min', 'Ítems']],
    body: (reportCocina.lentos || []).slice(0, 40).map((r) => [
      String(r.pedidoId || '').slice(0, 10) + '…',
      r.mesaEtiqueta,
      String(r.minutos),
      r.itemsResumen,
    ]),
    theme: 'striped',
    styles: { fontSize: 7 },
    headStyles: { fillColor: [245, 158, 11] },
  })

  doc.save(buildReportFilename('Reporte_Cocina', reportCocina.fechaInicio, reportCocina.fechaFin, 'pdf'))
}

function exportVentasProductoXlsx(rows, inicio, fin) {
  const wb = xlsxUtils.book_new()
  const ws = xlsxUtils.json_to_sheet(
    (rows || []).map((r) => ({
      producto: r.nombre,
      categoria: r.categoria || '',
      cantidad: r.cantidad,
      monto: r.monto,
    }))
  )
  xlsxUtils.book_append_sheet(wb, ws, 'VentasProducto')
  writeFileXLSX(wb, buildReportFilename('Reporte_VentasProducto', inicio, fin, 'xlsx'))
}

function exportVentasProductoPdf(rows, inicio, fin) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Ceviche del Rey — Ventas por producto', 14, 16)
  doc.setFontSize(10)
  doc.text(`Período: ${inicio} a ${fin}`, 14, 22)
  autoTable(doc, {
    startY: 26,
    head: [['Producto', 'Categoría', 'Cantidad', 'Monto']],
    body: (rows || []).slice(0, 40).map((r) => [r.nombre, r.categoria || '', String(r.cantidad), moneyCRC(r.monto)]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  })
  doc.save(buildReportFilename('Reporte_VentasProducto', inicio, fin, 'pdf'))
}

function exportCobrosUsuarioXlsx(rows, inicio, fin) {
  const wb = xlsxUtils.book_new()
  const ws = xlsxUtils.json_to_sheet(
    (rows || []).map((r) => ({
      usuario: r.nombre,
      usuarioUid: r.usuarioUid || '',
      operaciones: r.operaciones,
      montoTotal: Math.round(r.montoTotal || 0),
    }))
  )
  xlsxUtils.book_append_sheet(wb, ws, 'CobrosUsuario')
  writeFileXLSX(wb, buildReportFilename('Reporte_CobrosUsuario', inicio, fin, 'xlsx'))
}

function exportCobrosUsuarioPdf(rows, inicio, fin) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Ceviche del Rey — Cobros por usuario', 14, 16)
  doc.setFontSize(10)
  doc.text(`Período: ${inicio} a ${fin}`, 14, 22)
  autoTable(doc, {
    startY: 26,
    head: [['Usuario', 'Operaciones', 'Monto total']],
    body: (rows || []).slice(0, 60).map((r) => [r.nombre, String(r.operaciones), moneyCRC(r.montoTotal)]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  })
  doc.save(buildReportFilename('Reporte_CobrosUsuario', inicio, fin, 'pdf'))
}

function exportVentasPeriodoXlsx(data, inicio, fin) {
  const wb = xlsxUtils.book_new()
  const ws = xlsxUtils.json_to_sheet(
    (data?.series || []).map((r) => ({
      periodo: r.etiqueta,
      etiquetaCorta: r.etiquetaCorta || '',
      monto: r.monto,
    }))
  )
  xlsxUtils.book_append_sheet(wb, ws, 'VentasPeriodo')
  if (data?.totalesPorMetodo) {
    const wsMet = xlsxUtils.json_to_sheet(
      Object.entries(data.totalesPorMetodo).map(([metodo, monto]) => ({ metodo, monto }))
    )
    xlsxUtils.book_append_sheet(wb, wsMet, 'Metodos')
  }
  writeFileXLSX(wb, buildReportFilename('Reporte_VentasPeriodo', inicio, fin, 'xlsx'))
}

function exportVentasPeriodoPdf(data, inicio, fin) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Ceviche del Rey — Ventas por período', 14, 16)
  doc.setFontSize(10)
  doc.text(`Período: ${inicio} a ${fin}`, 14, 22)
  autoTable(doc, {
    startY: 26,
    head: [['Período', 'Monto']],
    body: (data?.series || []).map((r) => [r.etiquetaCorta || r.etiqueta, moneyCRC(r.monto)]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  })
  doc.save(buildReportFilename('Reporte_VentasPeriodo', inicio, fin, 'pdf'))
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

function AmountBars({ rows, valueKey = 'monto', labelKey = 'nombre', theme, maxBars = 18 }) {
  const data = (rows || []).slice(0, maxBars)
  const max = Math.max(1, ...data.map((r) => Number(r?.[valueKey] || 0)))
  return (
    <div className="flex items-end gap-1 sm:gap-2 min-h-[220px] px-2 pb-2 overflow-x-auto">
      {data.map((r, idx) => {
        const v = Number(r?.[valueKey] || 0)
        const pct = max > 0 ? (v / max) * 100 : 0
        const label = String(r?.[labelKey] || '').trim() || `#${idx + 1}`
        return (
          <div key={`${idx}-${label}`} className="flex flex-col items-center min-w-[52px] flex-1">
            <div className={`text-[10px] leading-tight ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              {moneyCRC(v)}
            </div>
            <div className="flex items-end h-40 w-full justify-center">
              <div
                className="w-full max-w-[18px] rounded-t bg-indigo-500/90"
                style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%` }}
                title={`${label} · ${moneyCRC(v)}`}
              />
            </div>
            <div className={`text-[10px] sm:text-xs mt-2 text-center leading-tight ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              {label.length > 10 ? `${label.slice(0, 10)}…` : label}
            </div>
            <div className={`h-1 w-full rounded ${theme === 'dark' ? 'bg-zinc-600' : 'bg-slate-200'} mt-1`} />
          </div>
        )
      })}
    </div>
  )
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

function CocinaPorHoraChart({ porHora, theme }) {
  const max = Math.max(1, ...(porHora || []).map((h) => h.cantidad || 0))
  const barMuted = theme === 'dark' ? 'bg-zinc-600' : 'bg-slate-200'
  return (
    <div className="flex items-end gap-0.5 sm:gap-1 min-h-[200px] px-1 pb-2 overflow-x-auto">
      {(porHora || []).map((h) => {
        const pct = max > 0 ? (h.cantidad / max) * 100 : 0
        return (
          <div key={h.hora} className="flex flex-col items-center min-w-[22px] flex-1">
            <div className={`text-[9px] leading-none mb-0.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              {h.cantidad > 0 ? h.cantidad : ''}
            </div>
            <div className="flex items-end h-36 w-full justify-center">
              <div
                className="w-full max-w-[18px] rounded-t bg-amber-500/90"
                style={{ height: `${Math.max(pct, h.cantidad > 0 ? 4 : 0)}%` }}
                title={`${String(h.hora).padStart(2, '0')}:00–${String(h.hora).padStart(2, '0')}:59 · ${h.cantidad} pedidos listos`}
              />
            </div>
            <div
              className={`text-[9px] sm:text-[10px] mt-1.5 text-center leading-none ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}
            >
              {h.hora}
            </div>
            <div className={`h-1 w-full rounded ${barMuted} mt-0.5`} />
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
  const [tab, setTab] = useState('resumen') // resumen | inventario | cocina | ventasProducto | cobrosUsuario | ventasPeriodo
  const [exportFormat, setExportFormat] = useState('csv') // csv | xlsx | pdf
  const [loading, setLoading] = useState(true)
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const [reportInv, setReportInv] = useState(null)
  const [reportCocina, setReportCocina] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [categoriaVentas, setCategoriaVentas] = useState('')
  const [ventasProductoRows, setVentasProductoRows] = useState([])
  const [cobrosRows, setCobrosRows] = useState([])
  const [expandedCobroUid, setExpandedCobroUid] = useState(null)
  const [detalleCobrosByUid, setDetalleCobrosByUid] = useState({})
  const [detalleCobrosLoadingUid, setDetalleCobrosLoadingUid] = useState(null)
  const [agrupacionPeriodo, setAgrupacionPeriodo] = useState('dia')
  const [desgloseMetodoPeriodo, setDesgloseMetodoPeriodo] = useState(false)
  const [ventasPeriodoData, setVentasPeriodoData] = useState(null)
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

  const showToast = useCallback((type, message) => {
    const msg = String(message || '').trim()
    if (!msg) return
    setToast({ type, message: msg })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [rInv, rCoc] = await Promise.allSettled([
        getReporteInventarioRango(inicio, fin),
        getReporteTiemposCocinaRango(inicio, fin),
      ])
      if (rInv.status === 'fulfilled') {
        setReportInv(rInv.value)
      } else {
        setReportInv(null)
        throw rInv.reason
      }
      if (rCoc.status === 'fulfilled') {
        setReportCocina(rCoc.value)
      } else {
        const ce = rCoc.reason
        setReportCocina({
          fechaInicio: inicio,
          fechaFin: fin,
          umbralLentoMinutos: RA006_UMBRAL_LENTO_MINUTOS,
          error: ce?.message || 'No se pudo cargar el reporte de cocina.',
          totales: { muestras: 0, promedioMin: null, medianaMin: null, lentosCount: 0 },
          porHora: Array.from({ length: 24 }, (_, h) => ({ hora: h, cantidad: 0 })),
          porCategoria: [],
          lentos: [],
        })
      }
    } catch (e) {
      setErr(e?.message || 'No se pudo cargar el reporte.')
      setReportInv(null)
      setReportCocina(null)
    } finally {
      setLoading(false)
    }
  }, [inicio, fin])

  const loadCategorias = useCallback(async () => {
    try {
      const list = await getCategorias()
      setCategorias((list || []).sort((a, b) => String(a).localeCompare(String(b), 'es')))
    } catch {
      setCategorias([])
    }
  }, [])

  const fetchVentasProducto = useCallback(async () => {
    setLoadingExtra(true)
    setErr('')
    try {
      const opt = categoriaVentas ? { categoria: String(categoriaVentas).toLowerCase() } : {}
      const rows = await getVentasPorProductoRango(inicio, fin, opt)
      setVentasProductoRows(rows || [])
    } catch (e) {
      setErr(e?.message || 'No se pudo cargar el reporte.')
      setVentasProductoRows([])
    } finally {
      setLoadingExtra(false)
    }
  }, [categoriaVentas, inicio, fin])

  const fetchCobros = useCallback(async () => {
    setLoadingExtra(true)
    setErr('')
    setExpandedCobroUid(null)
    setDetalleCobrosByUid({})
    try {
      const rows = await getCobrosPorUsuarioRango(inicio, fin)
      setCobrosRows(rows || [])
    } catch (e) {
      setErr(e?.message || 'No se pudo cargar el reporte.')
      setCobrosRows([])
    } finally {
      setLoadingExtra(false)
    }
  }, [inicio, fin])

  const fetchVentasPeriodo = useCallback(async () => {
    setLoadingExtra(true)
    setErr('')
    try {
      const data = await getReporteVentasPorPeriodo(inicio, fin, {
        agrupacion: agrupacionPeriodo,
        desgloseMetodo: desgloseMetodoPeriodo,
      })
      setVentasPeriodoData(data)
    } catch (e) {
      setErr(e?.message || 'No se pudo cargar el reporte.')
      setVentasPeriodoData(null)
    } finally {
      setLoadingExtra(false)
    }
  }, [agrupacionPeriodo, desgloseMetodoPeriodo, inicio, fin])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  useEffect(() => {
    if (tab === 'ventasProducto') fetchVentasProducto()
    else if (tab === 'cobrosUsuario') fetchCobros()
    else if (tab === 'ventasPeriodo') fetchVentasPeriodo()
  }, [tab, fetchVentasProducto, fetchCobros, fetchVentasPeriodo])

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
    if (tab === 'inventario') {
      if (!reportInv) return
      const rows = []
      rows.push(['Reporte inventario', reportInv.fechaInicio, 'a', reportInv.fechaFin].join(','))
      rows.push(['Top consumo', 'Insumo', 'Unidad', 'Cantidad', 'Costo est.'].join(','))
      reportInv.topConsumo.forEach((r) => {
        rows.push(['', r.nombre, r.unidad, r.cantidad, Math.round(r.costoEstimado || 0)].join(','))
      })
      rows.push(['Stock bajo', 'Nombre', 'Actual', 'Mínimo', 'Déficit'].join(','))
      reportInv.stockBajo.forEach((r) => {
        rows.push(['', r.nombre, r.cantidad, r.minCantidad, r.deficit].join(','))
      })
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildReportFilename('Reporte_Inventario', reportInv.fechaInicio, reportInv.fechaFin, 'csv')
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    if (!reportCocina) return
    const rows = []
    rows.push(['Reporte cocina', reportCocina.fechaInicio, 'a', reportCocina.fechaFin].join(','))
    rows.push(['Resumen', 'Muestras', reportCocina.totales?.muestras ?? '', 'Promedio min', reportCocina.totales?.promedioMin ?? '', 'Mediana min', reportCocina.totales?.medianaMin ?? ''].join(','))
    rows.push(['Pedidos lentos', 'PedidoId', 'Mesa', 'Minutos', 'Items'].join(','))
    ;(reportCocina.lentos || []).forEach((r) => {
      rows.push(['', r.pedidoId, r.mesaEtiqueta, r.minutos, `"${String(r.itemsResumen || '').replace(/"/g, '""')}"`].join(','))
    })
    rows.push(['Categoría', 'Promedio min', 'Peso ítems'].join(','))
    ;(reportCocina.porCategoria || []).forEach((r) => {
      rows.push(['', r.categoria, r.promedioMin, r.muestrasPeso].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildReportFilename('Reporte_Cocina', reportCocina.fechaInicio, reportCocina.fechaFin, 'csv')
    a.click()
    URL.revokeObjectURL(url)
  }, [tab, reportInv, reportCocina])

  const exportCurrent = useCallback(() => {
    const isEmpty =
      tab === 'inventario'
        ? !reportInv ||
          (Number(reportInv?.totales?.salidasCantidad || 0) === 0 &&
            Number(reportInv?.totales?.entradasCantidad || 0) === 0 &&
            (reportInv?.stockBajo?.length || 0) === 0)
        : tab === 'cocina'
          ? !reportCocina || Number(reportCocina?.totales?.muestras || 0) === 0
          : tab === 'ventasProducto'
            ? (ventasProductoRows?.length || 0) === 0
            : tab === 'cobrosUsuario'
              ? (cobrosRows?.length || 0) === 0
              : tab === 'ventasPeriodo'
                ? !(ventasPeriodoData?.series?.length > 0)
                : true

    if (isEmpty) {
      showToast('warning', 'No hay datos para exportar en este período.')
      return
    }

    if (exportFormat === 'csv') {
      exportCsv()
      return
    }
    if (exportFormat === 'xlsx') {
      if (tab === 'inventario') exportInventarioXlsx(reportInv)
      else if (tab === 'cocina') exportCocinaXlsx(reportCocina)
      else if (tab === 'ventasProducto') exportVentasProductoXlsx(ventasProductoRows, inicio, fin)
      else if (tab === 'cobrosUsuario') exportCobrosUsuarioXlsx(cobrosRows, inicio, fin)
      else if (tab === 'ventasPeriodo') exportVentasPeriodoXlsx(ventasPeriodoData, inicio, fin)
      return
    }
    if (exportFormat === 'pdf') {
      if (tab === 'inventario') exportInventarioPdf(reportInv)
      else if (tab === 'cocina') exportCocinaPdf(reportCocina)
      else if (tab === 'ventasProducto') exportVentasProductoPdf(ventasProductoRows, inicio, fin)
      else if (tab === 'cobrosUsuario') exportCobrosUsuarioPdf(cobrosRows, inicio, fin)
      else if (tab === 'ventasPeriodo') exportVentasPeriodoPdf(ventasPeriodoData, inicio, fin)
    }
  }, [exportCsv, exportFormat, cobrosRows, fin, inicio, reportCocina, reportInv, showToast, tab, ventasPeriodoData, ventasProductoRows])

  const top15 = useMemo(() => (reportInv?.topConsumo ? reportInv.topConsumo.slice(0, 15) : []), [reportInv])

  const maxBarConsumo = useMemo(() => {
    if (!top15.length) return 1
    return Math.max(...top15.map((r) => r.cantidad), 1)
  }, [top15])

  const serieSemanal = useMemo(() => aggregateSerieByWeekCR(reportInv?.serieDiaria || []), [reportInv])
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
      <Toast toast={toast} onClose={() => setToast(null)} />
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
          <select
            className="select select-bordered select-sm"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            disabled={loading}
            title="Formato de exportación"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLS</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            className="btn btn-outline btn-sm gap-1"
            onClick={exportCurrent}
            disabled={((tab === 'inventario' ? !reportInv : tab === 'cocina' ? !reportCocina : false)) || loading}
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {err && (
        <div className="alert alert-error text-sm">
          <span>{err}</span>
        </div>
      )}

      {loading && !reportInv && (
        <div className={`flex justify-center py-16 ${subClass}`}>
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {reportInv && (
        <>
          <div
            role="tablist"
            className={`tabs tabs-boxed w-full ${theme === 'dark' ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-gray-100 border border-gray-200'}`}
          >
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'resumen' ? 'tab-active' : ''}`}
              onClick={() => setTab('resumen')}
            >
              <ChartBarIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Resumen
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'inventario' ? 'tab-active' : ''}`}
              onClick={() => setTab('inventario')}
            >
              <CubeIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Inventario
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'cocina' ? 'tab-active' : ''}`}
              onClick={() => setTab('cocina')}
            >
              <ClockIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Cocina
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'ventasProducto' ? 'tab-active' : ''}`}
              onClick={() => setTab('ventasProducto')}
            >
              <ChartBarIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Ventas x producto
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'cobrosUsuario' ? 'tab-active' : ''}`}
              onClick={() => setTab('cobrosUsuario')}
            >
              <UserIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Cobros x usuario
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === 'ventasPeriodo' ? 'tab-active' : ''}`}
              onClick={() => setTab('ventasPeriodo')}
            >
              <ChartBarIcon className="w-4 h-4 inline-block mr-1 opacity-80" />
              Ventas x período
            </button>
          </div>

          {tab === 'resumen' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Stock bajo (inventario)</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportInv.stockBajo.length}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>Insumos bajo mínimo</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowTrendingDownIcon className="w-5 h-5 text-amber-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Pérdidas estim. (inventario)</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {moneyCRC(reportInv.totales.perdidasCosto)}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>{reportInv.totales.perdidasCantidad.toLocaleString('es-CR')} u.</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-5 h-5 text-sky-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Promedio cocina</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina?.totales?.promedioMin != null ? `${reportCocina.totales.promedioMin} min` : '—'}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>Muestras: {reportCocina?.totales?.muestras ?? 0}</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Pedidos lentos (cocina)</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina?.totales?.lentosCount ?? 0}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>{`> ${reportCocina?.umbralLentoMinutos ?? RA006_UMBRAL_LENTO_MINUTOS} min`}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TagIcon className="w-5 h-5 text-indigo-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Ventas por producto</span>
                  </div>
                  <p className={`text-xs mt-1 ${subClass}`}>Abrí la pestaña para ver ranking y filtros por categoría.</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <UsersIcon className="w-5 h-5 text-fuchsia-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Cobros por usuario</span>
                  </div>
                  <p className={`text-xs mt-1 ${subClass}`}>Totales por cajero y detalle expandible.</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <PresentationChartLineIcon className="w-5 h-5 text-cyan-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Ventas por período</span>
                  </div>
                  <p className={`text-xs mt-1 ${subClass}`}>Agrupación por día/semana/mes y desglose por método.</p>
                </div>
              </div>
            </>
          )}

          {tab === 'inventario' && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                <span className={`text-sm font-medium ${subClass}`}>Entradas (cantidad)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {reportInv.totales.entradasCantidad.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>{moneyCRC(reportInv.totales.entradasCosto)} costo registrado</p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <CubeIcon className="w-5 h-5 text-rose-500" />
                <span className={`text-sm font-medium ${subClass}`}>Salidas (cantidad)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {reportInv.totales.salidasCantidad.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>En el período seleccionado</p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowTrendingDownIcon className="w-5 h-5 text-amber-500" />
                <span className={`text-sm font-medium ${subClass}`}>Pérdidas (estim.)</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {moneyCRC(reportInv.totales.perdidasCosto)}
              </p>
              <p className={`text-xs mt-1 ${subClass}`}>
                {reportInv.totales.perdidasCantidad.toLocaleString('es-CR')} u. — merma, desperdicio, vencimiento
              </p>
            </div>
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                <span className={`text-sm font-medium ${subClass}`}>Stock bajo</span>
              </div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                {reportInv.stockBajo.length}
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
                  const row = reportInv.perdidasPorMotivo[m] || { cantidad: 0, costo: 0 }
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
                    {reportInv.stockBajo.map((r) => (
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
                {!reportInv.stockBajo.length && (
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
                    {reportInv.perdidasDetalle.slice(0, 40).map((r) => (
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
                {reportInv.perdidasDetalle.length > 40 && (
                  <p className={`text-xs mt-2 ${subClass}`}>Mostrando 40 de {reportInv.perdidasDetalle.length} registros.</p>
                )}
                {!reportInv.perdidasDetalle.length && (
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

          {tab === 'cocina' && reportCocina && (
            <>
              {reportCocina.error && (
                <div className="alert alert-warning text-sm mb-4">
                  <span>{reportCocina.error}</span>
                </div>
              )}
              <p className={`text-sm ${subClass} mb-2`}>
                Preparación: desde inicio del pedido (o startedAt) hasta listoAt. Pedidos lentos: más de{' '}
                {reportCocina.umbralLentoMinutos} min.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-5 h-5 text-sky-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Promedio</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina.totales.promedioMin != null ? `${reportCocina.totales.promedioMin} min` : '—'}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>Muestras: {reportCocina.totales.muestras}</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ChartBarIcon className="w-5 h-5 text-violet-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Mediana</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina.totales.medianaMin != null ? `${reportCocina.totales.medianaMin} min` : '—'}
                  </p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Pedidos lentos</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina.totales.lentosCount}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>{`> ${reportCocina.umbralLentoMinutos} min`}</p>
                </div>
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                    <span className={`text-sm font-medium ${subClass}`}>Muestras válidas</span>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>
                    {reportCocina.totales.muestras}
                  </p>
                  <p className={`text-xs mt-1 ${subClass}`}>Con listoAt en el rango</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardClass}>
                  <div className={`p-5 border-b ${headClass}`}>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-amber-500" />
                      Pedidos listos por hora
                    </h2>
                    <p className={`text-sm ${subClass}`}>Hora en que se marcó listo (Costa Rica). Altura = cantidad de pedidos.</p>
                  </div>
                  <div className="p-4">
                    <CocinaPorHoraChart porHora={reportCocina.porHora} theme={theme} />
                  </div>
                </div>

                <div className={cardClass}>
                  <div className={`p-5 border-b ${headClass}`}>
                    <h2 className="font-bold text-lg">Tiempo promedio por categoría</h2>
                    <p className={`text-sm ${subClass}`}>Ponderado por cantidad de ítems en el pedido</p>
                  </div>
                  <div className="overflow-x-auto p-4 max-h-72 overflow-y-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th className="text-right">Prom. min</th>
                          <th className="text-right">Peso ítems</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportCocina.porCategoria || []).map((r) => (
                          <tr key={r.categoria}>
                            <td className="font-medium">{r.categoria}</td>
                            <td className="text-right">{r.promedioMin.toLocaleString('es-CR')}</td>
                            <td className="text-right">{r.muestrasPeso.toLocaleString('es-CR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!reportCocina.porCategoria?.length && (
                      <p className={`text-center py-6 ${subClass}`}>Sin datos de categoría en el período.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className={`p-5 border-b ${headClass}`}>
                  <h2 className="font-bold text-lg">Pedidos lentos</h2>
                  <p className={`text-sm ${subClass}`}>
                    Detalle de pedidos con tiempo de preparación mayor a {reportCocina.umbralLentoMinutos} minutos
                  </p>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Mesa / origen</th>
                        <th className="text-right">Minutos</th>
                        <th>Ítems (resumen)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportCocina.lentos || []).map((r) => (
                        <tr key={r.pedidoId}>
                          <td className="font-mono text-xs">{r.pedidoId.slice(0, 10)}…</td>
                          <td>{r.mesaEtiqueta}</td>
                          <td className="text-right font-medium text-amber-600 dark:text-amber-400">{r.minutos}</td>
                          <td className="max-w-xs truncate text-sm" title={r.itemsResumen}>
                            {r.itemsResumen}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!reportCocina.lentos?.length && (
                    <p className={`text-center py-8 ${subClass}`}>Ningún pedido superó el umbral en este período.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'ventasProducto' && (
            <div className="space-y-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className={`font-bold text-lg ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>Ventas por producto</h2>
                    <p className={`text-sm ${subClass}`}>Ranking por monto en el rango seleccionado</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="form-control">
                      <span className={`label-text text-xs ${subClass}`}>Categoría</span>
                      <select
                        className="select select-bordered select-sm"
                        value={categoriaVentas}
                        onChange={(e) => setCategoriaVentas(e.target.value)}
                        disabled={loadingExtra}
                      >
                        <option value="">Todas</option>
                        {categorias.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={fetchVentasProducto} disabled={loadingExtra}>
                      <ArrowPathIcon className={`w-4 h-4 ${loadingExtra ? 'animate-spin' : ''}`} /> Recargar
                    </button>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className={`p-5 border-b ${headClass}`}>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-indigo-500" />
                    Top productos (monto)
                  </h3>
                  <p className={`text-sm ${subClass}`}>Barras: monto por producto (top 18)</p>
                </div>
                <div className="p-4">
                  {loadingExtra ? (
                    <div className={`flex justify-center py-10 ${subClass}`}>
                      <span className="loading loading-spinner loading-md" />
                    </div>
                  ) : ventasProductoRows.length === 0 ? (
                    <p className={`text-center py-10 ${subClass}`}>No hay ventas en este período.</p>
                  ) : (
                    <AmountBars rows={ventasProductoRows} valueKey="monto" labelKey="nombre" theme={theme} />
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <div className={`p-5 border-b ${headClass}`}>
                  <h3 className="font-bold text-lg">Detalle</h3>
                  <p className={`text-sm ${subClass}`}>Ordenado por monto</p>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th className="text-right">Cantidad</th>
                        <th className="text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasProductoRows.slice(0, 60).map((r) => (
                        <tr key={r.productoId || r.nombre}>
                          <td className="font-medium">{r.nombre}</td>
                          <td>{r.categoria || '—'}</td>
                          <td className="text-right">{Number(r.cantidad || 0).toLocaleString('es-CR')}</td>
                          <td className="text-right">{moneyCRC(r.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ventasProductoRows.length > 60 && (
                    <p className={`text-xs mt-2 ${subClass}`}>Mostrando 60 de {ventasProductoRows.length} productos.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'cobrosUsuario' && (
            <div className="space-y-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={`font-bold text-lg ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>Cobros por usuario</h2>
                    <p className={`text-sm ${subClass}`}>Totales por cajero y detalle expandible</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={fetchCobros} disabled={loadingExtra}>
                    <ArrowPathIcon className={`w-4 h-4 ${loadingExtra ? 'animate-spin' : ''}`} /> Recargar
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <div className={`p-5 border-b ${headClass}`}>
                  <h3 className="font-bold text-lg">Resumen</h3>
                </div>
                <div className="overflow-x-auto p-4">
                  {loadingExtra ? (
                    <div className={`flex justify-center py-10 ${subClass}`}>
                      <span className="loading loading-spinner loading-md" />
                    </div>
                  ) : cobrosRows.length === 0 ? (
                    <p className={`text-center py-10 ${subClass}`}>No hay cobros en este período.</p>
                  ) : (
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th className="text-right">Operaciones</th>
                          <th className="text-right">Monto total</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {cobrosRows.map((r) => {
                          const uid = r.usuarioUid || '__sin_uid__'
                          const expanded = expandedCobroUid === uid
                          return (
                            <Fragment key={uid}>
                              <tr className={theme === 'dark' ? 'hover:bg-zinc-800/80' : ''}>
                                <td className="font-medium">{r.nombre}</td>
                                <td className="text-right">{Number(r.operaciones || 0).toLocaleString('es-CR')}</td>
                                <td className="text-right">{moneyCRC(r.montoTotal)}</td>
                                <td className="text-right">
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={async () => {
                                      if (!r.usuarioUid) return
                                      const next = expanded ? null : uid
                                      setExpandedCobroUid(next)
                                      if (!next) return
                                      if (detalleCobrosByUid[uid]) return
                                      try {
                                        setDetalleCobrosLoadingUid(uid)
                                        const det = await getDetalleCobrosUsuarioRango(r.usuarioUid, inicio, fin)
                                        setDetalleCobrosByUid((prev) => ({ ...prev, [uid]: det || [] }))
                                      } catch (e) {
                                        showToast('error', e?.message || 'No se pudo cargar el detalle.')
                                      } finally {
                                        setDetalleCobrosLoadingUid(null)
                                      }
                                    }}
                                    disabled={!r.usuarioUid}
                                    title={r.usuarioUid ? 'Ver detalle' : 'Sin uid'}
                                  >
                                    {expanded ? 'Ocultar' : 'Detalle'}
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr>
                                  <td colSpan={4} className={theme === 'dark' ? 'bg-zinc-900/40' : 'bg-gray-50/70'}>
                                    {detalleCobrosLoadingUid === uid ? (
                                      <div className="flex items-center gap-2 py-4">
                                        <span className="loading loading-spinner loading-sm" />
                                        <span className={subClass}>Cargando detalle…</span>
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto py-2">
                                        <table className="table table-xs">
                                          <thead>
                                            <tr>
                                              <th>Fecha</th>
                                              <th>Método</th>
                                              <th className="text-right">Monto</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(detalleCobrosByUid[uid] || []).slice(0, 80).map((d, idx) => (
                                              <tr key={idx}>
                                                <td>{d.fecha}</td>
                                                <td>{d.metodo || '—'}</td>
                                                <td className="text-right">{moneyCRC(d.monto)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'ventasPeriodo' && (
            <div className="space-y-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className={`font-bold text-lg ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>Ventas por período</h2>
                    <p className={`text-sm ${subClass}`}>Agrupa y muestra tendencia del monto</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="form-control">
                      <span className={`label-text text-xs ${subClass}`}>Agrupar</span>
                      <select
                        className="select select-bordered select-sm"
                        value={agrupacionPeriodo}
                        onChange={(e) => setAgrupacionPeriodo(e.target.value)}
                        disabled={loadingExtra}
                      >
                        <option value="dia">Día</option>
                        <option value="semana">Semana</option>
                        <option value="mes">Mes</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={desgloseMetodoPeriodo}
                        onChange={(e) => setDesgloseMetodoPeriodo(e.target.checked)}
                        disabled={loadingExtra}
                      />
                      <span className={subClass}>Métodos</span>
                    </label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={fetchVentasPeriodo} disabled={loadingExtra}>
                      <ArrowPathIcon className={`w-4 h-4 ${loadingExtra ? 'animate-spin' : ''}`} /> Recargar
                    </button>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className={`p-5 border-b ${headClass}`}>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <PresentationChartLineIcon className="w-5 h-5 text-cyan-500" />
                    Serie de ventas
                  </h3>
                  <p className={`text-sm ${subClass}`}>Barras: monto por período</p>
                </div>
                <div className="p-4">
                  {loadingExtra ? (
                    <div className={`flex justify-center py-10 ${subClass}`}>
                      <span className="loading loading-spinner loading-md" />
                    </div>
                  ) : !(ventasPeriodoData?.series?.length > 0) ? (
                    <p className={`text-center py-10 ${subClass}`}>No hay ventas en este período.</p>
                  ) : (
                    <AmountBars rows={ventasPeriodoData.series.map((s) => ({ ...s, nombre: s.etiquetaCorta || s.etiqueta, monto: s.monto }))} valueKey="monto" labelKey="nombre" theme={theme} maxBars={24} />
                  )}
                </div>
              </div>

              {ventasPeriodoData?.totalesPorMetodo && (
                <div className={cardClass}>
                  <div className={`p-5 border-b ${headClass}`}>
                    <h3 className="font-bold text-lg">Totales por método</h3>
                  </div>
                  <div className="overflow-x-auto p-4">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Método</th>
                          <th className="text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(ventasPeriodoData.totalesPorMetodo).map(([k, v]) => (
                          <tr key={k}>
                            <td className="font-medium">{k}</td>
                            <td className="text-right">{moneyCRC(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
