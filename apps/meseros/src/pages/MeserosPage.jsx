import { useEffect, useMemo, useState } from 'react'
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
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowRightCircleIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

import { db } from '@shared/firebase/firebase'
import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'
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
  return 'libre'
}

function getStatusUI(status) {
  if (status === 'ocupada') {
    return {
      label: 'Ocupada',
      cardClass: 'bg-blue-50 border-blue-300',
      textClass: 'text-blue-700',
      icon: UserGroupIcon,
    }
  }
  if (status === 'esperandoCuenta') {
    return {
      label: 'Lista para pagar',
      cardClass: 'bg-amber-50 border-amber-300',
      textClass: 'text-amber-700',
      icon: ClockIcon,
    }
  }
  return {
    label: 'Libre',
    cardClass: 'bg-green-50 border-green-300',
    textClass: 'text-green-700',
    icon: CheckCircleIcon,
  }
}

function MesaCard({ mesa, selected, onSelect }) {
  const ui = getStatusUI(mesa.estadoMesa)
  const StatusIcon = ui.icon
  return (
    <button
      onClick={() => onSelect(mesa)}
      className={`border-2 rounded-xl p-4 text-left transition min-h-[138px] ${
        ui.cardClass
      } ${selected ? 'ring-4 ring-cyan-500 shadow-lg' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-gray-900">Mesa {mesa.numero ?? mesa.id}</div>
          <div className="text-xs text-gray-600 mt-1">
            Capacidad: {Number(mesa.capacidad || 0) || 'N/D'} | Zona: {mesa.zona || 'General'}
          </div>
        </div>
        <StatusIcon className={`w-6 h-6 ${ui.textClass}`} />
      </div>
      <div className={`text-xs font-semibold mt-3 ${ui.textClass}`}>{ui.label}</div>
      <div className="text-xs text-gray-600 mt-2">Tocar para ver detalle</div>
    </button>
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
  if (pedido.mesaNumero != null && Number(pedido.mesaNumero) > 0) return String(Number(pedido.mesaNumero))
  const mesaId = String(pedido.mesaId || '').trim()
  if (!mesaId) return 'S/N'
  const mesa = (mesas || []).find((m) => String(m.id) === mesaId)
  if (!mesa) return mesaId
  if (mesa.numero != null && Number(mesa.numero) > 0) return String(Number(mesa.numero))
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
  const [filterEstado, setFilterEstado] = useState('todos')
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

  const filteredMesas = useMemo(() => {
    if (filterEstado === 'todos') return mesas
    return mesas.filter((m) => m.estadoMesa === filterEstado)
  }, [mesas, filterEstado])

  const selectedMesa = useMemo(
    () => mesas.find((m) => m.id === selectedMesaId) || null,
    [mesas, selectedMesaId]
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

  async function toggleSolicitarCuenta(mesa) {
    if (!mesa?.id || updatingMesaId) return
    const estadoActual = mesa.estadoMesa
    const tienePedidoActivo = Boolean(mesa.cuentaActivaId)
    const puedeMarcarListaPagar = estadoActual === 'ocupada' && tienePedidoActivo
    const puedeQuitarListaPagar = estadoActual === 'esperandoCuenta'

    if (!puedeMarcarListaPagar && !puedeQuitarListaPagar) {
      setError('Solo puedes marcar lista para pagar en mesas ocupadas con pedido activo.')
      return
    }

    setUpdatingMesaId(mesa.id)
    try {
      const nextEstado = mesa.estadoMesa === 'esperandoCuenta' ? 'ocupada' : 'esperandoCuenta'
      await updateDoc(doc(db, 'mesas', mesa.id), {
        estadoMesa: nextEstado,
        estado: nextEstado, // compatibilidad con datos antiguos
        updatedAt: new Date(),
      })
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

      setSuccess(`Pedido enviado a cocina para Mesa ${orderingMesa.numero ?? orderingMesa.id}.`)
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
    return <div className="text-sm text-gray-600">Cargando permisos...</div>
  }

  if (!isMesero && !isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
        No tienes permisos para acceder al estado de mesas.
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TableCellsIcon className="w-8 h-8" />
          Estado de mesas
        </h1>
        <p className="text-blue-200 mt-2">Visualizacion en tiempo real para organizacion de atencion</p>
      </div>

      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
        <div className="text-sm text-gray-700">
          Total mesas: <span className="font-bold">{mesas.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="todos">Todos</option>
            <option value="libre">Libres</option>
            <option value="ocupada">Ocupadas</option>
            <option value="esperandoCuenta">Lista para pagar</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Pedidos listos para entregar</h2>
          <span className="badge badge-info badge-sm">{readyOrders.length}</span>
        </div>

        {loadingReadyOrders ? (
          <div className="text-sm text-gray-500">Cargando pedidos listos...</div>
        ) : readyOrders.length === 0 ? (
          <div className="text-sm text-gray-500">No hay pedidos listos por entregar.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-gray-900 truncate">Pedido {order.displayId}</div>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    Listo
                  </span>
                </div>
                <div className="text-sm text-gray-700">Mesa {order.mesaLabel}</div>
                <div className="text-xs text-gray-600">{order.items.length} item(s) pendientes de entrega</div>
                <button
                  onClick={() => openDeliveryModal(order)}
                  className="w-full btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                  Entregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && !deliveryModalOrder && !orderingMesa && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loadingMesas ? (
            <div className="text-sm text-gray-600">Cargando mesas...</div>
          ) : filteredMesas.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              No hay mesas para el filtro seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMesas.map((mesa) => (
                <MesaCard
                  key={mesa.id}
                  mesa={mesa}
                  selected={selectedMesaId === mesa.id}
                  onSelect={(m) => setSelectedMesaId(m.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="bg-white border border-gray-200 rounded-lg shadow-lg h-fit sticky top-4">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h2 className="font-bold text-gray-900 text-lg">Detalle de mesa</h2>
          </div>

          {!selectedMesa ? (
            <div className="p-5 text-sm text-gray-500">Selecciona una mesa para ver su detalle y ordenar.</div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">Mesa {selectedMesa.numero ?? selectedMesa.id}</div>
                <div className="text-sm text-gray-600 mt-1">Zona: {selectedMesa.zona || 'General'}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <span className="font-semibold">{getStatusUI(selectedMesa.estadoMesa).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacidad</span>
                  <span className="font-semibold">{selectedMesa.capacidad || 'N/D'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cuenta activa</span>
                  <span className="font-semibold">{selectedMesa.cuentaActivaId ? 'Si' : 'No'}</span>
                </div>
              </div>

              {(selectedMesa.estadoMesa === 'esperandoCuenta' ||
                (selectedMesa.estadoMesa === 'ocupada' && selectedMesa.cuentaActivaId)) && (
                <button
                  onClick={() => toggleSolicitarCuenta(selectedMesa)}
                  disabled={updatingMesaId === selectedMesa.id}
                  className={`w-full btn btn-lg border-0 text-white ${
                    selectedMesa.estadoMesa === 'esperandoCuenta'
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <ArrowRightCircleIcon className="w-5 h-5" />
                  {updatingMesaId === selectedMesa.id
                    ? 'Actualizando...'
                    : selectedMesa.estadoMesa === 'esperandoCuenta'
                      ? 'Volver a ocupada'
                      : 'Pasar a lista para pagar'}
                </button>
              )}

              {selectedMesa.estadoMesa === 'ocupada' && !selectedMesa.cuentaActivaId && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-emerald-700 text-white flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Entregar pedido {deliveryModalOrder.displayId}</div>
                <div className="text-sm text-emerald-100">Mesa {deliveryModalOrder.mesaLabel}</div>
              </div>
              <button
                onClick={closeDeliveryModal}
                disabled={deliveringOrderId === deliveryModalOrder.id}
                className="btn btn-sm btn-ghost text-white"
              >
                <XMarkIcon className="w-5 h-5" />
                Cerrar
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 overflow-y-auto space-y-3">
              {deliveryLines.length === 0 ? (
                <div className="text-sm text-gray-500">Sin items listos para entregar.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
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
                        className={`w-full text-left border rounded-lg p-3 transition ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">{line.name}</div>
                            <div className="text-sm text-gray-600">Cantidad: x{line.qty}</div>
                            {line.note && (
                              <div className="mt-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1">
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

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={confirmDelivery}
                disabled={deliveringOrderId === deliveryModalOrder.id}
                className="w-full btn btn-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {deliveringOrderId === deliveryModalOrder.id ? 'Guardando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {pendingRemovalItem && (
        <ModalPortal overlayClassName="p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-rose-700 text-white">
              <div className="font-bold text-lg">Motivo de anulación</div>
              <div className="text-sm text-rose-100">Este ítem está en preparación</div>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}
              <div className="text-sm text-gray-700">
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
          <div className="bg-white rounded-lg shadow-2xl w-full h-full overflow-hidden flex flex-col">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-900 to-cyan-900 text-white">
              <div>
                <div className="text-xl font-bold">Ordenar - Mesa {orderingMesa.numero ?? orderingMesa.id}</div>
                <div className="text-sm text-cyan-200">Zona: {orderingMesa.zona || 'General'}</div>
              </div>
              <button
                onClick={() => setOrderingMesa(null)}
                className="btn btn-sm btn-ghost text-white"
              >
                <XMarkIcon className="w-5 h-5" />
                Cerrar
              </button>
            </div>

            {error && (
              <div className="mx-4 md:mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="lg:col-span-2 p-4 md:p-6 border-r border-gray-200 flex flex-col min-h-0">
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="input input-bordered w-full pl-10"
                  />
                </div>

                <div className="flex gap-2 flex-wrap mb-3">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoria(cat)}
                      className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                        selectedCategoria === cat
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="mb-3 text-sm text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-lg p-2">
                  Agregando platos para:{' '}
                  <span className="font-semibold">
                    {comensalesPedido.find((c) => c.localId === selectedComensalLocalId)?.alias || 'Comensal 1'}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  {loadingProductos ? (
                    <div className="text-sm text-gray-500">Cargando productos...</div>
                  ) : productosFiltrados.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay productos para el filtro actual.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {productosFiltrados.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="font-semibold text-gray-800">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.categoria}</div>
                          <div className="text-lg font-bold text-cyan-700 mt-2">₡{item.price.toLocaleString()}</div>
                          <button
                            onClick={() => addToCart(item)}
                            className="mt-3 w-full btn btn-sm bg-cyan-600 hover:bg-cyan-700 text-white border-0"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-gray-50 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700 uppercase">Comensales</div>
                      <button
                        onClick={addComensalPedido}
                        className="btn btn-md bg-blue-600 hover:bg-blue-700 border-0 text-white"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {comensalesPedido.map((c, idx) => (
                        <div
                          key={c.localId}
                          className={`bg-white border-2 rounded-lg p-2.5 ${
                            selectedComensalLocalId === c.localId ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedComensalLocalId(c.localId)}
                              className={`btn btn-sm min-h-9 h-9 w-9 px-0 ${
                                selectedComensalLocalId === c.localId
                                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-0'
                                  : 'btn-ghost border border-gray-200'
                              }`}
                            >
                              {idx + 1}
                            </button>
                            <input
                              type="text"
                              value={c.alias}
                              onChange={(e) => updateComensalAlias(c.localId, e.target.value)}
                              className="input input-bordered input-sm flex-1 min-h-9 h-9"
                              placeholder={`Comensal ${idx + 1}`}
                            />
                            {comensalesPedido.length > 1 && (
                              <button
                                onClick={() => removeComensalPedido(c.localId)}
                                className="btn btn-sm btn-ghost text-red-600 min-h-9 h-9 w-9 px-0"
                                title="Quitar comensal"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden">
                    <div className="px-3 py-2.5 bg-gray-200 border-b border-gray-300">
                      <div className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Pedido actual ({existingItems.length})
                      </div>
                    </div>
                    <div className="p-3 space-y-3">
                      {loadingCuentaData ? (
                        <div className="text-sm text-gray-500 py-3 flex items-center gap-2">
                          <span className="loading loading-spinner loading-sm" />
                          Cargando pedido...
                        </div>
                      ) : existingItems.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">Sin items pendientes en la cuenta.</div>
                      ) : (
                        <>
                          {comensalesPedido.map((c, cidx) => {
                            const items = existingItemsByComensal[c.localId] || []
                            if (items.length === 0) return null
                            return (
                              <div key={`existing_${c.localId}`}>
                                <div className="text-xs font-bold text-gray-700 uppercase mb-2 pb-1 border-b border-gray-200">
                                  {c.alias || `Comensal ${cidx + 1}`}
                                </div>
                                <div className="space-y-2">
                                  {items.map((item) => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-base font-semibold text-gray-900">{item.name}</div>
                                        <div className="text-sm text-gray-600 mt-0.5">
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
                              <div className="text-xs font-bold text-gray-600 uppercase mb-2 pb-1 border-b border-gray-200">
                                Sin asignar
                              </div>
                              <div className="space-y-2">
                                {(existingItemsByComensal.__sin_comensal__ || []).map((item) => (
                                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-base font-semibold text-gray-900">{item.name}</div>
                                      <div className="text-sm text-gray-600 mt-0.5">
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
                      <div className="px-3 py-2 bg-amber-50 border-t border-amber-200">
                        <div className="text-sm text-amber-800">
                          <span className="font-semibold">Nota general:</span> {existingOrderNotes}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-700 uppercase mb-2">Nuevos items ({cart.length})</div>
                    <div className="space-y-2">
                      {cart.length === 0 ? (
                        <div className="text-sm text-gray-500">Sin items nuevos.</div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.lineId} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-base font-medium text-gray-800">{item.name}</div>
                                <div className="text-sm text-gray-500">₡{Number(item.price || 0).toLocaleString()} c/u</div>
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
                              className="select select-bordered select-sm w-full mt-2 min-h-9 h-9"
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
                              className="input input-bordered input-sm w-full mt-2 min-h-9 h-9"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-gray-200 pt-3">
                    <div className="text-sm text-gray-700 flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold">₡{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-700 flex justify-between">
                      <span>IVA (13%)</span>
                      <span className="font-semibold">₡{tax.toLocaleString()}</span>
                    </div>
                    <div className="text-base font-bold text-gray-900 flex justify-between bg-white border border-gray-200 rounded p-2.5">
                      <span>Total</span>
                      <span className="text-cyan-700">₡{total.toLocaleString()}</span>
                    </div>
                    <textarea
                      value={notasPedido}
                      onChange={(e) => setNotasPedido(e.target.value)}
                      className="textarea textarea-bordered w-full min-h-[48px]"
                      placeholder="Notas generales del pedido (opcional)"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="shrink-0 px-4 md:px-5 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={enviarPedidoCocina}
                    disabled={sendingPedido || cart.length === 0}
                    className="w-full btn btn-lg bg-cyan-600 hover:bg-cyan-700 border-0 text-white text-base"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
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
