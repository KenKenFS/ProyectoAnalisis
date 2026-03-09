import { useEffect, useState } from 'react'
import {
  CurrencyDollarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  getResumenCierreCajaPreview,
  createCierreCajaDiario,
  getCierresCajaByRange,
  reabrirCierreCaja,
} from '@shared/firebase/firestore'

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function subDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() - days)
  return toDateStr(d)
}

function formatCRC(amount) {
  return `₡${Number(amount || 0).toLocaleString()}`
}

export default function CierresCajaPage() {
  const { user } = useAuth()
  const today = toDateStr(new Date())

  const [cierreDate, setCierreDate] = useState(today)
  const [preview, setPreview] = useState(null)
  const [cierreDelDia, setCierreDelDia] = useState(null)
  const [historial, setHistorial] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)

  const [form, setForm] = useState({
    totalEfectivo: '',
    totalDigital: '',
    observaciones: '',
    motivoDiscrepancia: '',
    motivoReapertura: '',
  })

  useEffect(() => {
    loadData()
  }, [cierreDate])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [p, cierreDia, historialData] = await Promise.all([
        getResumenCierreCajaPreview(cierreDate),
        getCierresCajaByRange(cierreDate, cierreDate),
        getCierresCajaByRange(subDays(today, 45), today),
      ])
      setPreview(p)
      setCierreDelDia((cierreDia || []).find(c => String(c.estado || '').toLowerCase() === 'cerrado') || null)
      setHistorial(historialData || [])
    } catch (err) {
      setError(err.message)
      setPreview(null)
      setCierreDelDia(null)
      setHistorial([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseCaja(e) {
    e.preventDefault()
    if (!preview) return
    setError('')
    setClosing(true)
    try {
      await createCierreCajaDiario({
        fecha: cierreDate,
        totalEfectivo: Number(form.totalEfectivo || 0),
        totalDigital: Number(form.totalDigital || 0),
        observaciones: form.observaciones,
        motivoDiscrepancia: form.motivoDiscrepancia,
        usuarioUid: user?.uid || null,
      })
      setForm(prev => ({ ...prev, observaciones: '', motivoDiscrepancia: '' }))
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setClosing(false)
    }
  }

  async function handleReopenCaja() {
    if (!cierreDelDia?.id) return
    const motivo = String(form.motivoReapertura || '').trim()
    if (!motivo) {
      setError('Debe indicar motivo para reabrir.')
      return
    }
    setError('')
    setReopening(true)
    try {
      await reabrirCierreCaja({
        cierreId: cierreDelDia.id,
        motivoReapertura: motivo,
        usuarioUid: user?.uid || null,
      })
      setForm(prev => ({ ...prev, motivoReapertura: '' }))
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setReopening(false)
    }
  }

  const totalReportado = Number(form.totalEfectivo || 0) + Number(form.totalDigital || 0)
  const discrepancia = totalReportado - Number(preview?.balanceEsperado || 0)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CurrencyDollarIcon className="w-8 h-8 text-cyan-600" />
            Cierres de Caja
          </h1>
          <p className="text-gray-600 text-sm">Cierre diario con validación de discrepancias y historial</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={cierreDate}
            onChange={e => setCierreDate(e.target.value)}
            className="input input-bordered input-sm"
          />
          <button onClick={loadData} className="btn btn-outline btn-sm gap-2" disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando vista previa...</p>
        ) : preview ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-xs text-green-700">Ventas POS</p>
                <p className="font-bold text-green-700">{formatCRC(preview.ventasPosTotal)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-emerald-700">Ventas manuales</p>
                <p className="font-bold text-emerald-700">{formatCRC(preview.ventasManualTotal)}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-700">Gastos</p>
                <p className="font-bold text-red-600">{formatCRC(preview.gastosTotal)}</p>
              </div>
              <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3">
                <p className="text-xs text-cyan-700">Balance esperado</p>
                <p className="font-bold text-cyan-700">{formatCRC(preview.balanceEsperado)}</p>
              </div>
            </div>

            {cierreDelDia ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                  <CheckCircleIcon className="w-4 h-4" />
                  Este día ya tiene un cierre registrado.
                </div>
                <p className="text-xs text-amber-700">
                  Reportado: {formatCRC(cierreDelDia.totalReportado)} | Esperado: {formatCRC(cierreDelDia.balanceEsperado)} | Discrepancia: {formatCRC(cierreDelDia.discrepancia)}
                </p>
                {cierreDate === today && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={form.motivoReapertura}
                      onChange={e => setForm(p => ({ ...p, motivoReapertura: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                      placeholder="Motivo de reapertura (obligatorio)"
                    />
                    <button onClick={handleReopenCaja} className="btn btn-warning btn-sm" disabled={reopening}>
                      {reopening ? 'Reabriendo...' : 'Reabrir cierre'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCloseCaja} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Total efectivo *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.totalEfectivo}
                      onChange={e => setForm(p => ({ ...p, totalEfectivo: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Total digital *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.totalDigital}
                      onChange={e => setForm(p => ({ ...p, totalDigital: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  Total reportado: <strong>{formatCRC(totalReportado)}</strong> | Discrepancia: <strong className={Math.abs(discrepancia) > 0 ? 'text-amber-700' : 'text-emerald-700'}>{formatCRC(discrepancia)}</strong>
                </div>
                {Math.abs(discrepancia) > 0 && (
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Motivo de discrepancia *</label>
                    <input
                      type="text"
                      value={form.motivoDiscrepancia}
                      onChange={e => setForm(p => ({ ...p, motivoDiscrepancia: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                      placeholder="Explique la diferencia detectada"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Observaciones</label>
                  <textarea
                    value={form.observaciones}
                    onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={2}
                    placeholder="Notas del cierre"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={closing}>
                    {closing ? 'Cerrando...' : 'Confirmar cierre diario'}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No hay datos para mostrar en esta fecha.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Historial de cierres (45 días)</h3>
        <div className="space-y-2 max-h-64 overflow-auto">
          {historial.length === 0 ? (
            <div className="text-sm text-gray-500">Sin cierres registrados.</div>
          ) : historial.map(c => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800">{c.fecha}</div>
                <span className={`px-2 py-0.5 rounded-md text-xs border ${String(c.estado) === 'reabierto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {c.estado}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Reportado: {formatCRC(c.totalReportado)} | Esperado: {formatCRC(c.balanceEsperado)} | Discrepancia: {formatCRC(c.discrepancia)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
