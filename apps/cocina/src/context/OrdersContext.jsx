import { createContext, useState } from 'react'

export const OrdersContext = createContext()

const initialOrders = [
  {
    id: 'ORD-001',
    table: 3,
    items: [
      { name: 'Ceviche Mixto', qty: 2 },
      { name: 'Coca Cola', qty: 2 },
    ],
    status: 'ready',
    time: '14:32',
    createdAt: Date.now() - 120000, // 2 minutes ago
  },
  {
    id: 'ORD-002',
    table: 1,
    items: [
      { name: 'Limonada', qty: 2 },
      { name: 'Ceviche Pescado', qty: 1 },
    ],
    status: 'ready',
    time: '14:15',
    createdAt: Date.now() - 300000, // 5 minutes ago
  },
  {
    id: 'ORD-003',
    table: 5,
    items: [
      { name: 'Ceviche de Camarón', qty: 1 },
      { name: 'Tostones', qty: 1 },
    ],
    status: 'preparing',
    time: '14:35',
    createdAt: Date.now() - 45000, // 45 seconds ago
  },
  {
    id: 'ORD-004',
    table: 7,
    items: [
      { name: 'Causa Limeña', qty: 1 },
    ],
    status: 'pending',
    time: '14:40',
    createdAt: Date.now() - 20000, // 20 seconds ago
  },
]

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(initialOrders)

  const updateStatus = (id, newStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, status: newStatus } : o))
    )
  }

  const removeOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const preparingCount = orders.filter(o => o.status === 'preparing').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  const value = {
    orders,
    updateStatus,
    removeOrder,
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
