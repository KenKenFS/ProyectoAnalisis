import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CreditCardIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'
import {
  getMesasConCuentaActivaOrThrow,
  getCuentaItems,
  getProductos,
  getPromocionesActivasParaCobro,
  createVentaDirectaCuenta,
  addVentaDirectaItem,
  cerrarVentaDirectaCuenta,
  getVentasDirectasPendientesEntrega,
  marcarVentaDirectaEntregada,
} from '@shared/firebase/firestore'

function OrderTableCard({ order, onSelect }) {
  const statusColors = {
    'Listo': 'bg-green-50 border-green-300',
    'En cocina': 'bg-yellow-50 border-yellow-300',
    'Pendiente': 'bg-blue-50 border-blue-300',
  }

  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all ${statusColors[order.status]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-gray-900">Mesa {order.table}</div>
          <div className="text-xs text-gray-600">{order.time}</div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
          order.status === 'Listo' ? 'bg-green-100 text-green-800' :
          order.status === 'En cocina' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {order.status === 'Listo' && <CheckCircleIcon className="w-4 h-4" />}
          {order.status === 'En cocina' && <ClockIcon className="w-4 h-4" />}
          {order.status}
        </div>
      </div>

      <div className="space-y-1 mb-3 max-h-20 overflow-y-auto">
        {order.items.map(item => (
          <div key={item.id} className="text-xs text-gray-700">
            {item.qty}x {item.name}
          </div>
        ))}
      </div>

      <div className="border-t border-current border-opacity-20 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Total:</span>
          <span className="font-bold text-lg text-gray-900">₡{order.total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function MenuCard({ item, onAdd }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-cyan-400 transition-all duration-300 overflow-hidden group cursor-pointer">
      <div className="h-28 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative overflow-hidden">
        <ShoppingCartIcon className="w-12 h-12 text-cyan-600/50 group-hover:scale-110 transition-transform duration-300" />
        <div className="absolute top-2 right-2">
          <span className="badge badge-sm bg-white/90 text-gray-600 font-semibold">{item.category}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-1">{item.desc}</p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="font-bold text-cyan-600 text-base">₡{Number(item.price || 0).toLocaleString()}</div>
          <button
            onClick={() => onAdd(item)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 text-sm truncate">{item.name}</div>
        <div className="text-xs text-gray-500">₡{Number(item.price || 0).toLocaleString()} c/u</div>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
        <button
          onClick={onDecrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <MinusIcon className="w-3 h-3 text-gray-600" />
        </button>
        <span className="w-8 text-center font-semibold text-sm">{item.qty}</span>
        <button
          onClick={onIncrease}
          className="p-1 hover:bg-gray-100 transition"
        >
          <PlusIcon className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      <div className="font-bold text-gray-800 w-20 text-right text-sm">
        ₡{(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString()}
      </div>

      <button
        onClick={onRemove}
        className="p-1 hover:bg-red-50 text-red-500 rounded transition"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

function ConfirmCobro({ open, onClose, onConfirm, loading, cart, error, promociones = [] }) {
  const [metodo, setMetodo] = useState('efectivo')
  const [promoId, setPromoId] = useState('')

  useEffect(() => {
    if (open) {
      setMetodo('efectivo')
      setPromoId('')
    }
  }, [open])

  if (!open) return null

  const subtotal = Math.round(cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0))
  const selectedPromo = promociones.find(p => p.id === promoId) || null
  let descuento = 0
  if (selectedPromo) {
    const tipo = String(selectedPromo.tipoBeneficio || '').toLowerCase()
    const valor = Number(selectedPromo.valorBeneficio || 0)
    if (tipo === 'porcentaje') descuento = Math.round(subtotal * (valor / 100))
    if (tipo === 'monto_fijo') descuento = Math.round(valor)
    descuento = Math.max(0, Math.min(descuento, subtotal))
  }
  const subtotalConDescuento = Math.max(0, subtotal - descuento)
  const tax = Math.round(subtotalConDescuento * 0.13)
  const total = subtotalConDescuento + tax

  return (
    <ModalPortal overlayClassName="flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-4 flex items-center justify-between">
          <div className="font-bold text-lg">Confirmar cobro — Para llevar</div>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-white">Cerrar</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto space-y-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-700">
                <span>{item.qty}x {item.name}</span>
                <span className="font-semibold">₡{(Number(item.price || 0) * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold">₡{subtotal.toLocaleString()}</span>
            </div>
            {selectedPromo && (
              <div className="flex justify-between text-green-700">
                <span>Descuento ({selectedPromo.nombre})</span>
                <span className="font-semibold">-₡{descuento.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>IVA (13%)</span>
              <span className="font-semibold">₡{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 bg-cyan-50 border border-cyan-200 rounded p-2 mt-2">
              <span>Total</span>
              <span>₡{total.toLocaleString()}</span>
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
                    {p.nombre} ({p.tipoBeneficio === 'porcentaje' ? `${p.valorBeneficio}%` : `₡${Number(p.valorBeneficio || 0).toLocaleString()}`})
                  </option>
                ))}
              </select>
              {!!promoId && (
                <button type="button" onClick={() => setPromoId('')} className="btn btn-ghost">
                  Quitar
                </button>
              )}
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
              onClick={() => onConfirm(metodo, promoId)}
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

export default function VentasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [productos, setProductos] = useState([])
  const [mesasConCuenta, setMesasConCuenta] = useState([])
  const [mesasError, setMesasError] = useState('')
  const [mesasLoading, setMesasLoading] = useState(true)
  const [ventaError, setVentaError] = useState('')
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pedidosPendientes, setPedidosPendientes] = useState([])
  const [entregando, setEntregando] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [promocionesActivas, setPromocionesActivas] = useState([])

  const loadPedidosPendientes = useCallback(async () => {
    try {
      const pendientes = await getVentasDirectasPendientesEntrega()
      const enriched = await Promise.all(
        pendientes.map(async (p) => {
          try {
            const items = await getCuentaItems(p.id)
            return { ...p, itemsDetalle: items }
          } catch {
            return { ...p, itemsDetalle: [] }
          }
        })
      )
      setPedidosPendientes(enriched)
    } catch { /* silenciar */ }
  }, [])

  useEffect(() => {
    loadPedidosPendientes()
  }, [loadPedidosPendientes])

  const loadMainData = useCallback(async () => {
    try {
      setMesasLoading(true)
      setMesasError('')
      const [mesas, productosDB, promos] = await Promise.all([
        getMesasConCuentaActivaOrThrow(),
        getProductos(),
        getPromocionesActivasParaCobro().catch(() => []),
      ])

      const enriched = await Promise.all(
        mesas.map(async (m) => {
          try {
            const its = await getCuentaItems(m.cuentaActivaId)
            const pendientes = its.filter(i => i.estadoItem === 'pendiente')
            const subtotal = Math.round(
              pendientes.reduce((s, i) => s + Number(i.precioUnitSnapshot || 0) * Number(i.cantidad || 1), 0)
            )
            const impuesto = Math.round(subtotal * 0.13)
            const total = subtotal + impuesto
            return {
              ...m,
              resumen: {
                itemsPendientes: pendientes.length,
                total,
              },
            }
          } catch {
            return { ...m, resumen: { itemsPendientes: 0, total: 0 } }
          }
        })
      )

      setMesasConCuenta(enriched)
      setProductos(productosDB || [])
      setPromocionesActivas(promos || [])
    } catch (e) {
      setMesasError(e?.message || 'Error al cargar mesas')
    } finally {
      setMesasLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMainData()
  }, [loadMainData])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadMainData(), loadPedidosPendientes()])
    } finally {
      setRefreshing(false)
    }
  }, [loadMainData, loadPedidosPendientes])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll()
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshAll])

  const categories = [...new Set((productos || []).map(m => m.categoria || 'General'))]
  const categoryCountMap = categories.reduce((acc, cat) => {
    acc[cat] = (productos || []).filter((p) => (p.categoria || 'General') === cat).length
    return acc
  }, {})

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  const filteredItems = (productos || []).map(item => {
    const precio = Number(item.precioUnit ?? item.precio ?? 0)
    return {
      id: item.id,
      productoId: item.id,
      name: item.nombre ?? item.name ?? item.id,
      category: item.categoria || 'General',
      price: precio,
      desc: item.descripcion || '',
    }
  }).filter(item => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function addToCart(item) {
    setVentaError('')
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p)
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(id, delta) {
    setCart(prev =>
      prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)
          .filter(p => p.qty > 0)
    )
  }

  function removeItem(id) {
    setVentaError('')
    setCart(prev => prev.filter(p => p.id !== id))
  }

  const subtotal = Math.round(cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0))
  const tax = Math.round(subtotal * 0.13)
  const total = subtotal + tax

  async function cobrarVentaDirecta(metodo, promocionId = '') {
    if (procesandoVenta) return
    setVentaError('')
    if (cart.length === 0) {
      setVentaError('Agregue al menos un producto.')
      return
    }

    setProcesandoVenta(true)
    try {
      const cuentaId = await createVentaDirectaCuenta({
        createdByUid: user?.uid || null,
        tipoVenta: 'directa_para_llevar',
        tipoPedido: 'para_llevar',
        terminalId: 'Caja',
      })

      for (const item of cart) {
        await addVentaDirectaItem({
          cuentaId,
          productoId: item.productoId || item.id,
          cantidad: item.qty,
          createdByUid: user?.uid || null,
        })
      }

      await cerrarVentaDirectaCuenta({
        cuentaId,
        metodo,
        cajeroUid: user?.uid || null,
        impuestoRate: 0.13,
        promocionId: promocionId || null,
      })

      setCart([])
      setConfirmOpen(false)
      await loadPedidosPendientes()
    } catch (e) {
      if (e?.code === 'EMPTY_SALE') setVentaError('Agregue al menos un producto.')
      else setVentaError(e?.message || 'Error al procesar venta directa.')
    } finally {
      setProcesandoVenta(false)
    }
  }

  async function handleEntregado(cuentaId) {
    if (entregando) return
    setEntregando(cuentaId)
    try {
      await marcarVentaDirectaEntregada({
        cuentaId,
        cajeroUid: user?.uid || null,
      })
      await loadPedidosPendientes()
    } catch (e) {
      setVentaError(e?.message || 'Error al marcar como entregado.')
    } finally {
      setEntregando(null)
    }
  }

  return (
    <div className="space-y-6 pb-4">
      {/* SECTION 1: PEDIDOS POR MESA */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-cyan-600" />
            Pedidos Por Mesa
          </h2>
          <button
            type="button"
            onClick={refreshAll}
            className="btn btn-ghost gap-2"
            disabled={refreshing}
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mesasConCuenta.map(mesa => (
            <OrderTableCard
              key={mesa.id}
              order={{
                id: mesa.id,
                table: mesa.numero ?? mesa.id,
                items: [
                  {
                    id: 'pendientes',
                    name: `${mesa.resumen?.itemsPendientes ?? 0} ítems pendientes`,
                    qty: 1,
                  },
                ],
                status: 'Pendiente',
                time: 'Cuenta activa',
                total: Number(mesa.resumen?.total || 0),
              }}
              onSelect={() => {
                navigate(`/mesa-compartida?mesaId=${encodeURIComponent(mesa.id)}`)
              }}
            />
          ))}
        </div>

        {mesasError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mt-3">
            {mesasError}
          </div>
        )}

        {!mesasLoading && mesasConCuenta.length === 0 && !mesasError && (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay mesas con cuenta activa</p>
          </div>
        )}
      </div>

      {/* SECTION 2: PEDIDOS PARA LLEVAR (cobrados, pendientes de entrega) */}
      {pedidosPendientes.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="w-6 h-6 text-orange-500" />
            Pedidos Para Llevar
            <span className="badge badge-warning badge-sm ml-2">{pedidosPendientes.length}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pedidosPendientes.map((pedido) => {
              const cobradoDate = pedido.cobradoAt?.toDate?.()
                || (pedido.cobradoAt ? new Date(pedido.cobradoAt) : null)
              const timeStr = cobradoDate
                ? cobradoDate.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
                : ''
              const items = pedido.itemsDetalle || []
              const pagados = items.filter((i) => i.estadoItem === 'pagado')

              return (
                <div
                  key={pedido.id}
                  className="border-2 rounded-lg p-4 bg-orange-50 border-orange-300 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-gray-900">Para llevar</div>
                      <div className="text-xs text-gray-600">{timeStr}</div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold bg-orange-100 text-orange-800">
                      <ClockIcon className="w-4 h-4" />
                      Cobrado
                    </div>
                  </div>

                  <div className="space-y-1 mb-3 max-h-24 overflow-y-auto">
                    {pagados.map((item) => (
                      <div key={item.id} className="text-xs text-gray-700">
                        {item.cantidad || 1}x {item.nombreSnapshot || item.productoId}
                      </div>
                    ))}
                    {pagados.length === 0 && (
                      <div className="text-xs text-gray-400">Sin ítems</div>
                    )}
                  </div>

                  <div className="border-t border-orange-200 pt-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {pedido.metodoPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                      </span>
                      <span className="font-bold text-lg text-gray-900">
                        ₡{Number(pedido.montoTotal || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEntregado(pedido.id)}
                    disabled={entregando === pedido.id}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-semibold active:scale-95 disabled:opacity-50"
                  >
                    {entregando === pedido.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5" />
                    )}
                    Entregado
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SEPARATOR */}
      <div className="border-t-2 border-gray-200 pt-6 my-6">
        <div className="text-center mb-6">
          <span className="bg-gray-100 px-4 py-2 rounded-full text-sm font-semibold text-gray-700">
            O
          </span>
        </div>
      </div>

      {/* SECTION 2: VENTA DIRECTA / PARA LLEVAR */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="w-6 h-6 text-cyan-600" />
          Venta Directa / Para Llevar
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Categories Panel */}
            <div className="md:col-span-1 bg-white border border-gray-200 rounded-lg p-3 max-h-[65vh] overflow-y-auto">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categorías</div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition flex items-center justify-between ${
                      selectedCategory === cat
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-cyan-300 hover:bg-cyan-50/40'
                    }`}
                  >
                    <span className="text-sm font-medium truncate">{cat}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {categoryCountMap[cat] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product List by Selected Category */}
            <div className="md:col-span-3 flex flex-col gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={selectedCategory ? `Buscar en ${selectedCategory}...` : 'Buscar producto...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="font-semibold text-gray-900">
                  {selectedCategory || 'Productos'}
                </div>
                <div className="text-xs text-gray-500">
                  {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 min-h-0 max-h-[55vh]">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <MenuCard key={item.id} item={item} onAdd={addToCart} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                      <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay productos en esta categoría con ese filtro</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Sidebar */}
          <aside className="lg:sticky lg:top-0 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col h-fit max-h-[calc(100vh-10rem)]">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCartIcon className="w-5 h-5 text-cyan-600" />
                <h2 className="font-bold text-gray-900">Carrito</h2>
                {cart.length > 0 && (
                  <span className="ml-auto badge badge-cyan badge-sm">{cart.length}</span>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Carrito vacio</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onIncrease={() => updateQty(item.id, 1)}
                    onDecrease={() => updateQty(item.id, -1)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))
              )}
            </div>

            {/* Totals & Payment */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₡{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (13%)</span>
                    <span className="font-semibold">₡{tax.toLocaleString()}</span>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 bg-white p-2 rounded border border-gray-200">
                    <span>Total</span>
                    <span className="text-cyan-600">₡{total.toLocaleString()}</span>
                  </div>
                </div>

                {ventaError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                    {ventaError}
                  </div>
                )}

                <button
                  onClick={() => { setVentaError(''); setConfirmOpen(true) }}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-lg transition font-semibold active:scale-95"
                  disabled={procesandoVenta}
                >
                  <CreditCardIcon className="w-5 h-5" />
                  Cobrar
                </button>

                <button
                  onClick={() => setCart([])}
                  className="w-full px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition font-semibold text-sm"
                  disabled={procesandoVenta}
                >
                  Limpiar carrito
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      <ConfirmCobro
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(metodo, promocionId) => cobrarVentaDirecta(metodo, promocionId)}
        loading={procesandoVenta}
        cart={cart}
        error={ventaError}
        promociones={promocionesActivas}
      />
    </div>
  )
}
