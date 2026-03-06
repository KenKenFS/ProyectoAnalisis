import { useEffect, useState } from 'react'
import {
  LockClosedIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'
import {
  getCuentasCerradas,
  getMesa,
  getCuentaComensales,
  getCuentaItems,
  puedeReabrirCuenta,
  reabrirCuenta,
  LIMITE_REAPERTURA_MS,
} from '@shared/firebase/firestore'

function formatFecha(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('es-CR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function tiempoRelativo(timestamp) {
  if (!timestamp) return null
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias < 30) return `hace ${dias}d`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `hace ${meses} mes${meses > 1 ? 'es' : ''}`
  const anos = Math.floor(dias / 365)
  return `hace ${anos} año${anos > 1 ? 's' : ''}`
}

function cuentaLabel(index) {
  return `CTA-${String(index + 1).padStart(3, '0')}`
}

export default function CuentasCerradasPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState([])
  const [mesasMap, setMesasMap] = useState({})
  const [error, setError] = useState(null)

  const [selectedCuenta, setSelectedCuenta] = useState(null)
  const [comensales, setComensales] = useState([])
  const [items, setItems] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [modalCuenta, setModalCuenta] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [reabriendo, setReabriendo] = useState(false)
  const [errorModal, setErrorModal] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await getCuentasCerradas()
      setCuentas(list)
      const mesaIds = [...new Set(list.map(c => c.mesaId).filter(Boolean))]
      const map = {}
      for (const id of mesaIds) {
        const mesa = await getMesa(id)
        map[id] = mesa
      }
      setMesasMap(map)
    } catch (e) {
      setError(e?.message || 'Error al cargar cuentas cerradas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!selectedCuenta) {
      setComensales([])
      setItems([])
      return
    }
    let mounted = true
    setLoadingDetail(true)
    Promise.all([
      getCuentaComensales(selectedCuenta.id),
      getCuentaItems(selectedCuenta.id),
    ]).then(([c, i]) => {
      if (mounted) {
        setComensales(c)
        setItems(i)
      }
    }).finally(() => {
      if (mounted) setLoadingDetail(false)
    })
    return () => { mounted = false }
  }, [selectedCuenta?.id])

  function selectCuenta(cuenta) {
    setSelectedCuenta(cuenta)
  }

  function openModal(cuenta) {
    setModalCuenta(cuenta)
    setMotivo('')
    setErrorModal(null)
    const val = puedeReabrirCuenta(cuenta)
    if (!val.permitido) setErrorModal(val.mensaje)
  }

  function closeModal() {
    setModalCuenta(null)
    setMotivo('')
    setErrorModal(null)
  }

  async function confirmarReapertura() {
    if (!modalCuenta || !user?.uid) return
    const motivoTrim = motivo?.trim()
    if (!motivoTrim) {
      setErrorModal('Debe ingresar un motivo de reapertura.')
      return
    }

    setReabriendo(true)
    setErrorModal(null)
    try {
      const result = await reabrirCuenta({
        cuentaId: modalCuenta.id,
        usuarioIdSupervisor: user.uid,
        motivoReapertura: motivoTrim,
      })
      if (result.ok) {
        closeModal()
        setSelectedCuenta(null)
        await load()
      } else {
        setErrorModal(result.error || 'No se pudo reabrir la cuenta.')
      }
    } catch (e) {
      setErrorModal(e?.message || 'Error al reabrir la cuenta.')
    } finally {
      setReabriendo(false)
    }
  }

  const limiteMinutos = Math.floor(LIMITE_REAPERTURA_MS / 60000)
  const selectedMesa = selectedCuenta ? mesasMap[selectedCuenta.mesaId] : null
  const tiempoSelected = selectedCuenta ? tiempoRelativo(selectedCuenta.timestampCierre ?? selectedCuenta.closedAt) : null
  const puedeReabrir = selectedCuenta ? puedeReabrirCuenta(selectedCuenta).permitido : false
  const selectedIdx = selectedCuenta ? cuentas.findIndex(c => c.id === selectedCuenta.id) : -1

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <LockClosedIcon className="w-8 h-8 text-amber-600" />
            Cuentas cerradas (reapertura)
          </h1>
          <p className="text-gray-600 text-sm">
            Reabrir cuentas cerradas hace menos de {limiteMinutos} minutos. Solo supervisores.
          </p>
        </div>
        <button
          onClick={() => { setError(null); load(); }}
          className="btn btn-ghost gap-2"
          disabled={loading}
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card bg-white border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md"></span>
            <span className="text-gray-700">Cargando cuentas cerradas...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de cuentas cerradas (mismo estilo que Mesa compartida) */}
          <div className="card bg-white border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-gray-900">Cuentas cerradas</div>
              <span className="badge badge-ghost">{cuentas.length}</span>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {cuentas.length === 0 ? (
                <div className="text-sm text-gray-500">No hay cuentas cerradas recientes.</div>
              ) : (
                cuentas.map((cuenta, idx) => {
                  const mesa = mesasMap[cuenta.mesaId]
                  const tiempo = tiempoRelativo(cuenta.timestampCierre ?? cuenta.closedAt)
                  return (
                    <button
                      key={cuenta.id}
                      onClick={() => selectCuenta(cuenta)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedCuenta?.id === cuenta.id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">Mesa {mesa?.numero ?? '—'}</div>
                        <span className="text-xs text-gray-500">
                          {tiempo ?? 'cerrada'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {cuentaLabel(idx)}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Detalle cuenta (mismo layout que Mesa compartida) */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedCuenta ? (
              <div className="card bg-white border border-gray-200 p-6 text-gray-500">
                Selecciona una cuenta cerrada para ver el detalle y reabrir si aplica.
              </div>
            ) : (
              <>
                <div className="card bg-white border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="font-bold text-gray-900">Cuenta</div>
                    <div className="text-xs text-gray-500">{selectedIdx >= 0 ? cuentaLabel(selectedIdx) : ''}</div>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Estado cuenta</div>
                      <div className="font-bold text-gray-900">{selectedCuenta.estadoCuenta || 'cerrada'}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Comensales</div>
                      <div className="font-bold text-gray-900">
                        {loadingDetail ? '—' : comensales.length}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Ítems</div>
                      <div className="font-bold text-gray-900">{loadingDetail ? '—' : items.length}</div>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Cerrada {formatFecha(selectedCuenta.timestampCierre ?? selectedCuenta.closedAt)}
                      {tiempoSelected && (
                        <span className={puedeReabrir ? 'text-green-600' : 'text-red-600'}>
                          ({tiempoSelected})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openModal(selectedCuenta)}
                      disabled={!puedeReabrir}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                        puedeReabrir
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Reabrir cuenta
                    </button>
                    {!puedeReabrir && (
                      <p className="text-xs text-red-600 mt-2">
                        Fuera del tiempo permitido ({limiteMinutos} min). No se puede reabrir.
                      </p>
                    )}
                  </div>
                </div>

                {/* Comensales (solo lectura, mismo bloque visual que Mesa compartida) */}
                <div className="card bg-white border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-cyan-600" />
                    <div className="font-bold text-gray-900">Comensales</div>
                  </div>
                  <div className="p-3 space-y-2 max-h-[40vh] overflow-y-auto">
                    {loadingDetail ? (
                      <div className="text-sm text-gray-500">Cargando...</div>
                    ) : comensales.length === 0 ? (
                      <div className="text-sm text-gray-500">Sin comensales.</div>
                    ) : (
                      comensales.map((c, idx) => (
                        <div
                          key={c.id}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="font-semibold text-gray-900">{c.alias || `Comensal ${idx + 1}`}</div>
                          <div className="text-xs text-gray-500 mt-1">{c.estadoCliente || '—'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal reapertura */}
      {modalCuenta && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white p-4 flex items-center justify-between">
              <div className="font-bold text-lg">Reabrir cuenta</div>
              <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-700">
                {(() => { const i = cuentas.findIndex(c => c.id === modalCuenta.id); return i >= 0 ? cuentaLabel(i) : 'Cuenta'; })()}
                {' '}(Mesa {mesasMap[modalCuenta.mesaId]?.numero ?? '—'}).
              </p>
              <div>
                <label className="block font-semibold text-gray-800 mb-1">Motivo de reapertura *</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: Error de facturación, ajuste solicitado por el cliente..."
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[80px]"
                  rows={3}
                />
              </div>
              {errorModal && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {errorModal}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={reabriendo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarReapertura}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold disabled:opacity-50"
                  disabled={reabriendo || !motivo?.trim()}
                >
                  {reabriendo ? 'Reabriendo...' : 'Confirmar reapertura'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
