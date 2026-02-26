import { createContext, useEffect, useMemo, useState } from 'react'
import { onPedidosChange, updatePedido } from '@shared/firebase/firestore'

export const OrdersContext = createContext()

const ACTIVE_STATUS = new Set(['pendiente', 'enPreparacion', 'listo'])

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
  return 'pendiente'
}

function mapPedidoToOrder(pedido) {
  const createdAtMs = toMillis(pedido.createdAt || pedido.timestamp)
  const rawItems = Array.isArray(pedido.items) ? pedido.items : []
  const items = rawItems.map((item, idx) => ({
    id: item.id || `${pedido.id}_item_${idx}`,
    name: item.nombreSnapshot || item.name || item.productoId || 'Producto',
    qty: Number(item.cantidad || item.qty || 1),
    note: String(item.notaEspecial || '').trim(),
  }))

  const mesaNumero = Number(pedido.mesaNumero || 0)
  const mesaId = String(pedido.mesaId || '').trim()
  const mesaLabel = mesaNumero > 0 ? String(mesaNumero) : 'S/N'
  const mesaMeta = mesaNumero > 0 ? `Mesa ${mesaNumero}` : 'Mesa'

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
    notes: String(pedido.notasPedido || '').trim(),
    createdAtMs,
  }
}

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([])
  const [updatingOrderIds, setUpdatingOrderIds] = useState({})

  useEffect(() => {
    const unsubscribe = onPedidosChange((pedidos) => {
      const mapped = (pedidos || [])
        .map(mapPedidoToOrder)
        .filter((order) => ACTIVE_STATUS.has(order.status))
        // Evita mostrar pedidos legacy/mock que no pertenecen al flujo mesa->cuenta actual.
        .filter((order) => Boolean(order.mesaId) && Boolean(order.cuentaId))
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
      setOrders(mapped)
    })

    return () => unsubscribe()
  }, [])

  const updateStatus = async (id, newStatus) => {
    const normalized = normalizeStatus(newStatus)
    const now = new Date()
    const extraFields =
      normalized === 'enPreparacion'
        ? { startedAt: now }
        : normalized === 'listo'
          ? { listoAt: now }
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

  const removeOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  const pendingCount = useMemo(() => orders.filter(o => o.status === 'pendiente').length, [orders])
  const preparingCount = useMemo(() => orders.filter(o => o.status === 'enPreparacion').length, [orders])
  const readyCount = useMemo(() => orders.filter(o => o.status === 'listo').length, [orders])

  const value = {
    orders,
    updateStatus,
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
