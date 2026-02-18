import { useEffect, useMemo, useState } from 'react'
import {
  TableCellsIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@shared/firebase/AuthContext'
import {
  getMesasConCuentaActivaOrThrow,
  getCuenta,
  getCuentaComensales,
  getCuentaItems,
  getCuentaUnassignedPendingItems,
  getProductos,
  assignCuentaItemToComensal,
  addCuentaItem,
  deleteCuentaItem,
  payPartialForComensal,
  cerrarCuentaReabierta,
} from '@shared/firebase/firestore'

function moneyCRC(value) {
  const n = Number(value || 0)
  return `₡${n.toLocaleString()}`
}

// Genera etiqueta secuencial a partir de posicion en lista: "CTA-001", "CTA-002", etc.
function cuentaLabel(index) {
  return `CTA-${String(index + 1).padStart(3, '0')}`
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

function ItemEstadoBadge({ estado }) {
  const cfg =
    estado === 'pagado'
      ? { cls: 'bg-green-100 text-green-700 border-green-200', text: 'Pagado' }
      : estado === 'pendiente'
        ? { cls: 'bg-amber-100 text-amber-800 border-amber-200', text: 'Pendiente' }
        : { cls: 'bg-gray-100 text-gray-700 border-gray-200', text: estado || 'N/A' }

  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.text}</span>
}

function ClienteEstadoBadge({ estado }) {
  const cfg =
    estado === 'liberado'
      ? { cls: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Liberado' }
      : { cls: 'bg-blue-100 text-blue-700 border-blue-200', text: 'Activo' }

  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.text}</span>
}

function PaymentModal({ open, onClose, onConfirm, loading, resumen, error }) {
  const [metodo, setMetodo] = useState('efectivo')

  useEffect(() => {
    if (open) setMetodo('efectivo')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex items-center justify-between">
          <div className="font-bold text-lg">Cierre parcial</div>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-white">
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{resumen?.comensalAlias || 'Comensal'}</div>
              <div className="text-sm text-gray-600">{resumen?.itemsCount || 0} ítems</div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold">{moneyCRC(resumen?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Impuesto</span>
                <span className="font-semibold">{moneyCRC(resumen?.impuesto || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-900 text-lg font-bold bg-cyan-50 border border-cyan-200 rounded p-2 mt-2">
                <span>Total</span>
                <span>{moneyCRC(resumen?.total || 0)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-800">Método de pago</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMetodo('efectivo')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-semibold transition ${
                  metodo === 'efectivo' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <BanknotesIcon className="w-5 h-5" />
                Efectivo
              </button>
              <button
                onClick={() => setMetodo('tarjeta')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-semibold transition ${
                  metodo === 'tarjeta' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <CreditCardIcon className="w-5 h-5" />
                Tarjeta
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 btn btn-ghost" disabled={loading}>
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(metodo)}
              className="flex-1 btn bg-cyan-600 hover:bg-cyan-700 text-white border-0"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar cobro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MesaCompartidaPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [mesas, setMesas] = useState([])
  const [selectedMesaId, setSelectedMesaId] = useState(null)

  const [cuenta, setCuenta] = useState(null)
  const [comensales, setComensales] = useState([])
  const [items, setItems] = useState([])
  const [selectedComensalId, setSelectedComensalId] = useState(null)

  const [unassignedPending, setUnassignedPending] = useState([])
  const [assigning, setAssigning] = useState(false)

  const [payOpen, setPayOpen] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState(null)

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [productos, setProductos] = useState([])
  const [addingProduct, setAddingProduct] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState(null)

  const [confirmCerrarOpen, setConfirmCerrarOpen] = useState(false)
  const [cerrarLoading, setCerrarLoading] = useState(false)

  // Solo cuentas que fueron reabiertas desde "Cuentas cerradas" tienen reopenedAt; las nuevas no.
  const cuentaReabierta = useMemo(
    () => !!(cuenta?.reopenedAt),
    [cuenta?.reopenedAt]
  )

  const mesasConCuenta = useMemo(() => {
    return [...mesas]
      .filter(m => !!m.cuentaActivaId)
      .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))
  }, [mesas])

  const selectedComensal = useMemo(
    () => comensales.find(c => c.id === selectedComensalId) || null,
    [comensales, selectedComensalId]
  )

  const itemsDelComensal = useMemo(() => {
    if (!selectedComensalId) return []
    return items.filter(i => i.comensalId === selectedComensalId)
  }, [items, selectedComensalId])

  const pendingItemsDelComensal = useMemo(
    () => itemsDelComensal.filter(i => i.estadoItem === 'pendiente'),
    [itemsDelComensal]
  )

  const resumenPago = useMemo(() => {
    const subtotal = Math.round(
      pendingItemsDelComensal.reduce((s, i) => s + Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1), 0)
    )
    const impuesto = Math.round(subtotal * 0.13)
    const total = subtotal + impuesto
    return {
      comensalAlias: selectedComensal?.alias || selectedComensalId,
      itemsCount: pendingItemsDelComensal.length,
      subtotal,
      impuesto,
      total,
    }
  }, [pendingItemsDelComensal, selectedComensal, selectedComensalId])

  async function loadMesas() {
    const list = await getMesasConCuentaActivaOrThrow()
    setMesas(list)
  }

  async function loadCuentaData(cuentaId) {
    const [c, cs, its, unassigned] = await Promise.all([
      getCuenta(cuentaId),
      getCuentaComensales(cuentaId),
      getCuentaItems(cuentaId),
      getCuentaUnassignedPendingItems(cuentaId),
    ])

    setCuenta(c)
    setComensales(cs)
    setItems(its)
    setUnassignedPending(unassigned)
  }

  async function selectMesa(mesa) {
    setError(null)
    setSelectedMesaId(mesa.id)
    setSelectedComensalId(null)
    setCuenta(null)
    setComensales([])
    setItems([])
    setUnassignedPending([])

    try {
      if (!mesa.cuentaActivaId) {
        setError('La mesa seleccionada no tiene una cuenta activa.')
        return
      }
      await loadCuentaData(mesa.cuentaActivaId)
    } catch (e) {
      setError(e?.message || 'Error al cargar la cuenta')
    }
  }

  async function refresh() {
    if (!selectedMesaId) return
    const mesa = mesas.find(m => m.id === selectedMesaId)
    if (!mesa?.cuentaActivaId) return
    setRefreshing(true)
    try {
      await loadCuentaData(mesa.cuentaActivaId)
    } finally {
      setRefreshing(false)
    }
  }

  async function assignItem(itemId) {
    if (!cuenta?.id) return
    if (!selectedComensalId) {
      setError('Selecciona primero un comensal para asignar ítems.')
      return
    }
    if (selectedComensal?.estadoCliente === 'liberado' && !cuentaReabierta) {
      setError('Este comensal está liberado y no se le pueden asignar nuevos ítems.')
      return
    }
    setAssigning(true)
    setError(null)
    try {
      await assignCuentaItemToComensal({
        cuentaId: cuenta.id,
        itemId,
        comensalId: selectedComensalId,
        assignedByUid: user?.uid || null,
      })
      await refresh()
    } catch (e) {
      setError(e?.message || 'Error al asignar ítem')
    } finally {
      setAssigning(false)
    }
  }

  async function openAddProduct() {
    setError(null)
    setAddProductOpen(true)
    if (productos.length === 0) {
      try {
        const list = await getProductos()
        setProductos(list)
      } catch (e) {
        setError(e?.message || 'Error al cargar productos')
      }
    }
  }

  async function addProductToComensal(productoId) {
    if (!cuenta?.id || !selectedComensalId) return
    if (selectedComensal?.estadoCliente === 'liberado' && !cuentaReabierta) {
      setError('Este comensal está liberado y no se le pueden agregar ítems.')
      return
    }
    setAddingProduct(true)
    setError(null)
    try {
      await addCuentaItem({
        cuentaId: cuenta.id,
        productoId,
        comensalId: selectedComensalId,
        createdByUid: user?.uid || null,
      })
      setAddProductOpen(false)
      await refresh()
    } catch (e) {
      if (e?.code === 'PRODUCT_NOT_FOUND') setError('Producto no encontrado.')
      else setError(e?.message || 'Error al agregar producto')
    } finally {
      setAddingProduct(false)
    }
  }

  async function removeItem(itemId) {
    if (!cuenta?.id) return
    setDeletingItemId(itemId)
    setError(null)
    try {
      await deleteCuentaItem({ cuentaId: cuenta.id, itemId })
      await refresh()
    } catch (e) {
      if (e?.code === 'ITEM_ALREADY_PAID') setError('No se puede eliminar un ítem ya pagado.')
      else setError(e?.message || 'Error al eliminar ítem')
    } finally {
      setDeletingItemId(null)
    }
  }

  async function startPay() {
    setPayError(null)
    setError(null)

    if (!cuenta?.id) return
    if (!selectedComensalId) {
      setError('Selecciona un comensal para hacer cierre parcial.')
      return
    }
    if (selectedComensal?.estadoCliente === 'liberado' && pendingItemsDelComensal.length === 0) {
      setError('Este comensal ya está liberado y no tiene ítems pendientes.')
      return
    }
    if (unassignedPending.length > 0) {
      setError('Hay ítems pendientes sin asignar. Asigna los ítems antes de cerrar parcialmente.')
      return
    }
    if (pendingItemsDelComensal.length === 0) {
      setError('El comensal no tiene ítems pendientes.')
      return
    }

    setPayOpen(true)
  }

  async function confirmPay(metodo) {
    if (!cuenta?.id || !selectedComensalId || !selectedMesaId) return

    setPayLoading(true)
    setPayError(null)
    try {
      const result = await payPartialForComensal({
        cuentaId: cuenta.id,
        mesaId: selectedMesaId,
        comensalId: selectedComensalId,
        metodo,
        cajeroUid: user?.uid || null,
        impuestoRate: 0.13,
      })
      setPayOpen(false)
      if (result.cuentaCerrada) {
        setSelectedMesaId(null)
        setSelectedComensalId(null)
        setCuenta(null)
        setComensales([])
        setItems([])
        setUnassignedPending([])
        await loadMesas()
      } else {
        await refresh()
      }
    } catch (e) {
      if (e?.code === 'UNASSIGNED_ITEMS') {
        setPayError('Hay ítems sin asignar. Asigna primero para poder cerrar parcialmente.')
      } else if (e?.code === 'NO_PENDING_ITEMS') {
        setPayError('El comensal no tiene ítems pendientes.')
      } else {
        setPayError(e?.message || 'Error al procesar el pago')
      }
    } finally {
      setPayLoading(false)
    }
  }

  async function confirmCerrarCuenta() {
    if (!cuenta?.id || !user?.uid) return
    setCerrarLoading(true)
    setError(null)
    try {
      const result = await cerrarCuentaReabierta({
        cuentaId: cuenta.id,
        cerradoPorUid: user.uid,
      })
      if (result.ok) {
        setConfirmCerrarOpen(false)
        setSelectedMesaId(null)
        setSelectedComensalId(null)
        setCuenta(null)
        setComensales([])
        setItems([])
        setUnassignedPending([])
        await loadMesas()
      } else {
        setError(result.error || 'No se pudo cerrar la cuenta.')
      }
    } catch (e) {
      setError(e?.message || 'Error al cerrar la cuenta.')
    } finally {
      setCerrarLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        await loadMesas()
      } catch (e) {
        if (mounted) setError(e?.message || 'Error al cargar mesas')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TableCellsIcon className="w-8 h-8 text-cyan-600" />
            Mesa compartida
          </h1>
          <p className="text-gray-600 text-sm">HU1: cierre parcial por comensal</p>
        </div>

        <button
          onClick={async () => {
            setRefreshing(true)
            setError(null)
            try {
              await loadMesas()
              await refresh()
            } catch (e) {
              setError(e?.message || 'Error al refrescar')
            } finally {
              setRefreshing(false)
            }
          }}
          className="btn btn-ghost gap-2"
          disabled={loading || refreshing}
        >
          <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card bg-white border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md"></span>
            <span className="text-gray-700">Cargando mesas...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de mesas con cuenta */}
          <div className="card bg-white border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-gray-900">Mesas con cuenta activa</div>
              <span className="badge badge-ghost">{mesasConCuenta.length}</span>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {mesasConCuenta.length === 0 ? (
                <div className="text-sm text-gray-500">No hay mesas con cuenta activa.</div>
              ) : (
                mesasConCuenta.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => selectMesa(m)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedMesaId === m.id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">Mesa {m.numero ?? m.id}</div>
                      <span className="text-xs text-gray-500">{m.estado}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cuentaLabel(idx)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detalle cuenta */}
          <div className="lg:col-span-2 space-y-4">
            {!cuenta ? (
              <div className="card bg-white border border-gray-200 p-6 text-gray-500">
                Selecciona una mesa para ver su cuenta compartida.
              </div>
            ) : (
              <>
                <div className="card bg-white border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="font-bold text-gray-900">Cuenta</div>
                    <div className="text-xs text-gray-500">
                      {cuentaLabel(mesasConCuenta.findIndex(m => m.cuentaActivaId === cuenta.id))}
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Estado cuenta</div>
                      <div className="font-bold text-gray-900">{cuenta.estadoCuenta || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Comensales</div>
                      <div className="font-bold text-gray-900">{comensales.length}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Ítems sin asignar (pendientes)</div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {unassignedPending.length}
                        {unassignedPending.length > 0 && <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />}
                      </div>
                    </div>
                  </div>

                  {cuentaReabierta && (
                    <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-amber-50/50">
                      <div className="flex items-center gap-2 text-amber-800">
                        <LockClosedIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Cuenta reabierta</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmCerrarOpen(true)}
                          className="btn border border-amber-600 text-amber-700 hover:bg-amber-100 gap-1"
                          disabled={cerrarLoading}
                        >
                          <LockClosedIcon className="w-4 h-4" />
                          Cerrar cuenta (sin más cambios)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comensales + items */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="card bg-white border border-gray-200">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                      <UsersIcon className="w-5 h-5 text-cyan-600" />
                      <div className="font-bold text-gray-900">Comensales</div>
                    </div>
                    <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto">
                      {comensales.map((c, idx) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedComensalId(c.id)}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            selectedComensalId === c.id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-gray-900">{c.alias || `Comensal ${idx + 1}`}</div>
                            <ClienteEstadoBadge estado={c.estadoCliente} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="card bg-white border border-gray-200">
                      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-gray-900">Ítems del comensal</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={openAddProduct}
                            className="btn btn-ghost border border-gray-300 hover:bg-gray-50 gap-1"
                            disabled={!selectedComensalId || (selectedComensal?.estadoCliente === 'liberado' && !cuentaReabierta)}
                            title={
                              selectedComensal?.estadoCliente === 'liberado' && !cuentaReabierta
                                ? 'Comensal liberado'
                                : cuentaReabierta
                                ? 'Agregar ítem (cuenta reabierta)'
                                : 'Agregar producto'
                            }
                          >
                            <PlusIcon className="w-4 h-4" />
                            {cuentaReabierta ? 'Agregar ítem' : 'Agregar producto'}
                          </button>
                          <button
                            onClick={startPay}
                            className="btn bg-cyan-600 hover:bg-cyan-700 text-white border-0"
                            disabled={
                              !selectedComensalId ||
                              payLoading ||
                              (selectedComensal?.estadoCliente === 'liberado' && pendingItemsDelComensal.length === 0)
                            }
                          >
                            Cierre parcial
                          </button>
                        </div>
                      </div>

                      {!selectedComensalId ? (
                        <div className="p-4 text-sm text-gray-500">Selecciona un comensal para ver sus ítems.</div>
                      ) : (
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="text-xs text-gray-500">Pendientes</div>
                              <div className="font-bold text-gray-900">{pendingItemsDelComensal.length}</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="text-xs text-gray-500">Subtotal pendiente</div>
                              <div className="font-bold text-gray-900">{moneyCRC(resumenPago.subtotal)}</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="text-xs text-gray-500">Total (con impuesto)</div>
                              <div className="font-bold text-gray-900">{moneyCRC(resumenPago.total)}</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {itemsDelComensal.length === 0 ? (
                              <div className="text-sm text-gray-500">Este comensal no tiene ítems asignados.</div>
                            ) : (
                              itemsDelComensal.map(i => (
                                <div key={i.id} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900 truncate">{i.nombreSnapshot || i.productoId || 'Item'}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-gray-900">{moneyCRC(Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1))}</div>
                                    <ItemEstadoBadge estado={i.estadoItem} />
                                    {i.estadoItem === 'pendiente' && (
                                      <button
                                        type="button"
                                        onClick={() => removeItem(i.id)}
                                        className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        disabled={deletingItemId === i.id}
                                        title="Eliminar ítem"
                                      >
                                        {deletingItemId === i.id ? (
                                          <span className="loading loading-spinner loading-xs" />
                                        ) : (
                                          <TrashIcon className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ítems sin asignar */}
                    <div className="card bg-white border border-gray-200">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          Ítems sin asignar
                          {unassignedPending.length === 0 ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{unassignedPending.length} pendientes</div>
                      </div>

                      <div className="p-4 space-y-2">
                        {unassignedPending.length === 0 ? (
                          <div className="text-sm text-gray-500">No hay ítems pendientes sin asignar.</div>
                        ) : (
                          unassignedPending.map(i => (
                            <div key={i.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{i.nombreSnapshot || i.productoId || 'Item'}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-gray-900">
                                  {moneyCRC(Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1))}
                                </div>
                                <button
                                  onClick={() => assignItem(i.id)}
                                  className="btn btn-sm bg-white border border-amber-300 hover:bg-amber-100"
                                  disabled={!selectedComensalId || assigning}
                                  title={!selectedComensalId ? 'Selecciona un comensal para asignar' : 'Asignar al comensal seleccionado'}
                                >
                                  {assigning ? 'Asignando...' : 'Asignar'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onConfirm={confirmPay}
        loading={payLoading}
        resumen={resumenPago}
        error={payError}
      />

      {/* Modal Agregar producto */}
      {addProductOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="font-bold text-gray-900">Agregar producto al comensal</div>
              <button
                type="button"
                onClick={() => setAddProductOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {productos.length === 0 ? (
                <div className="text-sm text-gray-500">Cargando productos...</div>
              ) : (
                <div className="space-y-2">
                  {productos.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToComensal(p.id)}
                      disabled={addingProduct}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 transition flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-gray-900">{p.nombre ?? p.name ?? p.id}</span>
                      <span className="text-sm font-semibold text-cyan-600">{moneyCRC(p.precioUnit ?? p.precio ?? 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {addingProduct && (
              <div className="p-2 border-t border-gray-200 text-center text-sm text-gray-500">
                Agregando...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar cerrar cuenta (reabierta) */}
      {confirmCerrarOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <LockClosedIcon className="w-6 h-6 text-amber-600" />
              <div className="font-bold text-gray-900">Cerrar cuenta</div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-700">
                ¿Cerrar la cuenta sin más cambios? La cuenta quedará cerrada y dejará de aparecer en Mesa compartida.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCerrarOpen(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={cerrarLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCerrarCuenta}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50"
                  disabled={cerrarLoading}
                >
                  {cerrarLoading ? 'Cerrando...' : 'Sí, cerrar cuenta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

