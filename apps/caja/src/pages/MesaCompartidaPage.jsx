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
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'
import { formatMesaFromDoc } from '@shared/utils/mesaDisplay'
import {
  getMesasConCuentaActivaOrThrow,
  getCuenta,
  getCuentaComensales,
  getCuentaItems,
  getCuentaUnassignedPendingItems,
  getProductos,
  assignCuentaItemToComensal,
  addCuentaItem,
  anularCuentaItem,
  revertirAnulacionCuentaItem,
  payPartialForComensal,
  getPromocionesActivasParaCobro,
  cerrarCuentaReabierta,
  cancelarCuenta,
} from '@shared/firebase/firestore'

function moneyCRC(value) {
  const n = Number(value || 0)
  return `₡${n.toLocaleString()}`
}

// Genera etiqueta secuencial a partir de posicion en lista: "CTA-001", "CTA-002", etc.
function cuentaLabel(index) {
  return `CTA-${String(index + 1).padStart(3, '0')}`
}

function normalizeComensalOrder(alias) {
  const text = String(alias || '').trim().toLowerCase()
  const match = text.match(/(\d+)\s*$/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[1]) || Number.MAX_SAFE_INTEGER
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
      : estado === 'anulado'
        ? { cls: 'bg-rose-100 text-rose-700 border-rose-200', text: 'Anulado' }
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

function PaymentModal({ open, onClose, onConfirm, loading, resumen, error, promociones = [] }) {
  const [metodo, setMetodo] = useState('efectivo')
  const [promoId, setPromoId] = useState('')
  const [promoMotivo, setPromoMotivo] = useState('')

  useEffect(() => {
    if (open) {
      setMetodo('efectivo')
      setPromoId('')
      setPromoMotivo('')
    }
  }, [open])

  if (!open) return null

  const selectedPromo = promociones.find(p => p.id === promoId) || null
  let descuento = 0
  if (selectedPromo) {
    const tipo = String(selectedPromo.tipoBeneficio || '').toLowerCase()
    const valor = Number(selectedPromo.valorBeneficio || 0)
    if (tipo === 'porcentaje') descuento = Math.round(Number(resumen?.subtotal || 0) * (valor / 100))
    if (tipo === 'monto_fijo') descuento = Math.round(valor)
    descuento = Math.max(0, Math.min(descuento, Number(resumen?.subtotal || 0)))
  }
  const subtotalConDescuento = Math.max(0, Number(resumen?.subtotal || 0) - descuento)
  const impuestoConDescuento = Math.round(subtotalConDescuento * 0.13)
  const totalConDescuento = subtotalConDescuento + impuestoConDescuento

  return (
    <ModalPortal overlayClassName="flex items-center justify-center">
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
              {selectedPromo && (
                <div className="flex justify-between text-green-700">
                  <span>Descuento ({selectedPromo.nombre})</span>
                  <span className="font-semibold">-{moneyCRC(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Impuesto</span>
                <span className="font-semibold">{moneyCRC(impuestoConDescuento)}</span>
              </div>
              <div className="flex justify-between text-gray-900 text-lg font-bold bg-cyan-50 border border-cyan-200 rounded p-2 mt-2">
                <span>Total</span>
                <span>{moneyCRC(totalConDescuento)}</span>
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

          <div className="space-y-2">
            <div className="font-semibold text-gray-800">Promoción (opcional)</div>
            <div className="flex gap-2">
              <select
                value={promoId}
                onChange={(e) => setPromoId(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Sin promoción</option>
                {promociones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipoBeneficio === 'porcentaje' ? `${p.valorBeneficio}%` : moneyCRC(p.valorBeneficio)})
                  </option>
                ))}
              </select>
              {!!promoId && (
                <button type="button" onClick={() => setPromoId('')} className="btn btn-ghost">
                  Quitar
                </button>
              )}
            </div>
            {selectedPromo && (
              <input
                type="text"
                value={promoMotivo}
                onChange={(e) => setPromoMotivo(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Motivo (opcional): cortesía por campaña, ajuste comercial, etc."
              />
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 btn btn-ghost" disabled={loading}>
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(metodo, promoId, promoMotivo)}
              className="flex-1 btn bg-cyan-600 hover:bg-cyan-700 text-white border-0"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar cobro'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function MesaCompartidaPage() {
  const { user, role, isAdmin, isCajero } = useAuth()

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
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategoria, setMenuCategoria] = useState('Todos')
  const [loadingMenuProductos, setLoadingMenuProductos] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState(null)
  const [anularTarget, setAnularTarget] = useState(null)
  const [anularMotivo, setAnularMotivo] = useState('')
  const [anularModalError, setAnularModalError] = useState(null)
  const [anulando, setAnulando] = useState(false)
  const [revertTarget, setRevertTarget] = useState(null)
  const [revertMotivo, setRevertMotivo] = useState('')
  const [revertModalError, setRevertModalError] = useState(null)
  const [revirtiendo, setRevirtiendo] = useState(false)

  const [confirmCerrarOpen, setConfirmCerrarOpen] = useState(false)
  const [cerrarLoading, setCerrarLoading] = useState(false)
  const [confirmCancelarOpen, setConfirmCancelarOpen] = useState(false)
  const [cancelarMotivo, setCancelarMotivo] = useState('')
  const [cancelarLoading, setCancelarLoading] = useState(false)
  const [promocionesActivas, setPromocionesActivas] = useState([])

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

  const selectedMesa = useMemo(
    () => mesas.find((m) => m.id === selectedMesaId) || null,
    [mesas, selectedMesaId]
  )

  const categoriasMenu = useMemo(() => {
    const unique = new Set(
      (productos || [])
        .filter((p) => p.disponible !== false)
        .map((p) => p.categoria || 'General')
    )
    return ['Todos', ...unique]
  }, [productos])

  const productosMenuFiltrados = useMemo(() => {
    const list = (productos || [])
      .filter((p) => p.disponible !== false)
      .map((p) => ({
        id: p.id,
        name: p.nombre ?? p.name ?? p.id,
        categoria: p.categoria || 'General',
        price: Number(p.precioUnit ?? p.precio ?? 0),
        desc: String(p.descripcion || '').trim(),
      }))
    const q = menuSearch.trim().toLowerCase()
    return list.filter((item) => {
      const okCat = menuCategoria === 'Todos' || item.categoria === menuCategoria
      const okSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
      return okCat && okSearch
    })
  }, [productos, menuCategoria, menuSearch])

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
  const canManageAnulacion = isAdmin || isCajero || ['admin', 'cajero'].includes(String(role || '').toLowerCase())

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

    const comensalesOrdenados = [...(cs || [])].sort((a, b) => {
      const nA = normalizeComensalOrder(a.alias)
      const nB = normalizeComensalOrder(b.alias)
      if (nA !== nB) return nA - nB
      return String(a.alias || '').localeCompare(String(b.alias || ''), 'es', { sensitivity: 'base' })
    })

    setCuenta(c)
    setComensales(comensalesOrdenados)
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
    setMenuSearch('')
    setMenuCategoria('Todos')
    setAddProductOpen(true)
    if (productos.length === 0) {
      setLoadingMenuProductos(true)
      try {
        const list = await getProductos()
        setProductos(list)
      } catch (e) {
        setError(e?.message || 'Error al cargar productos')
      } finally {
        setLoadingMenuProductos(false)
      }
    }
  }

  function closeAddProductModal() {
    setAddProductOpen(false)
    setError(null)
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
      closeAddProductModal()
      await refresh()
    } catch (e) {
      if (e?.code === 'PRODUCT_NOT_FOUND') setError('Producto no encontrado.')
      else setError(e?.message || 'Error al agregar producto')
    } finally {
      setAddingProduct(false)
    }
  }

  async function confirmAnularItem() {
    if (!cuenta?.id || !anularTarget?.id) return
    const motivoTrim = String(anularMotivo || '').trim()
    if (!motivoTrim) {
      setAnularModalError('Debe indicar un motivo de anulación.')
      return
    }
    setAnulando(true)
    setDeletingItemId(anularTarget.id)
    setAnularModalError(null)
    setError(null)
    try {
      await anularCuentaItem({
        cuentaId: cuenta.id,
        itemId: anularTarget.id,
        motivo: motivoTrim,
        usuarioId: user?.uid || null,
        rolUsuario: role || null,
      })
      setAnularTarget(null)
      setAnularMotivo('')
      await refresh()
    } catch (e) {
      if (e?.code === 'MOTIVO_REQUIRED') setAnularModalError('Debe indicar un motivo de anulación.')
      else if (e?.code === 'PERMISSION_DENIED') setAnularModalError('No tienes permisos para anular ítems.')
      else if (e?.code === 'ITEM_ALREADY_PAID') setAnularModalError('No se puede anular un ítem ya pagado.')
      else setAnularModalError(e?.message || 'Error al anular ítem')
    } finally {
      setAnulando(false)
      setDeletingItemId(null)
    }
  }

  async function confirmRevertirItem() {
    if (!cuenta?.id || !revertTarget?.id) return
    const motivoTrim = String(revertMotivo || '').trim()
    if (!motivoTrim) {
      setRevertModalError('Debe indicar un motivo para revertir.')
      return
    }
    setRevirtiendo(true)
    setDeletingItemId(revertTarget.id)
    setRevertModalError(null)
    setError(null)
    try {
      await revertirAnulacionCuentaItem({
        cuentaId: cuenta.id,
        itemId: revertTarget.id,
        motivo: motivoTrim,
        usuarioId: user?.uid || null,
        rolUsuario: role || null,
      })
      setRevertTarget(null)
      setRevertMotivo('')
      await refresh()
    } catch (e) {
      if (e?.code === 'MOTIVO_REQUIRED') setRevertModalError('Debe indicar un motivo para revertir.')
      else if (e?.code === 'PERMISSION_DENIED') setRevertModalError('No tienes permisos para revertir anulación.')
      else setRevertModalError(e?.message || 'Error al revertir anulación')
    } finally {
      setRevirtiendo(false)
      setDeletingItemId(null)
    }
  }

  async function removeItem(itemId) {
    if (!cuenta?.id) return
    const item = items.find(i => i.id === itemId)
    if (!item) return
    if (!canManageAnulacion) {
      setError('No tienes permisos para anular ítems.')
      return
    }
    setError(null)
    setAnularModalError(null)
    setAnularTarget(item)
    setAnularMotivo('')
  }

  async function startPay() {
    setPayError(null)
    setError(null)

    if (!cuenta?.id) return
    if (!selectedComensalId) {
      setPayError('Selecciona un comensal para hacer cierre parcial.')
      setPayOpen(true)
      return
    }
    if (selectedComensal?.estadoCliente === 'liberado' && pendingItemsDelComensal.length === 0) {
      setPayError('Este comensal ya está liberado y no tiene ítems pendientes.')
      setPayOpen(true)
      return
    }
    if (unassignedPending.length > 0) {
      setPayError('Hay ítems pendientes sin asignar. Asigna los ítems antes de cerrar parcialmente.')
      setPayOpen(true)
      return
    }
    if (pendingItemsDelComensal.length === 0) {
      setPayError('El comensal no tiene ítems pendientes.')
      setPayOpen(true)
      return
    }

    setPayOpen(true)
  }

  async function confirmPay(metodo, promocionId = '', promocionMotivo = '') {
    if (!cuenta?.id || !selectedComensalId || !selectedMesaId) return

    setPayLoading(true)
    setPayError(null)
    try {
      const result = await payPartialForComensal({
        cuentaId: cuenta.id,
        mesaId: selectedMesaId,
        comensalId: selectedComensalId,
        metodo,
        promocionId: promocionId || null,
        promocionMotivo: promocionMotivo || '',
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

  async function confirmCancelarCuenta() {
    if (!cuenta?.id || !user?.uid) return
    const motivoTrim = cancelarMotivo.trim()
    if (!motivoTrim) {
      setError('Debe indicar un motivo para cancelar la cuenta.')
      return
    }

    setCancelarLoading(true)
    setError(null)
    try {
      const result = await cancelarCuenta({
        cuentaId: cuenta.id,
        mesaId: selectedMesaId,
        usuarioId: user.uid,
        motivo: motivoTrim,
      })

      if (result.ok) {
        setConfirmCancelarOpen(false)
        setCancelarMotivo('')
        setError(null)
        setSelectedMesaId(null)
        setSelectedComensalId(null)
        setCuenta(null)
        setComensales([])
        setItems([])
        setUnassignedPending([])
        await loadMesas()
      }
    } catch (e) {
      if (e?.code === 'MOTIVO_REQUIRED') {
        setError('Debe indicar un motivo para cancelar la cuenta.')
      } else if (e?.code === 'HAS_PAID_ITEMS') {
        setError('No se puede cancelar una cuenta con ítems ya pagados.')
      } else if (e?.code === 'INVALID_ACCOUNT_STATE') {
        setError('Solo se pueden cancelar cuentas abiertas.')
      } else {
        setError(e?.message || 'Error al cancelar la cuenta.')
      }
    } finally {
      setCancelarLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        await Promise.all([
          loadMesas(),
          (async () => {
            const promos = await getPromocionesActivasParaCobro().catch(() => [])
            if (mounted) setPromocionesActivas(promos || [])
          })(),
        ])
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
          <p className="text-gray-600 text-sm">Gestion de cuentas compartidas por comensal</p>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {error &&
        !addProductOpen &&
        !payOpen &&
        !confirmCerrarOpen &&
        !confirmCancelarOpen &&
        !anularTarget &&
        !revertTarget && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
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
                          onClick={() => {
                            setError(null)
                            setConfirmCerrarOpen(true)
                          }}
                          className="btn border border-amber-600 text-amber-700 hover:bg-amber-100 gap-1"
                          disabled={cerrarLoading}
                        >
                          <LockClosedIcon className="w-4 h-4" />
                          Cerrar cuenta (sin más cambios)
                        </button>
                      </div>
                    </div>
                  )}

                  {cuenta?.estadoCuenta === 'abierta' && (
                    <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmCancelarOpen(true)
                          setCancelarMotivo('')
                          setError(null)
                        }}
                        className="btn btn-ghost border border-gray-300 text-gray-700 hover:bg-gray-50"
                        disabled={cancelarLoading}
                      >
                        Cancelar cuenta
                      </button>
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
                                        title="Anular ítem"
                                      >
                                        {deletingItemId === i.id ? (
                                          <span className="loading loading-spinner loading-xs" />
                                        ) : (
                                          <TrashIcon className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                    {i.estadoItem === 'anulado' && canManageAnulacion && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRevertTarget(i)
                                          setRevertMotivo('')
                                          setRevertModalError(null)
                                          setError(null)
                                        }}
                                        className="p-1.5 rounded border border-cyan-200 text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
                                        disabled={deletingItemId === i.id}
                                        title="Revertir anulación"
                                      >
                                        {deletingItemId === i.id ? (
                                          <span className="loading loading-spinner loading-xs" />
                                        ) : (
                                          <ArrowUturnLeftIcon className="w-4 h-4" />
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
        onClose={() => {
          setPayOpen(false)
          setPayError(null)
        }}
        onConfirm={confirmPay}
        loading={payLoading}
        resumen={resumenPago}
        error={payError}
        promociones={promocionesActivas}
      />

      {/* Modal menú (mismo criterio que Meseros: búsqueda, categorías, tarjetas) */}
      {addProductOpen && (
        <ModalPortal overlayClassName="p-4 md:p-6 flex items-center justify-center">
          <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:shadow-black/50">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-900 to-cyan-900 px-4 py-4 text-white md:px-6 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900">
              <div className="min-w-0">
                <div className="text-xl font-bold truncate">
                  Agregar producto
                  {selectedMesa ? ` · ${formatMesaFromDoc(selectedMesa)}` : ''}
                </div>
                <div className="mt-0.5 text-sm text-cyan-200 dark:text-zinc-400">
                  {selectedMesa?.zona ? `Zona: ${selectedMesa.zona}` : 'Catálogo'}
                  {selectedComensal?.alias ? ` · ${selectedComensal.alias}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddProductModal}
                className="btn btn-sm btn-ghost shrink-0 text-white"
                disabled={addingProduct}
              >
                <XMarkIcon className="h-5 w-5" />
                Cerrar
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:mx-6 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Buscar por nombre o descripción..."
                  className="input input-bordered w-full pl-10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {categoriasMenu.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMenuCategoria(cat)}
                    className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                      menuCategoria === cat
                        ? 'bg-cyan-600 text-white dark:bg-cyan-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-sm text-cyan-900 dark:border-cyan-800/50 dark:bg-cyan-950/30 dark:text-cyan-200">
                Agregando ítems para:{' '}
                <span className="font-semibold">
                  {selectedComensal?.alias || 'Selecciona un comensal en el panel'}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loadingMenuProductos ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-gray-500 dark:text-zinc-500">
                    <span className="loading loading-spinner loading-md" />
                    Cargando menú...
                  </div>
                ) : productos.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
                    No hay productos en el catálogo.
                  </div>
                ) : productosMenuFiltrados.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
                    No hay productos para el filtro actual.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {productosMenuFiltrados.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                      >
                        <div className="font-semibold text-gray-800 dark:text-zinc-100">{item.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">{item.categoria}</div>
                        {item.desc && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-zinc-400">{item.desc}</p>
                        )}
                        <div className="mt-2 text-lg font-bold text-cyan-700 dark:text-cyan-400">
                          {moneyCRC(item.price)}
                        </div>
                        <button
                          type="button"
                          onClick={() => addProductToComensal(item.id)}
                          disabled={addingProduct || !selectedComensalId}
                          className="btn btn-sm mt-3 w-full border-0 bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
                          title={!selectedComensalId ? 'Selecciona un comensal en el panel principal' : ''}
                        >
                          {addingProduct ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <PlusIcon className="h-4 w-4" />
                          )}
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {addingProduct && (
              <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400">
                Agregando a la cuenta...
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Modal confirmar cerrar cuenta (reabierta) */}
      {confirmCerrarOpen && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden dark:bg-zinc-900">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2 dark:border-zinc-700">
              <LockClosedIcon className="w-6 h-6 text-amber-600" />
              <div className="font-bold text-gray-900 dark:text-zinc-100">Cerrar cuenta</div>
            </div>
            {error && (
              <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            <div className="p-5 space-y-4">
              <p className="text-gray-700 dark:text-zinc-300">
                ¿Cerrar la cuenta sin más cambios? La cuenta quedará cerrada y dejará de aparecer en Mesa compartida.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCerrarOpen(false)
                    setError(null)
                  }}
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
        </ModalPortal>
      )}

      {/* Modal cancelar cuenta */}
      {confirmCancelarOpen && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden dark:bg-zinc-900">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2 dark:border-zinc-700">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
              <div className="font-bold text-gray-900 dark:text-zinc-100">Cancelar cuenta</div>
            </div>
            {error && (
              <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            <div className="p-5 space-y-4">
              <p className="text-gray-700 text-sm dark:text-zinc-300">
                Esta acción cancelará la cuenta, anulará ítems pendientes y liberará la mesa.
              </p>
              <textarea
                value={cancelarMotivo}
                onChange={(e) => setCancelarMotivo(e.target.value)}
                placeholder="Motivo de cancelación (obligatorio)"
                className="textarea textarea-bordered w-full min-h-[110px] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCancelarOpen(false)
                    setError(null)
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={cancelarLoading}
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmCancelarCuenta}
                  className="flex-1 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold disabled:opacity-50"
                  disabled={cancelarLoading}
                >
                  {cancelarLoading ? 'Cancelando...' : 'Cancelar cuenta'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal anular ítem */}
      {anularTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden dark:bg-zinc-900">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between dark:border-zinc-700">
              <div className="font-bold text-gray-900 dark:text-zinc-100">Anular ítem</div>
              <button
                type="button"
                onClick={() => {
                  setAnularTarget(null)
                  setAnularModalError(null)
                  setError(null)
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
              </button>
            </div>
            {anularModalError && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {anularModalError}
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600 dark:text-zinc-400">
                Ítem: <span className="font-semibold text-gray-900 dark:text-zinc-100">{anularTarget.nombreSnapshot || anularTarget.productoId || 'Item'}</span>
              </div>
              <textarea
                value={anularMotivo}
                onChange={(e) => {
                  setAnularMotivo(e.target.value)
                  setAnularModalError(null)
                }}
                placeholder="Motivo de anulación (obligatorio)"
                className="textarea textarea-bordered w-full min-h-[100px] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAnularTarget(null)
                    setAnularModalError(null)
                    setError(null)
                  }}
                  className="flex-1 btn btn-ghost"
                  disabled={anulando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAnularItem}
                  className="flex-1 btn bg-red-600 hover:bg-red-700 text-white border-0"
                  disabled={anulando}
                >
                  {anulando ? 'Anulando...' : 'Confirmar anulación'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal revertir anulación */}
      {revertTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden dark:bg-zinc-900">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between dark:border-zinc-700">
              <div className="font-bold text-gray-900 dark:text-zinc-100">Revertir anulación</div>
              <button
                type="button"
                onClick={() => {
                  setRevertTarget(null)
                  setRevertModalError(null)
                  setError(null)
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
              </button>
            </div>
            {revertModalError && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {revertModalError}
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600 dark:text-zinc-400">
                Ítem: <span className="font-semibold text-gray-900 dark:text-zinc-100">{revertTarget.nombreSnapshot || revertTarget.productoId || 'Item'}</span>
              </div>
              <textarea
                value={revertMotivo}
                onChange={(e) => {
                  setRevertMotivo(e.target.value)
                  setRevertModalError(null)
                }}
                placeholder="Motivo de reversión (obligatorio)"
                className="textarea textarea-bordered w-full min-h-[100px] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRevertTarget(null)
                    setRevertModalError(null)
                    setError(null)
                  }}
                  className="flex-1 btn btn-ghost"
                  disabled={revirtiendo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmRevertirItem}
                  className="flex-1 btn bg-cyan-600 hover:bg-cyan-700 text-white border-0"
                  disabled={revirtiendo}
                >
                  {revirtiendo ? 'Revirtiendo...' : 'Confirmar reversión'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

