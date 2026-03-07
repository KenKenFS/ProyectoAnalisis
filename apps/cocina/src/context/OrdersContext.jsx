import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { getMesas, onPedidosChange, updatePedido } from '@shared/firebase/firestore'

export const OrdersContext = createContext()

const ACTIVE_STATUS = new Set(['pendiente', 'enPreparacion', 'listo'])
const FINAL_STATUS = 'finalizado'

function toMillis(rawDate) {
  if (!rawDate) return Date.now()
  if (typeof rawDate?.toDate === 'function') return rawDate.toDate().getTime()
  const value = new Date(rawDate).getTime()
  return Number.isFinite(value) ? value : Date.now()
}

function normalizeStatus(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase()
  if (value === 'pendiente' || value === 'pending') return 'pendiente'
  if (value === 'enpreparacion' || value === 'en_preparacion' || value === 'preparing') {
    return 'enPreparacion'
  }
  if (value === 'listo' || value === 'ready') return 'listo'
  if (value === 'entregado' || value === 'delivered') return 'entregado'
  if (value === 'finalizado' || value === 'finalized' || value === 'completed') return FINAL_STATUS
  return 'pendiente'
}

function parseQtyAndNameFromText(text) {
  const raw = String(text || '').trim()
  if (!raw) return { name: 'Platillo', qty: 1 }

  const match = raw.match(/^(\d+)\s*x\s+(.+)$/i)
  if (!match) return { name: raw, qty: 1 }

  return {
    qty: Number(match[1]) || 1,
    name: match[2].trim() || 'Platillo',
  }
}

function getItemName(item) {
  return (
    item?.name ||
    item?.nombre ||
    item?.nombreSnapshot ||
    item?.productoNombre ||
    item?.plato ||
    item?.descripcion ||
    item?.producto?.name ||
    item?.producto?.nombre ||
    item?.producto?.nombreSnapshot ||
    item?.detalle?.name ||
    item?.detalle?.nombre ||
    null
  )
}

function normalizeItem(item, index, pedidoId) {
  if (typeof item === 'string') {
    const parsed = parseQtyAndNameFromText(item)
    return {
      id: `${pedidoId}_item_${index}`,
      name: parsed.name,
      qty: parsed.qty,
      note: '',
      isNew: false,
    }
  }

  const qty = Number(
    item?.qty ??
      item?.cantidad ??
      item?.cant ??
      item?.quantity ??
      item?.unidades ??
      1
  )
  const resolvedName = getItemName(item)

  return {
    id: item?.id || `${pedidoId}_item_${index}`,
    name: resolvedName ? String(resolvedName).trim() : 'Platillo',
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    note: String(item?.notaEspecial || item?.nota || '').trim(),
    isNew: Boolean(item?.esNuevoCocina || item?.isNew || item?.nuevo),
  }
}

function getOrderItems(pedido) {
  const candidates = [
    pedido.items,
    pedido.productos,
    pedido.detalle,
    pedido.detalles,
    pedido.platillos,
    pedido.lineas,
  ]

  const source = candidates.find(Array.isArray)
  if (!source) return []

  return source.map((item, index) => normalizeItem(item, index, pedido.id))
}

function getTableLabel(pedido, mesasById, mesasByCuentaId) {
  const isVentaDirecta = String(pedido.origenPedido || '').trim().toLowerCase() === 'venta_directa'
    || String(pedido.tipoPedido || '').trim().toLowerCase() === 'para_llevar'
  if (isVentaDirecta) return 'LV'

  if (pedido.mesaNumero != null && Number(pedido.mesaNumero) > 0) {
    return String(Number(pedido.mesaNumero))
  }
  if (pedido.table != null) return String(pedido.table)
  if (pedido.numeroMesa != null) return String(pedido.numeroMesa)
  if (pedido.nombreMesa) return String(pedido.nombreMesa)
  if (pedido.mesaNombre) return String(pedido.mesaNombre)

  const mesaId = String(pedido.mesaId || pedido.tableId || pedido.mesaRefId || '').trim()
  if (mesaId && mesasById[mesaId]) {
    return String(mesasById[mesaId].numero || mesasById[mesaId].nombre || mesasById[mesaId].alias || 'S/N')
  }

  const cuentaId = String(pedido.cuentaId || pedido.accountId || '').trim()
  if (cuentaId && mesasByCuentaId[cuentaId]) {
    const mesa = mesasByCuentaId[cuentaId]
    return String(mesa.numero || mesa.nombre || mesa.alias || 'S/N')
  }

  return 'S/N'
}

function mapPedidoToOrder(pedido, mesasById, mesasByCuentaId) {
  const createdAtMs = toMillis(pedido.createdAt || pedido.timestamp)
  const items = getOrderItems(pedido)
  const previousItems = (pedido.itemsPrevios || []).map((item, index) =>
    normalizeItem(item, index, pedido.id + '_prev')
  )

  const mesaId = String(pedido.mesaId || '').trim()
  const mesaLabel = getTableLabel(pedido, mesasById, mesasByCuentaId)
  const isDirectSaleOrder = String(pedido.origenPedido || '').trim().toLowerCase() === 'venta_directa'
    || String(pedido.tipoPedido || '').trim().toLowerCase() === 'para_llevar'
  const mesaMeta = isDirectSaleOrder
    ? 'Para llevar'
    : (mesaLabel !== 'S/N' ? `Mesa ${mesaLabel}` : 'Mesa')
  const listoAtMs = toMillis(pedido.listoAt || pedido.readyAt || pedido.updatedAt || pedido.timestamp)
  const finalizedAtMs = pedido.finalizedAt ? toMillis(pedido.finalizedAt) : null
  const lastUpdateMs = toMillis(pedido.ultimaActualizacionPedidoAt || pedido.updatedAt || pedido.timestamp)
  const updatesCount = Number(pedido.actualizacionesCount || 0)
  const wasUpdated = Boolean(pedido.pedidoActualizado) || updatesCount > 0

  return {
    id: pedido.id,
    shortId: String(pedido.id || '').slice(0, 8),
    pedidoId: pedido.id,
    cuentaId: pedido.cuentaId || '',
    mesaId,
    table: mesaLabel,
    mesaMeta,
    status: normalizeStatus(pedido.estadoPedido || pedido.estado),
    items,
    previousItems,
    allItems: [...previousItems, ...items],
    notes: String(pedido.notasPedido || '').trim(),
    createdAtMs,
    listoAtMs,
    finalizedAtMs,
    lastUpdateMs,
    wasUpdated,
    updatesCount,
    rawCode: pedido.codigoPedido || pedido.codigo || pedido.numeroOrden || pedido.orderCode || null,
    isDirectSaleOrder,
    raw: pedido,
  }
}

export function OrdersProvider({ children }) {
  const [allOrders, setAllOrders] = useState([])
  const [mesasById, setMesasById] = useState({})
  const [mesasByCuentaId, setMesasByCuentaId] = useState({})
  const [updatingOrderIds, setUpdatingOrderIds] = useState({})
  const autoFinalizingRef = useRef(new Set())

  useEffect(() => {
    let isMounted = true

    async function loadMesas() {
      try {
        const mesas = await getMesas()
        if (!isMounted) return

        const byId = {}
        const byCuenta = {}

        mesas.forEach((mesa) => {
          byId[mesa.id] = mesa
          if (mesa.cuentaActivaId) {
            byCuenta[mesa.cuentaActivaId] = mesa
          }
        })

        setMesasById(byId)
        setMesasByCuentaId(byCuenta)
      } catch {
        if (!isMounted) return
        setMesasById({})
        setMesasByCuentaId({})
      }
    }

    loadMesas()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onPedidosChange((pedidos) => {
      const mapped = (pedidos || [])
        .map((pedido) => mapPedidoToOrder(pedido, mesasById, mesasByCuentaId))
        .filter((order) => {
          if (!order.cuentaId) return false
          if (order.isDirectSaleOrder) return true
          return Boolean(order.mesaId)
        })
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .map((order, index) => ({
          ...order,
          displayId: order.rawCode || `ORD-${String(index + 1).padStart(3, '0')}`,
        }))
      setAllOrders(mapped)
    })

    return () => unsubscribe()
  }, [mesasById, mesasByCuentaId])

  const orders = useMemo(
    () => allOrders.filter((order) => ACTIVE_STATUS.has(order.status)),
    [allOrders]
  )

  const historyOrders = useMemo(
    () =>
      allOrders
        .filter((order) => order.status === FINAL_STATUS)
        .sort((a, b) => (b.finalizedAtMs || 0) - (a.finalizedAtMs || 0)),
    [allOrders]
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const toFinalize = orders.filter(
        (order) =>
          order.status === 'listo' &&
          now - order.listoAtMs >= 60000 &&
          !autoFinalizingRef.current.has(order.id)
      )

      toFinalize.forEach((order) => {
        autoFinalizingRef.current.add(order.id)
        updatePedido(order.id, {
          estado: FINAL_STATUS,
          estadoPedido: FINAL_STATUS,
          estadoEntrega: 'pendiente',
          finalizedAt: new Date(),
        }).finally(() => {
          autoFinalizingRef.current.delete(order.id)
        })
      })
    }, 5000)

    return () => clearInterval(timer)
  }, [orders])

  const updateStatus = async (id, newStatus) => {
    const normalized = normalizeStatus(newStatus)
    const now = new Date()
    const currentOrder = allOrders.find((o) => o.id === id)
    const existingPendingDelivery = Array.isArray(currentOrder?.raw?.itemsPendientesEntrega)
      ? currentOrder.raw.itemsPendientesEntrega
      : []
    const currentBatchForDelivery = (currentOrder?.items || []).map((item) => ({
      nombreSnapshot: item.name,
      cantidad: Number(item.qty || 1),
      notaEspecial: String(item.note || '').trim(),
    }))
    const nextPendingDelivery =
      normalized === 'listo'
        ? [...existingPendingDelivery, ...currentBatchForDelivery]
        : existingPendingDelivery
    const extraFields =
      normalized === 'enPreparacion'
        ? { startedAt: now }
        : normalized === 'listo'
          ? {
            listoAt: now,
            readyAt: now,
            finalizedAt: null,
            estadoEntrega: 'pendiente',
            entregadoAt: null,
            itemsPendientesEntrega: nextPendingDelivery,
          }
        : normalized === FINAL_STATUS
          ? { finalizedAt: now, estadoEntrega: 'pendiente' }
          : {}

    setUpdatingOrderIds((prev) => ({ ...prev, [id]: true }))
    try {
      await updatePedido(id, {
        estado: normalized,
        estadoPedido: normalized,
        ...extraFields,
      })
    } finally {
      setUpdatingOrderIds((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
    }
  }

  const finalizeOrder = async (id) => {
    setUpdatingOrderIds((prev) => ({ ...prev, [id]: true }))
    try {
      await updatePedido(id, {
        estado: FINAL_STATUS,
        estadoPedido: FINAL_STATUS,
        estadoEntrega: 'pendiente',
        finalizedAt: new Date(),
      })
    } finally {
      setUpdatingOrderIds((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
    }
  }

  const removeOrder = () => {
    // Conservado por compatibilidad con componentes existentes.
  }

  const pendingCount = useMemo(() => orders.filter(o => o.status === 'pendiente').length, [orders])
  const preparingCount = useMemo(() => orders.filter(o => o.status === 'enPreparacion').length, [orders])
  const readyCount = useMemo(() => orders.filter(o => o.status === 'listo').length, [orders])

  const value = {
    orders,
    historyOrders,
    updateStatus,
    finalizeOrder,
    removeOrder,
    updatingOrderIds,
    pendingCount,
    preparingCount,
    readyCount,
  }

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  )
}
