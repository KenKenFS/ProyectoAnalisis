import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TableCellsIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightCircleIcon,
  PencilSquareIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

import { db } from '@shared/firebase/firebase'
import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'
import { formatMesaLabel, formatMesaFromDoc } from '@shared/utils/mesaDisplay'
import MesasMapView from '../components/floorplan/MesasMapView'
import {
  addCuentaItemConCantidad,
  anularCuentaItem,
  createCuentaComensal,
  ensureCuentaActivaMesa,
  getCuentaComensales,
  getCuentaItems,
  getPedidoActivoMesa,
  getProductos,
  onPedidosChange,
  registrarPedidoMesa,
  updateCuentaItemNotaEspecial,
  updatePedido,
} from '@shared/firebase/firestore'

function normalizeMesaStatus(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase()
  if (value === 'libre' || value === 'disponible') return 'libre'
  if (value === 'ocupada' || value === 'ocupado') return 'ocupada'
  if (value === 'esperandocuenta' || value === 'esperando_cuenta' || value === 'esperandocobro') {
    return 'esperandoCuenta'
  }
  if (value === 'porlimpiar' || value === 'por_limpiar' || value === 'por limpiar') {
    return 'porLimpiar'
  }
  return 'libre'
}

function getStatusUI(status) {
  if (status === 'ocupada') {
    return {
      label: 'Ocupada',
      cardClass:
        'bg-blue-50/90 border border-blue-300/90 dark:bg-zinc-900/95 dark:border-blue-500/45',
      textClass: 'text-blue-700 dark:text-blue-300',
      tagClass:
        'inline-flex items-center gap-1.5 rounded-full border border-sky-500/55 bg-sky-500/[0.1] px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-400/45 dark:bg-sky-500/15 dark:text-sky-200',
      tagDotClass: 'bg-sky-500 dark:bg-sky-400',
      iconClass: 'text-blue-600 dark:text-blue-400',
      icon: UserGroupIcon,
    }
  }
  if (status === 'esperandoCuenta') {
    return {
      label: 'Lista para pagar',
      cardClass:
        'bg-amber-50/90 border border-amber-300/90 dark:bg-zinc-900/95 dark:border-amber-500/45',
      textClass: 'text-amber-800 dark:text-amber-200',
      tagClass:
        'inline-flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-500/[0.1] px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/45 dark:bg-amber-500/15 dark:text-amber-200',
      tagDotClass: 'bg-amber-500 dark:bg-amber-400',
      iconClass: 'text-amber-600 dark:text-amber-400',
      icon: ClockIcon,
    }
  }
  if (status === 'porLimpiar') {
    return {
      label: 'Por limpiar',
      cardClass:
        'bg-violet-50/90 border border-violet-300/90 dark:bg-zinc-900/95 dark:border-violet-500/45',
      textClass: 'text-violet-800 dark:text-violet-200',
      tagClass:
        'inline-flex items-center gap-1.5 rounded-full border border-violet-500/60 bg-violet-500/[0.1] px-2.5 py-1 text-xs font-semibold text-violet-900 dark:border-violet-400/45 dark:bg-violet-500/15 dark:text-violet-200',
      tagDotClass: 'bg-violet-500 dark:bg-violet-400',
      iconClass: 'text-violet-600 dark:text-violet-400',
      icon: SparklesIcon,
    }
  }
  return {
    label: 'Libre',
    cardClass:
      'bg-emerald-50/90 border border-emerald-400/80 dark:bg-zinc-900/95 dark:border-emerald-500/40',
    textClass: 'text-emerald-800 dark:text-emerald-200',
    tagClass:
      'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-500/[0.1] px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-200',
    tagDotClass: 'bg-emerald-500 dark:bg-emerald-400',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircleIcon,
  }
}

function StatusTag({ ui }) {
  return (
    <span className={ui.tagClass}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ui.tagDotClass}`} aria-hidden />
      {ui.label}
    </span>
  )
}

function createLocalComensal(defaultAlias = 'Comensal 1', persistedId = null) {
  return {
    localId: `com_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    alias: defaultAlias,
    persistedId,
  }
}

function normalizeAliasOrder(alias) {
  const text = String(alias || '').trim().toLowerCase()
  const match = text.match(/(\d+)\s*$/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[1]) || Number.MAX_SAFE_INTEGER
}

function parseQtyAndName(raw) {
  const text = String(raw || '').trim()
  if (!text) return { name: 'Item', qty: 1 }
  const match = text.match(/^(\d+)\s*x\s+(.+)$/i)
  if (!match) return { name: text, qty: 1 }
  return {
    qty: Number(match[1]) || 1,
    name: String(match[2] || 'Item').trim(),
  }
}

function normalizePedidoStatus(rawStatus) {
  const status = String(rawStatus || '').trim().toLowerCase()
  if (status === 'enpreparacion' || status === 'en_preparacion') return 'enPreparacion'
  return status
}

function normalizeItemStatus(rawStatus) {
  const status = String(rawStatus || '').trim().toLowerCase()
  if (status === 'en_preparacion') return 'enpreparacion'
  return status
}

function toMillis(rawDate) {
  if (!rawDate) return 0
  if (typeof rawDate?.toDate === 'function') return rawDate.toDate().getTime()
  if (typeof rawDate?.toMillis === 'function') return rawDate.toMillis()
  const value = new Date(rawDate).getTime()
  return Number.isFinite(value) ? value : 0
}

function getPedidoMesaLabel(pedido, mesas) {
  if (pedido.mesaNumero != null && Number(pedido.mesaNumero) > 0) return formatMesaLabel(pedido.mesaNumero)
  const mesaId = String(pedido.mesaId || '').trim()
  if (!mesaId) return 'S/N'
  const mesa = (mesas || []).find((m) => String(m.id) === mesaId)
  if (!mesa) return mesaId
  if (mesa.numero != null && Number(mesa.numero) > 0) return formatMesaLabel(mesa.numero)
  return String(mesa.alias || mesa.id || 'S/N')
}

function normalizePedidoListItem(item, idx) {
  if (typeof item === 'string') {
    const parsed = parseQtyAndName(item)
    return {
      id: `line_${idx}`,
      name: parsed.name,
      qty: parsed.qty,
      note: '',
    }
  }

  const raw = item || {}
  return {
    id: raw.id || `line_${idx}`,
    name: raw.nombreSnapshot || raw.nombre || raw.name || raw.productoId || 'Item',
    qty: Number(raw.cantidad || raw.qty || 1),
    note: String(raw.notaEspecial || raw.nota || '').trim(),
  }
}

function getPedidoItemsFallback(pedido) {
  if (!pedido) return []
  const candidates = [
    pedido.items,
    pedido.productos,
    pedido.detalle,
    pedido.detalles,
    pedido.platillos,
    pedido.lineas,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const values = Object.values(candidate)
      if (values.length > 0) return values
    }
  }
  return []
}

export default function MeserosPage() {
  const { user, isMesero, isAdmin, loading: authLoading } = useAuth()
  const [mesas, setMesas] = useState([])
  const [selectedMesaId, setSelectedMesaId] = useState(null)
  const [orderingMesa, setOrderingMesa] = useState(null)
  const [loadingMesas, setLoadingMesas] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [updatingMesaId, setUpdatingMesaId] = useState(null)
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('Todos')
  const [cart, setCart] = useState([])
  const [comensalesPedido, setComensalesPedido] = useState([createLocalComensal('Comensal 1')])
  const [selectedComensalLocalId, setSelectedComensalLocalId] = useState(null)
  const [notasPedido, setNotasPedido] = useState('')
  const [sendingPedido, setSendingPedido] = useState(false)
  const [loadingCuentaData, setLoadingCuentaData] = useState(false)
  const [existingItems, setExistingItems] = useState([])
  const [existingOrderNotes, setExistingOrderNotes] = useState('')
  const [activeKitchenOrderStatus, setActiveKitchenOrderStatus] = useState('')
  const [removingItemId, setRemovingItemId] = useState('')
  const [readyOrders, setReadyOrders] = useState([])
  const [loadingReadyOrders, setLoadingReadyOrders] = useState(true)
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null)
  const [deliveryLines, setDeliveryLines] = useState([])
  const [selectedDeliveryLineIds, setSelectedDeliveryLineIds] = useState([])
  const [deliveringOrderId, setDeliveringOrderId] = useState('')
  const [editingExistingNoteId, setEditingExistingNoteId] = useState('')
  const [editingExistingNoteValue, setEditingExistingNoteValue] = useState('')
  const [savingExistingNoteId, setSavingExistingNoteId] = useState('')
  const [pendingRemovalItem, setPendingRemovalItem] = useState(null)
  const [removalReason, setRemovalReason] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'mesas'),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data()
            const rawEstado = data.estadoMesa ?? data.estado ?? 'libre'
            return {
              id: docSnap.id,
              ...data,
              estadoMesa: normalizeMesaStatus(rawEstado),
            }
          })
          .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))
        setMesas(mapped)
        setLoadingMesas(false)
        setError('')
      },
      (err) => {
        setError(err?.message || 'No se pudieron cargar las mesas.')
        setLoadingMesas(false)
      }
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoadingProductos(true)
        const data = await getProductos()
        if (mounted) setProductos(data || [])
      } catch (e) {
        if (mounted) setError(e?.message || 'No se pudieron cargar los productos.')
      } finally {
        if (mounted) setLoadingProductos(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onPedidosChange((pedidos) => {
      const orderedPedidos = [...(pedidos || [])]
        .sort((a, b) => toMillis(a.createdAt || a.timestamp) - toMillis(b.createdAt || b.timestamp))
      const displayIdByPedidoId = new Map(
        orderedPedidos.map((p, idx) => {
          const code = p.codigoPedido || p.codigo || p.numeroOrden
          const displayId = code || `ORD-${String(idx + 1).padStart(3, '0')}`
          return [p.id, displayId]
        })
      )

      const ready = (pedidos || [])
        .map((p) => {
          const status = normalizePedidoStatus(p.estadoPedido || p.estado)
          const allItems = getPedidoItemsFallback(p).map((it, idx) => normalizePedidoListItem(it, idx))
          const previousItems = (Array.isArray(p.itemsPrevios) ? p.itemsPrevios : [])
            .map((it, idx) => normalizePedidoListItem(it, idx + 10000))
          const pendingDeliverySource =
            Array.isArray(p.itemsPendientesEntrega) && p.itemsPendientesEntrega.length > 0
              ? p.itemsPendientesEntrega
              : (status === 'listo' || status === 'finalizado' ? [...previousItems, ...allItems] : previousItems)
          const pendingDeliveryItems = pendingDeliverySource.map((it, idx) => normalizePedidoListItem(it, idx))
          return {
            id: p.id,
            displayId: displayIdByPedidoId.get(p.id) || `ORD-${String((p.id || '').slice(0, 3)).padStart(3, '0')}`,
            mesaLabel: getPedidoMesaLabel(p, mesas),
            mesaId: p.mesaId || null,
            notes: String(p.notasPedido || '').trim(),
            items: pendingDeliveryItems,
            entregasParciales: Array.isArray(p.entregasParciales) ? p.entregasParciales : [],
            estadoEntrega: p.estadoEntrega || 'pendiente',
            status,
            updatedAtMs: p.updatedAt?.toDate ? p.updatedAt.toDate().getTime() : Date.now(),
          }
        })
        .filter((order) => {
          const estadoEntrega = String(order.estadoEntrega || '').trim().toLowerCase()
          return estadoEntrega !== 'entregado' && (order.items || []).length > 0
        })
        .map((p) => {
          return {
            ...p,
          }
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs)

      setReadyOrders(ready)
      setLoadingReadyOrders(false)
    })

    return () => unsubscribe()
  }, [mesas])

  const selectedMesa = useMemo(
    () => mesas.find((m) => m.id === selectedMesaId) || null,
    [mesas, selectedMesaId]
  )

  const selectedMesaStatusUi = useMemo(
    () => (selectedMesa ? getStatusUI(selectedMesa.estadoMesa) : null),
    [selectedMesa]
  )

  const categorias = useMemo(() => {
    const unique = new Set((productos || []).map((p) => p.categoria || 'General'))
    return ['Todos', ...unique]
  }, [productos])

  const productosFiltrados = useMemo(() => {
    const list = (productos || []).map((p) => ({
      id: p.id,
      productoId: p.id,
      name: p.nombre ?? p.name ?? p.id,
      categoria: p.categoria || 'General',
      price: Number(p.precioUnit ?? p.precio ?? 0),
      desc: p.descripcion || '',
    }))
    return list.filter((item) => {
      const okCategoria = selectedCategoria === 'Todos' || item.categoria === selectedCategoria
      const okSearch = item.name.toLowerCase().includes(search.toLowerCase())
      return okCategoria && okSearch
    })
  }, [productos, selectedCategoria, search])

  const subtotal = Math.round(
    cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  )
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  const existingItemsByComensal = useMemo(() => {
    const map = {}
    existingItems.forEach((item) => {
      const key = item.comensalLocalId || '__sin_comensal__'
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [existingItems])

  useEffect(() => {
    if (!selectedComensalLocalId && comensalesPedido.length > 0) {
      setSelectedComensalLocalId(comensalesPedido[0].localId)
    }
  }, [comensalesPedido, selectedComensalLocalId])

  async function aplicarEstadoMesa(mesa, nextEstado) {
    if (!mesa?.id || updatingMesaId) return
    const cuentaActiva = Boolean(mesa.cuentaActivaId)
    const estado = mesa.estadoMesa

    if (nextEstado === 'esperandoCuenta') {
      if (!cuentaActiva) {
        setError('Se requiere cuenta activa para marcar lista para pagar.')
        return
      }
      if (estado !== 'ocupada' && estado !== 'porLimpiar') {
        setError('Solo puedes pasar a lista para pagar desde mesa ocupada o por limpiar.')
        return
      }
    }
    if (nextEstado === 'porLimpiar') {
      if (!cuentaActiva || estado !== 'ocupada') {
        setError('Solo puedes marcar por limpiar en mesas ocupadas con pedido activo.')
        return
      }
    }
    if (nextEstado === 'ocupada') {
      if (estado !== 'esperandoCuenta' && estado !== 'porLimpiar') {
        setError('No se puede volver a ocupada desde este estado.')
        return
      }
    }
    if (nextEstado === 'libre') {
      if (estado !== 'porLimpiar') {
        setError('Solo puedes marcar como libre una mesa que está por limpiar.')
        return
      }
    }

    setError('')
    setUpdatingMesaId(mesa.id)
    try {
      await updateDoc(doc(db, 'mesas', mesa.id), {
        estadoMesa: nextEstado,
        estado: nextEstado,
        updatedAt: new Date(),
      })
      setSuccess('Estado de mesa actualizado.')
      setTimeout(() => setSuccess(''), 2800)
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar el estado de la mesa.')
    } finally {
      setUpdatingMesaId(null)
    }
  }

  function addToCart(item) {
    setSuccess('')
    setError('')
    const targetComensalId = selectedComensalLocalId || comensalesPedido[0]?.localId || null
    if (!targetComensalId) {
      setError('Debes tener al menos un comensal para agregar productos.')
      return
    }
    setCart((prev) => {
      const existing = prev.find(
        (p) => p.productoId === (item.productoId || item.id) && p.comensalLocalId === targetComensalId
      )
      if (existing) {
        return prev.map((p) => (p.lineId === existing.lineId ? { ...p, qty: p.qty + 1 } : p))
      }
      return [
        ...prev,
        {
          ...item,
          lineId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productoId: item.productoId || item.id,
          qty: 1,
          notaEspecial: '',
          comensalLocalId: targetComensalId,
        },
      ]
    })
  }

  function updateQty(lineId, delta) {
    setCart((prev) =>
      prev
        .map((p) => (p.lineId === lineId ? { ...p, qty: Math.max(0, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    )
  }

  function removeItem(lineId) {
    setCart((prev) => prev.filter((p) => p.lineId !== lineId))
  }

  function updateNotaItem(lineId, notaEspecial) {
    setCart((prev) => prev.map((p) => (p.lineId === lineId ? { ...p, notaEspecial } : p)))
  }

  function updateItemComensal(lineId, nextComensalLocalId) {
    setCart((prev) =>
      prev.map((p) => (p.lineId === lineId ? { ...p, comensalLocalId: nextComensalLocalId } : p))
    )
  }

  function addComensalPedido() {
    setError('')
    setSuccess('')
    setComensalesPedido((prev) => {
      const next = [...prev, createLocalComensal(`Comensal ${prev.length + 1}`)]
      return next
    })
  }

  function updateComensalAlias(localId, alias) {
    setComensalesPedido((prev) => prev.map((c) => (c.localId === localId ? { ...c, alias } : c)))
  }

  function removeComensalPedido(localId) {
    if (comensalesPedido.length <= 1) return
    const remaining = comensalesPedido.filter((c) => c.localId !== localId)
    const fallbackLocalId = remaining[0]?.localId || null
    setComensalesPedido(remaining)
    setSelectedComensalLocalId((prev) => (prev === localId ? fallbackLocalId : prev))
    setCart((prev) =>
      prev.map((item) =>
        item.comensalLocalId === localId ? { ...item, comensalLocalId: fallbackLocalId } : item
      )
    )
  }

  async function openOrderingModal(mesa) {
    const first = createLocalComensal('Comensal 1')
    setOrderingMesa(mesa)
    setCart([])
    setNotasPedido('')
    setComensalesPedido([first])
    setSelectedComensalLocalId(first.localId)
    setExistingItems([])
    setExistingOrderNotes('')
    setActiveKitchenOrderStatus('')
    setError('')
    setSuccess('')

    if (!mesa?.cuentaActivaId) return

    try {
      setLoadingCuentaData(true)
      const [comensalesExistentes, itemsCuenta] = await Promise.all([
        getCuentaComensales(mesa.cuentaActivaId),
        getCuentaItems(mesa.cuentaActivaId),
      ])
      const pedidoActivo = await getPedidoActivoMesa({
        cuentaId: mesa.cuentaActivaId,
        mesaId: mesa.id,
      })

      const activos = (comensalesExistentes || []).filter(
        (c) => String(c.estadoCliente || 'activo').toLowerCase() !== 'liberado'
      )
      const activosOrdenados = [...activos].sort((a, b) => {
        const nA = normalizeAliasOrder(a.alias)
        const nB = normalizeAliasOrder(b.alias)
        if (nA !== nB) return nA - nB
        return String(a.alias || '').localeCompare(String(b.alias || ''), 'es', { sensitivity: 'base' })
      })

      let mappedComensales = activosOrdenados.map((c, idx) => ({
        localId: c.id,
        alias: String(c.alias || `Comensal ${idx + 1}`),
        persistedId: c.id,
      }))

      if (mappedComensales.length === 0) {
        mappedComensales = [first]
      }

      setComensalesPedido(mappedComensales)
      setSelectedComensalLocalId(mappedComensales[0].localId)

      const mapItemFromCuenta = (i, idx) => {
        const comensalLocalId = mappedComensales.find((c) => c.persistedId === i.comensalId)?.localId || null
        const itemStatus = normalizeItemStatus(i.estadoItem || 'pendiente')
        const prepStatus = normalizeItemStatus(i.estadoPreparacion || 'pendiente')
        const isBlockedProcessed =
          itemStatus === 'pagado' ||
          itemStatus === 'anulado' ||
          itemStatus === 'entregado' ||
          itemStatus === 'listo' ||
          prepStatus === 'entregado' ||
          prepStatus === 'listo'
        const canRemove = !isBlockedProcessed && (itemStatus === 'pendiente' || itemStatus === 'enpreparacion')
        const canEditNote = !isBlockedProcessed && itemStatus === 'pendiente' && prepStatus !== 'enpreparacion'
        return {
          id: i.id || `cuenta_${idx}`,
          cuentaItemId: i.id || null,
          productoId: i.productoId || '',
          name: i.nombreSnapshot || i.productoId || 'Item',
          qty: Number(i.cantidad || 1),
          note: String(i.notaEspecial || i.nota || '').trim(),
          price: Number(i.precioUnitSnapshot || 0),
          comensalId: i.comensalId || null,
          comensalLocalId,
          itemStatus,
          prepStatus,
          canRemove,
          canEditNote,
        }
      }

      const mapItemFromPedido = (raw, idx, pedidoId) => {
        const item = typeof raw === 'string'
          ? { nombreSnapshot: parseQtyAndName(raw).name, cantidad: parseQtyAndName(raw).qty }
          : (raw || {})
        const comensalLocalId = mappedComensales.find((c) => c.persistedId === item.comensalId)?.localId || null
        return {
          id: `pedido_${pedidoId || 'x'}_${idx}`,
          cuentaItemId: null,
          productoId: item.productoId || '',
          name: item.nombreSnapshot || item.nombre || item.name || item.productoId || 'Item',
          qty: Number(item.cantidad || item.qty || 1),
          note: String(item.notaEspecial || item.nota || '').trim(),
          price: Number(item.precioUnitSnapshot || item.precio || 0),
          comensalId: item.comensalId || null,
          comensalLocalId,
          itemStatus: normalizeItemStatus(item.estadoItem || 'pendiente'),
          prepStatus: normalizeItemStatus(item.estadoPreparacion || 'pendiente'),
          canRemove: false,
          canEditNote: false,
        }
      }

      const cuentaPending = (itemsCuenta || [])
        .filter((i) => {
          const estado = String(i.estadoItem || 'pendiente').trim().toLowerCase()
          return estado !== 'pagado' && estado !== 'anulado'
        })
        .map(mapItemFromCuenta)

      const pedidoItemsRaw = getPedidoItemsFallback(pedidoActivo)
      const pedidoPending = pedidoItemsRaw.map((raw, idx) => mapItemFromPedido(raw, idx, pedidoActivo?.id))

      const finalItems = cuentaPending.length > 0 ? cuentaPending : pedidoPending
      setExistingItems(finalItems)
      setExistingOrderNotes(String(pedidoActivo?.notasPedido || '').trim())
      setActiveKitchenOrderStatus(normalizePedidoStatus(pedidoActivo?.estadoPedido || pedidoActivo?.estado || ''))

      if (finalItems.length === 0 && (itemsCuenta?.length > 0 || pedidoItemsRaw.length > 0)) {
        console.warn('Items encontrados pero filtrados:', {
          cuentaItemsTotal: itemsCuenta?.length,
          cuentaItemsEstados: (itemsCuenta || []).map((i) => i.estadoItem),
          pedidoItemsTotal: pedidoItemsRaw.length,
        })
      }
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el detalle del pedido actual.')
    } finally {
      setLoadingCuentaData(false)
    }
  }

  async function removeExistingItem(item, explicitReason = '') {
    if (!orderingMesa?.cuentaActivaId || !item?.cuentaItemId) {
      setError('Este ítem no se puede anular desde cuenta. Agrega uno nuevo para reemplazarlo.')
      return
    }
    if (!item.canRemove) {
      if (item.itemStatus === 'listo' || item.itemStatus === 'entregado' || item.prepStatus === 'listo' || item.prepStatus === 'entregado') {
        setError('Este ítem ya fue procesado y no se puede modificar.')
        return
      }
    }
    try {
      const runAnulacion = async (motivoFinal = '') => {
        await anularCuentaItem({
          cuentaId: orderingMesa.cuentaActivaId,
          itemId: item.cuentaItemId,
          motivo: motivoFinal,
          usuarioId: user?.uid || null,
          rolUsuario: isAdmin ? 'Admin' : 'Mesero',
        })
      }

      setRemovingItemId(item.cuentaItemId)
      try {
        await runAnulacion(String(explicitReason || '').trim())
      } catch (innerError) {
        const errorText = String(innerError?.message || '').toLowerCase()
        const requiresReason = innerError?.code === 'MOTIVO_REQUIRED' || errorText.includes('motivo')
        if (requiresReason) {
          setPendingRemovalItem(item)
          setRemovalReason('')
          setError('')
          return
        } else {
          throw innerError
        }
      }
      setExistingItems((prev) => prev.filter((x) => x.cuentaItemId !== item.cuentaItemId))
      setSuccess('Ítem removido del pedido actual.')
    } catch (e) {
      setError(e?.message || 'No se pudo remover el ítem.')
    } finally {
      setRemovingItemId('')
    }
  }

  async function confirmRemovalWithReason() {
    if (!pendingRemovalItem) return
    const reason = String(removalReason || '').trim()
    if (!reason) {
      setError('Debes indicar un motivo para anular un ítem en preparación.')
      return
    }
    await removeExistingItem(pendingRemovalItem, reason)
    setPendingRemovalItem(null)
    setRemovalReason('')
  }

  function startEditExistingItemNote(item) {
    if (!item?.cuentaItemId || !item.canEditNote) {
      setError('Solo puedes editar la nota antes de iniciar preparación.')
      return
    }
    setError('')
    setEditingExistingNoteId(item.cuentaItemId)
    setEditingExistingNoteValue(item.note || '')
  }

  function cancelEditExistingItemNote() {
    setEditingExistingNoteId('')
    setEditingExistingNoteValue('')
  }

  async function saveExistingItemNote(item) {
    if (!orderingMesa?.cuentaActivaId || !item?.cuentaItemId) return
    try {
      setSavingExistingNoteId(item.cuentaItemId)
      await updateCuentaItemNotaEspecial({
        cuentaId: orderingMesa.cuentaActivaId,
        itemId: item.cuentaItemId,
        notaEspecial: editingExistingNoteValue,
        usuarioId: user?.uid || null,
        rolUsuario: isAdmin ? 'Admin' : 'Mesero',
      })
      setExistingItems((prev) =>
        prev.map((x) => (x.cuentaItemId === item.cuentaItemId ? { ...x, note: String(editingExistingNoteValue || '').trim() } : x))
      )
      setSuccess('Nota del ítem actualizada.')
      cancelEditExistingItemNote()
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar la nota del ítem.')
    } finally {
      setSavingExistingNoteId('')
    }
  }

  function openDeliveryModal(order) {
    if (!order) return
    setError('')
    setSuccess('')
    setDeliveryModalOrder(order)
    setDeliveryLines(
      (order.items || []).map((item, idx) => ({
        id: item.id || `line_${idx}`,
        name: item.name,
        note: item.note || '',
        qty: Number(item.qty || 1),
      }))
    )
    setSelectedDeliveryLineIds([])
  }

  function closeDeliveryModal() {
    setDeliveryModalOrder(null)
    setDeliveryLines([])
    setSelectedDeliveryLineIds([])
  }

  function toggleDeliveryLine(lineId) {
    setSelectedDeliveryLineIds((prev) => (
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    ))
  }

  function selectAllDeliveryLines() {
    setSelectedDeliveryLineIds(deliveryLines.map((line) => line.id))
  }

  function clearDeliverySelection() {
    setSelectedDeliveryLineIds([])
  }

  async function confirmDelivery() {
    if (!deliveryModalOrder) return

    const selectedSet = new Set(selectedDeliveryLineIds)
    const linesToDeliver = deliveryLines.filter((line) => selectedSet.has(line.id))
    if (linesToDeliver.length === 0) {
      setError('Selecciona al menos un item para entregar.')
      return
    }

    const remainingLines = deliveryLines.filter((line) => !selectedSet.has(line.id))

    const entregados = linesToDeliver.map((line) => ({
      nombreSnapshot: line.name,
      cantidad: Number(line.qty || 1),
      notaEspecial: line.note || '',
      deliveredAt: new Date(),
      deliveredByUid: user?.uid || null,
    }))

    try {
      setDeliveringOrderId(deliveryModalOrder.id)
      const isFullDelivery = remainingLines.length === 0
      const currentStatus = normalizePedidoStatus(deliveryModalOrder.status)
      const updates = {
        itemsPendientesEntrega: remainingLines,
        entregasParciales: [...(deliveryModalOrder.entregasParciales || []), ...entregados],
        estadoEntrega: isFullDelivery ? 'entregado' : 'pendiente',
        entregadoAt: isFullDelivery ? new Date() : null,
      }

      if (isFullDelivery && (currentStatus === 'listo' || currentStatus === 'finalizado')) {
        updates.estado = 'entregado'
        updates.estadoPedido = 'entregado'
      }

      await updatePedido(deliveryModalOrder.id, updates)
      setSuccess(
        isFullDelivery
          ? `Pedido ${deliveryModalOrder.displayId} entregado completo.`
          : `Entrega parcial registrada para pedido ${deliveryModalOrder.displayId}.`
      )
      closeDeliveryModal()
    } catch (e) {
      setError(e?.message || 'No se pudo confirmar la entrega del pedido.')
    } finally {
      setDeliveringOrderId('')
    }
  }

  async function enviarPedidoCocina() {
    if (!orderingMesa) {
      setError('Selecciona una mesa para enviar pedido.')
      return
    }
    if (cart.length === 0) {
      setError('Agrega al menos un producto al pedido.')
      return
    }

    const comensalesLimpios = comensalesPedido.map((c) => ({
      ...c,
      alias: String(c.alias || '').trim(),
    }))
    if (comensalesLimpios.length === 0) {
      setError('Debes registrar al menos un comensal.')
      return
    }
    if (comensalesLimpios.some((c) => !c.alias)) {
      setError('Todos los comensales deben tener nombre.')
      return
    }
    const aliasSet = new Set(comensalesLimpios.map((c) => c.alias.toLowerCase()))
    if (aliasSet.size !== comensalesLimpios.length) {
      setError('No repitas nombres de comensales en la misma mesa.')
      return
    }

    let pasoActual = 'iniciando pedido'
    try {
      setSendingPedido(true)
      setError('')
      setSuccess('')

      pasoActual = 'asegurar cuenta activa de la mesa'
      const cuentaId = await ensureCuentaActivaMesa({
        mesaId: orderingMesa.id,
        openedByUid: user?.uid || null,
      })

      pasoActual = 'crear comensales de la cuenta'
      const comensalesExistentes = await getCuentaComensales(cuentaId)
      const comensalIdByLocalId = new Map()
      for (const c of comensalesLimpios) {
        if (c.persistedId) {
          comensalIdByLocalId.set(c.localId, c.persistedId)
          continue
        }
        const existente = comensalesExistentes.find(
          (x) =>
            String(x.alias || '').trim().toLowerCase() === c.alias.toLowerCase() &&
            String(x.estadoCliente || 'activo').toLowerCase() !== 'liberado'
        )
        if (existente?.id) {
          comensalIdByLocalId.set(c.localId, existente.id)
          continue
        }

        const nuevoId = await createCuentaComensal({
          cuentaId,
          alias: c.alias,
          createdByUid: user?.uid || null,
        })
        comensalIdByLocalId.set(c.localId, nuevoId)
      }

      pasoActual = 'agregar items a la cuenta'
      const fallbackComensalId = comensalIdByLocalId.get(comensalesLimpios[0].localId) || null
      for (const item of cart) {
        const comensalId = comensalIdByLocalId.get(item.comensalLocalId) || fallbackComensalId
        await addCuentaItemConCantidad({
          cuentaId,
          productoId: item.productoId || item.id,
          cantidad: item.qty,
          notaEspecial: item.notaEspecial || '',
          comensalId,
          createdByUid: user?.uid || null,
        })
      }

      pasoActual = 'registrar pedido en cocina'
      await registrarPedidoMesa({
        mesaId: orderingMesa.id,
        cuentaId,
        meseroUid: user?.uid || null,
        notasPedido,
        items: cart.map((item) => ({
          productoId: item.productoId || item.id,
          nombreSnapshot: item.name,
          precioUnitSnapshot: item.price,
          cantidad: item.qty,
          notaEspecial: item.notaEspecial || '',
          comensalId:
            comensalIdByLocalId.get(item.comensalLocalId) ||
            comensalIdByLocalId.get(comensalesLimpios[0].localId) ||
            null,
        })),
      })

      setSuccess(`Pedido enviado a cocina para ${formatMesaFromDoc(orderingMesa)}.`)
      setCart([])
      setComensalesPedido([createLocalComensal('Comensal 1')])
      setSelectedComensalLocalId(null)
      setNotasPedido('')
      setOrderingMesa(null)
    } catch (e) {
      const rawMessage = e?.message || 'No se pudo enviar el pedido a cocina.'
      const permissionMsg = rawMessage.toLowerCase().includes('missing or insufficient permissions')
      if (permissionMsg) {
        setError(`Permisos insuficientes al ${pasoActual}.`)
      } else {
        setError(`Error al ${pasoActual}: ${rawMessage}`)
      }
      console.error('Error enviarPedidoCocina:', { pasoActual, error: e })
    } finally {
      setSendingPedido(false)
    }
  }

  if (authLoading) {
    return <div className="text-sm text-gray-600 dark:text-zinc-400">Cargando permisos...</div>
  }

  if (!isMesero && !isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        No tienes permisos para acceder al estado de mesas.
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
        <TableCellsIcon className="h-6 w-6 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
        Estado de mesas
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Pedidos listos para entregar</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-400" aria-hidden />
            {readyOrders.length}
          </span>
        </div>

        {loadingReadyOrders ? (
          <div className="text-sm text-gray-500 dark:text-zinc-500">Cargando pedidos listos...</div>
        ) : readyOrders.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-zinc-500">No hay pedidos listos por entregar.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="space-y-2 rounded-lg border border-emerald-400/70 bg-emerald-50/80 p-3 dark:border-emerald-500/40 dark:bg-zinc-900/90"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-semibold text-gray-900 dark:text-zinc-100">Pedido {order.displayId}</div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/[0.1] px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/55 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
                    Listo
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-zinc-300">{order.mesaLabel}</div>
                <div className="text-xs text-gray-600 dark:text-zinc-500">
                  {order.items.length} item(s) pendientes de entrega
                </div>
                <button
                  type="button"
                  onClick={() => openDeliveryModal(order)}
                  className="btn btn-sm w-full border-0 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Entregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && !deliveryModalOrder && !orderingMesa && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="min-h-0 lg:col-span-2">
          {loadingMesas ? (
            <div
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
              style={{ height: 'clamp(520px, 78vh, 920px)' }}
            >
              Cargando mapa de mesas...
            </div>
          ) : mesas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              Aún no hay mesas registradas. Crea mesas desde la app de administración.
            </div>
          ) : (
            <MesasMapView
              mesas={mesas}
              totalMesasCount={mesas.length}
              showEditPlano={isAdmin}
              selectedMesaId={selectedMesaId}
              onSelectMesa={(mesa) => setSelectedMesaId(mesa ? mesa.id : null)}
            />
          )}
        </div>

        <aside className="sticky top-4 h-fit rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-black/40">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 dark:border-zinc-800/80 dark:from-zinc-900 dark:to-zinc-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Detalle de mesa</h2>
          </div>

          {!selectedMesa ? (
            <div className="p-5 text-sm text-gray-500 dark:text-zinc-500">
              Selecciona una mesa para ver su detalle y ordenar.
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                  {formatMesaFromDoc(selectedMesa)}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                  Zona: {selectedMesa.zona || 'General'}
                </div>
              </div>

              <div className="divide-y divide-gray-100 text-sm dark:divide-zinc-800/80">
                <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <span className="text-gray-500 dark:text-zinc-500">Estado</span>
                  <StatusTag ui={selectedMesaStatusUi} />
                </div>
                <div className="flex justify-between gap-3 py-2.5">
                  <span className="text-gray-500 dark:text-zinc-500">Capacidad</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{selectedMesa.capacidad || 'N/D'}</span>
                </div>
                <div className="flex justify-between gap-3 py-2.5 last:pb-0">
                  <span className="text-gray-500 dark:text-zinc-500">Cuenta activa</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">
                    {selectedMesa.cuentaActivaId ? 'Si' : 'No'}
                  </span>
                </div>
              </div>

              {selectedMesa.estadoMesa === 'ocupada' && selectedMesa.cuentaActivaId && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarEstadoMesa(selectedMesa, 'esperandoCuenta')}
                    disabled={updatingMesaId === selectedMesa.id}
                    className="w-full btn btn-lg border-0 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <ArrowRightCircleIcon className="w-5 h-5" />
                    {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Pasar a lista para pagar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarEstadoMesa(selectedMesa, 'porLimpiar')}
                    disabled={updatingMesaId === selectedMesa.id}
                    className="w-full btn btn-lg border-0 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Por limpiar'}
                  </button>
                </div>
              )}

              {selectedMesa.estadoMesa === 'porLimpiar' && selectedMesa.cuentaActivaId && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarEstadoMesa(selectedMesa, 'esperandoCuenta')}
                    disabled={updatingMesaId === selectedMesa.id}
                    className="w-full btn btn-lg border-0 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <ArrowRightCircleIcon className="w-5 h-5" />
                    {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Pasar a lista para pagar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarEstadoMesa(selectedMesa, 'ocupada')}
                    disabled={updatingMesaId === selectedMesa.id}
                    className="w-full btn btn-lg border-0 bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    <ArrowRightCircleIcon className="w-5 h-5" />
                    {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Volver a ocupada'}
                  </button>
                </div>
              )}

              {selectedMesa.estadoMesa === 'porLimpiar' && !selectedMesa.cuentaActivaId && (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30 p-3 text-xs text-violet-800 dark:text-violet-200">
                    Cuenta cobrada. Marca la mesa como libre cuando esté lista.
                  </div>
                  <button
                    type="button"
                    onClick={() => aplicarEstadoMesa(selectedMesa, 'libre')}
                    disabled={updatingMesaId === selectedMesa.id}
                    className="w-full btn btn-lg border-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Marcar como libre'}
                  </button>
                </div>
              )}

              {selectedMesa.estadoMesa === 'esperandoCuenta' && (
                <button
                  type="button"
                  onClick={() => aplicarEstadoMesa(selectedMesa, 'ocupada')}
                  disabled={updatingMesaId === selectedMesa.id}
                  className="w-full btn btn-lg border-0 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  <ArrowRightCircleIcon className="w-5 h-5" />
                  {updatingMesaId === selectedMesa.id ? 'Actualizando...' : 'Volver a ocupada'}
                </button>
              )}

              {selectedMesa.estadoMesa === 'ocupada' && !selectedMesa.cuentaActivaId && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Esta mesa no tiene pedido activo aun. La opcion "Lista para pagar" se habilita cuando exista una cuenta activa.
                </div>
              )}

              <button
                onClick={() => openOrderingModal(selectedMesa)}
                className="w-full btn btn-lg bg-cyan-600 hover:bg-cyan-700 border-0 text-white"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                {selectedMesa.cuentaActivaId ? 'Agregar al pedido' : 'Ordenar'}
              </button>
            </div>
          )}
        </aside>
      </div>

      {deliveryModalOrder && (
        <ModalPortal overlayClassName="p-4 md:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-zinc-900 dark:shadow-black/50">
            <div className="flex items-center justify-between border-b border-gray-200 bg-emerald-700 px-4 py-3 text-white dark:border-zinc-800 dark:bg-emerald-900/90">
              <div>
                <div className="text-lg font-bold">Entregar pedido {deliveryModalOrder.displayId}</div>
                <div className="text-sm text-emerald-100 dark:text-emerald-200/90">{deliveryModalOrder.mesaLabel}</div>
              </div>
              <button
                type="button"
                onClick={closeDeliveryModal}
                disabled={deliveringOrderId === deliveryModalOrder.id}
                className="btn btn-sm btn-ghost text-white"
              >
                <XMarkIcon className="h-5 w-5" />
                Cerrar
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-3 overflow-y-auto p-4">
              {deliveryLines.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-500">Sin items listos para entregar.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-zinc-400">
                      Seleccionados: <span className="font-semibold">{selectedDeliveryLineIds.length}</span> de{' '}
                      <span className="font-semibold">{deliveryLines.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllDeliveryLines}
                        className="btn btn-xs btn-outline"
                        type="button"
                      >
                        Seleccionar todo
                      </button>
                      <button
                        onClick={clearDeliverySelection}
                        className="btn btn-xs btn-ghost"
                        type="button"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {deliveryLines.map((line) => {
                    const isSelected = selectedDeliveryLineIds.includes(line.id)
                    return (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => toggleDeliveryLine(line.id)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? 'border-emerald-400/80 bg-emerald-50 dark:border-emerald-500/45 dark:bg-emerald-950/35'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100">{line.name}</div>
                            <div className="text-sm text-gray-600 dark:text-zinc-500">Cantidad: x{line.qty}</div>
                            {line.note && (
                              <div className="mt-1 rounded border border-amber-200/90 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                                {line.note}
                              </div>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            readOnly
                            checked={isSelected}
                            className="checkbox checkbox-success mt-1 pointer-events-none"
                          />
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
              <button
                type="button"
                onClick={confirmDelivery}
                disabled={deliveringOrderId === deliveryModalOrder.id}
                className="btn btn-lg w-full border-0 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircleIcon className="h-5 w-5" />
                {deliveringOrderId === deliveryModalOrder.id ? 'Guardando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {pendingRemovalItem && (
        <ModalPortal overlayClassName="p-4 md:p-6">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-zinc-900 dark:shadow-black/50">
            <div className="border-b border-gray-200 bg-rose-700 px-4 py-3 text-white dark:border-zinc-800 dark:bg-rose-900/90">
              <div className="text-lg font-bold">Motivo de anulación</div>
              <div className="text-sm text-rose-100">Este ítem está en preparación</div>
            </div>
            <div className="space-y-3 p-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              )}
              <div className="text-sm text-gray-700 dark:text-zinc-300">
                Ingresa el motivo para anular: <span className="font-semibold">{pendingRemovalItem.name}</span>
              </div>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Motivo de anulación"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setPendingRemovalItem(null)
                    setRemovalReason('')
                  }}
                  className="btn btn-sm btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRemovalWithReason}
                  className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-0"
                >
                  Confirmar anulación
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {orderingMesa && (
        <ModalPortal overlayClassName="p-4 md:p-6">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-zinc-900 dark:shadow-black/50">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-900 to-cyan-900 px-4 py-4 text-white md:px-6 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900">
              <div>
                <div className="text-xl font-bold">Ordenar - {formatMesaFromDoc(orderingMesa)}</div>
                <div className="text-sm text-cyan-200 dark:text-zinc-400">Zona: {orderingMesa.zona || 'General'}</div>
              </div>
              <button
                type="button"
                onClick={() => setOrderingMesa(null)}
                className="btn btn-sm btn-ghost text-white"
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

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-3">
              <div className="flex min-h-0 flex-col border-r border-gray-200 p-4 md:p-6 dark:border-zinc-800 lg:col-span-2">
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="input input-bordered w-full pl-10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoria(cat)}
                      className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                        selectedCategoria === cat
                          ? 'bg-cyan-600 text-white dark:bg-cyan-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-sm text-cyan-800 dark:border-cyan-800/50 dark:bg-cyan-950/30 dark:text-cyan-200">
                  Agregando platos para:{' '}
                  <span className="font-semibold">
                    {comensalesPedido.find((c) => c.localId === selectedComensalLocalId)?.alias || 'Comensal 1'}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingProductos ? (
                    <div className="text-sm text-gray-500 dark:text-zinc-500">Cargando productos...</div>
                  ) : productosFiltrados.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-zinc-500">No hay productos para el filtro actual.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {productosFiltrados.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                        >
                          <div className="font-semibold text-gray-800 dark:text-zinc-100">{item.name}</div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{item.categoria}</div>
                          <div className="mt-2 text-lg font-bold text-cyan-700 dark:text-cyan-400">
                            ₡{item.price.toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="btn btn-sm mt-3 w-full border-0 bg-cyan-600 text-white hover:bg-cyan-700"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="flex min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-zinc-950/80">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold uppercase text-gray-700 dark:text-zinc-400">Comensales</div>
                      <button
                        type="button"
                        onClick={addComensalPedido}
                        className="btn btn-md border-0 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {comensalesPedido.map((c, idx) => (
                        <div
                          key={c.localId}
                          className={`rounded-lg border p-2.5 ${
                            selectedComensalLocalId === c.localId
                              ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-950/40'
                              : 'border-gray-200 dark:border-zinc-800 dark:bg-zinc-900/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedComensalLocalId(c.localId)}
                              className={`btn btn-sm min-h-9 h-9 w-9 px-0 ${
                                selectedComensalLocalId === c.localId
                                  ? 'border-0 bg-cyan-600 text-white hover:bg-cyan-700'
                                  : 'btn-ghost border border-gray-200 dark:border-zinc-700'
                              }`}
                            >
                              {idx + 1}
                            </button>
                            <input
                              type="text"
                              value={c.alias}
                              onChange={(e) => updateComensalAlias(c.localId, e.target.value)}
                              className="input input-bordered input-sm min-h-9 h-9 flex-1 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              placeholder={`Comensal ${idx + 1}`}
                            />
                            {comensalesPedido.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeComensalPedido(c.localId)}
                                className="btn btn-ghost btn-sm h-9 min-h-9 w-9 px-0 text-red-600 dark:text-red-400"
                                title="Quitar comensal"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-100 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="border-b border-gray-300 bg-gray-200 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-zinc-200">
                        Pedido actual ({existingItems.length})
                      </div>
                    </div>
                    <div className="space-y-3 p-3">
                      {loadingCuentaData ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-gray-500 dark:text-zinc-500">
                          <span className="loading loading-spinner loading-sm" />
                          Cargando pedido...
                        </div>
                      ) : existingItems.length === 0 ? (
                        <div className="py-2 text-sm text-gray-500 dark:text-zinc-500">Sin items pendientes en la cuenta.</div>
                      ) : (
                        <>
                          {comensalesPedido.map((c, cidx) => {
                            const items = existingItemsByComensal[c.localId] || []
                            if (items.length === 0) return null
                            return (
                              <div key={`existing_${c.localId}`}>
                                <div className="mb-2 border-b border-gray-200 pb-1 text-xs font-bold uppercase text-gray-700 dark:border-zinc-800 dark:text-zinc-400">
                                  {c.alias || `Comensal ${cidx + 1}`}
                                </div>
                                <div className="space-y-2">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/80"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-base font-semibold text-gray-900 dark:text-zinc-100">{item.name}</div>
                                        <div className="mt-0.5 text-sm text-gray-600 dark:text-zinc-500">
                                          x{item.qty} · ₡{Number(item.price || 0).toLocaleString()} c/u
                                        </div>
                                        {editingExistingNoteId === item.cuentaItemId ? (
                                          <div className="mt-2 space-y-2">
                                            <input
                                              type="text"
                                              value={editingExistingNoteValue}
                                              onChange={(e) => setEditingExistingNoteValue(e.target.value)}
                                              className="input input-bordered input-sm w-full"
                                              placeholder="Nota especial para cocina"
                                            />
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => saveExistingItemNote(item)}
                                                disabled={savingExistingNoteId === item.cuentaItemId}
                                                className="btn btn-xs bg-blue-600 hover:bg-blue-700 text-white border-0"
                                              >
                                                {savingExistingNoteId === item.cuentaItemId ? 'Guardando...' : 'Guardar nota'}
                                              </button>
                                              <button
                                                onClick={cancelEditExistingItemNote}
                                                className="btn btn-xs btn-ghost"
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            {item.note && (
                                              <div className="text-sm text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
                                                {item.note}
                                              </div>
                                            )}
                                            {item.canEditNote && (
                                              <button
                                                onClick={() => startEditExistingItemNote(item)}
                                                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
                                              >
                                                <PencilSquareIcon className="w-4 h-4" />
                                                Editar nota
                                              </button>
                                            )}
                                          </>
                                        )}
                                        {!item.canRemove && (
                                          <div className="mt-2 text-xs text-gray-500">
                                            {item.itemStatus === 'listo' || item.itemStatus === 'entregado' || item.prepStatus === 'listo' || item.prepStatus === 'entregado'
                                              ? 'Ítem ya procesado: no editable.'
                                              : 'Ítem no anulable en este estado.'}
                                          </div>
                                        )}
                                      </div>
                                      {item.cuentaItemId && (
                                        <button
                                          onClick={() => removeExistingItem(item)}
                                          disabled={removingItemId === item.cuentaItemId || !item.canRemove}
                                          className={`btn btn-sm min-h-10 h-10 w-10 px-0 shrink-0 ${
                                            item.canRemove
                                              ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
                                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                          }`}
                                          title="Quitar del pedido"
                                        >
                                          {removingItemId === item.cuentaItemId
                                            ? <span className="loading loading-spinner loading-xs" />
                                            : <TrashIcon className="w-5 h-5" />}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          {(existingItemsByComensal.__sin_comensal__ || []).length > 0 && (
                            <div>
                              <div className="mb-2 border-b border-gray-200 pb-1 text-xs font-bold uppercase text-gray-600 dark:border-zinc-800 dark:text-zinc-500">
                                Sin asignar
                              </div>
                              <div className="space-y-2">
                                {(existingItemsByComensal.__sin_comensal__ || []).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/80"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="text-base font-semibold text-gray-900 dark:text-zinc-100">{item.name}</div>
                                      <div className="mt-0.5 text-sm text-gray-600 dark:text-zinc-500">
                                        x{item.qty} · ₡{Number(item.price || 0).toLocaleString()} c/u
                                      </div>
                                      {editingExistingNoteId === item.cuentaItemId ? (
                                        <div className="mt-2 space-y-2">
                                          <input
                                            type="text"
                                            value={editingExistingNoteValue}
                                            onChange={(e) => setEditingExistingNoteValue(e.target.value)}
                                            className="input input-bordered input-sm w-full"
                                            placeholder="Nota especial para cocina"
                                          />
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => saveExistingItemNote(item)}
                                              disabled={savingExistingNoteId === item.cuentaItemId}
                                              className="btn btn-xs bg-blue-600 hover:bg-blue-700 text-white border-0"
                                            >
                                              {savingExistingNoteId === item.cuentaItemId ? 'Guardando...' : 'Guardar nota'}
                                            </button>
                                            <button
                                              onClick={cancelEditExistingItemNote}
                                              className="btn btn-xs btn-ghost"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {item.note && (
                                            <div className="text-sm text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
                                              {item.note}
                                            </div>
                                          )}
                                          {item.canEditNote && (
                                            <button
                                              onClick={() => startEditExistingItemNote(item)}
                                              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
                                            >
                                              <PencilSquareIcon className="w-4 h-4" />
                                              Editar nota
                                            </button>
                                          )}
                                        </>
                                      )}
                                      {!item.canRemove && (
                                        <div className="mt-2 text-xs text-gray-500">
                                          {item.itemStatus === 'listo' || item.itemStatus === 'entregado' || item.prepStatus === 'listo' || item.prepStatus === 'entregado'
                                            ? 'Ítem ya procesado: no editable.'
                                            : 'Ítem no anulable en este estado.'}
                                        </div>
                                      )}
                                    </div>
                                    {item.cuentaItemId && (
                                      <button
                                        onClick={() => removeExistingItem(item)}
                                        disabled={removingItemId === item.cuentaItemId || !item.canRemove}
                                        className={`btn btn-sm min-h-10 h-10 w-10 px-0 shrink-0 ${
                                          item.canRemove
                                            ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
                                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        }`}
                                        title="Quitar del pedido"
                                      >
                                        {removingItemId === item.cuentaItemId
                                          ? <span className="loading loading-spinner loading-xs" />
                                          : <TrashIcon className="w-5 h-5" />}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {existingOrderNotes && (
                      <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/35">
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <span className="font-semibold">Nota general:</span> {existingOrderNotes}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold uppercase text-gray-700 dark:text-zinc-400">
                      Nuevos items ({cart.length})
                    </div>
                    <div className="space-y-2">
                      {cart.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-zinc-500">Sin items nuevos.</div>
                      ) : (
                        cart.map((item) => (
                          <div
                            key={item.lineId}
                            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/80"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-base font-medium text-gray-800 dark:text-zinc-100">{item.name}</div>
                                <div className="text-sm text-gray-500 dark:text-zinc-500">
                                  ₡{Number(item.price || 0).toLocaleString()} c/u
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(item.lineId, -1)} className="btn btn-sm btn-ghost min-h-10 h-10 w-10 px-0">
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <span className="text-base font-semibold w-8 text-center">{item.qty}</span>
                                <button onClick={() => updateQty(item.lineId, 1)} className="btn btn-sm btn-ghost min-h-10 h-10 w-10 px-0">
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => removeItem(item.lineId)} className="btn btn-sm btn-ghost text-red-600 min-h-10 h-10 w-10 px-0">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <select
                              value={item.comensalLocalId || ''}
                              onChange={(e) => updateItemComensal(item.lineId, e.target.value)}
                              className="select select-bordered select-sm mt-2 h-9 min-h-9 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            >
                              {comensalesPedido.map((c, idx) => (
                                <option key={c.localId} value={c.localId}>
                                  {c.alias || `Comensal ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.notaEspecial || ''}
                              onChange={(e) => updateNotaItem(item.lineId, e.target.value)}
                              placeholder="Nota especial para cocina (opcional)"
                              className="input input-bordered input-sm mt-2 h-9 min-h-9 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-zinc-800">
                    <div className="flex justify-between text-sm text-gray-700 dark:text-zinc-400">
                      <span>Subtotal</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">₡{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700 dark:text-zinc-400">
                      <span>IVA (13%)</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">₡{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between rounded border border-gray-200 bg-white p-2.5 text-base font-bold text-gray-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100">
                      <span>Total</span>
                      <span className="text-cyan-700 dark:text-cyan-400">₡{total.toLocaleString()}</span>
                    </div>
                    <textarea
                      value={notasPedido}
                      onChange={(e) => setNotasPedido(e.target.value)}
                      className="textarea textarea-bordered min-h-[48px] w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Notas generales del pedido (opcional)"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/90 md:px-5">
                  <button
                    type="button"
                    onClick={enviarPedidoCocina}
                    disabled={sendingPedido || cart.length === 0}
                    className="btn btn-lg w-full border-0 bg-cyan-600 text-base text-white hover:bg-cyan-700"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    {sendingPedido ? 'Enviando...' : 'Enviar a cocina'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
