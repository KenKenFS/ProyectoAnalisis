import { useState, useEffect, useCallback } from 'react'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  XCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import {
  getClientes,
  updateClienteAdmin,
  desactivarClienteAdmin,
  reactivarClienteAdmin,
  getReservasByClienteUidAdmin,
} from '@shared/firebase/firestore'

function fmtDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProviderBadge({ provider }) {
  if (provider === 'google')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">
      <EnvelopeIcon className="w-3 h-3" />
      Email
    </span>
  )
}

function StatusBadge({ deletedAt }) {
  if (deletedAt)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900">
        Desactivado
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900">
      Activo
    </span>
  )
}

function ReservaEstadoBadge({ estado }) {
  const map = {
    confirmada: 'bg-green-50 text-green-700 border-green-100',
    pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    cancelada: 'bg-red-50 text-red-600 border-red-100',
    completada: 'bg-blue-50 text-blue-700 border-blue-100',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[estado] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {estado}
    </span>
  )
}

function EditModal({ cliente, onClose, onSaved }) {
  const [nombre, setNombre] = useState(cliente.nombre || '')
  const [telefono, setTelefono] = useState(cliente.telefono || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      await updateClienteAdmin(cliente.id, { nombre: nombre.trim(), telefono: telefono.trim() })
      onSaved({ ...cliente, nombre: nombre.trim(), telefono: telefono.trim() })
    } catch (e) {
      setError(e?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Editar cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Nombre</label>
            <input
              className="input input-bordered w-full text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Teléfono</label>
            <input
              className="input input-bordered w-full text-sm"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="8888-8888"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Correo</label>
            <input className="input input-bordered w-full text-sm bg-gray-50 dark:bg-zinc-800" value={cliente.email} disabled />
            <p className="text-xs text-gray-400 mt-1">El correo no es editable desde el admin.</p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, confirmLabel, confirmClass = 'btn-error', onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={handle} disabled={loading} className={`btn ${confirmClass} flex-1`}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClienteDetailPanel({ cliente, onClose, onEdit, onToggleStatus }) {
  const [reservas, setReservas] = useState(null)
  const [loadingR, setLoadingR] = useState(false)
  const [showReservas, setShowReservas] = useState(false)

  const loadReservas = useCallback(async () => {
    if (reservas !== null) { setShowReservas(true); return }
    setLoadingR(true)
    try {
      const data = await getReservasByClienteUidAdmin(cliente.id)
      setReservas(data)
      setShowReservas(true)
    } catch {
      setReservas([])
      setShowReservas(true)
    } finally {
      setLoadingR(false)
    }
  }, [cliente.id, reservas])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            {cliente.photoURL ? (
              <img src={cliente.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">{cliente.nombre}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{cliente.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Teléfono</p>
              <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 flex items-center gap-1">
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                {cliente.telefono || <span className="text-gray-400 italic">sin teléfono</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Proveedor</p>
              <ProviderBadge provider={cliente.provider} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Estado</p>
              <StatusBadge deletedAt={cliente.deletedAt} />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">Registrado</p>
              <p className="text-sm text-gray-700 dark:text-zinc-300">{fmtDate(cliente.createdAt)}</p>
            </div>
          </div>

          {/* Reservas */}
          <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
            <button
              onClick={showReservas ? () => setShowReservas(false) : loadReservas}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 w-full"
            >
              <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
              Reservas
              {loadingR
                ? <span className="loading loading-spinner loading-xs ml-auto" />
                : showReservas
                  ? <ChevronUpIcon className="w-4 h-4 ml-auto" />
                  : <ChevronDownIcon className="w-4 h-4 ml-auto" />
              }
            </button>

            {showReservas && (
              <div className="mt-3 space-y-2">
                {reservas?.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">Sin reservas registradas</p>
                )}
                {reservas?.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-zinc-200">{r.fecha} · {r.hora}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{r.cantidadPersonas} personas{r.mesaNumero ? ` · Mesa ${r.mesaNumero}` : ''}</p>
                    </div>
                    <ReservaEstadoBadge estado={r.estado} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={() => onEdit(cliente)} className="btn btn-sm btn-outline flex-1 gap-1">
            <PencilIcon className="w-4 h-4" />
            Editar
          </button>
          {cliente.deletedAt ? (
            <button onClick={() => onToggleStatus(cliente, 'reactivar')} className="btn btn-sm btn-success flex-1 gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              Reactivar
            </button>
          ) : (
            <button onClick={() => onToggleStatus(cliente, 'desactivar')} className="btn btn-sm btn-error btn-outline flex-1 gap-1">
              <XCircleIcon className="w-4 h-4" />
              Desactivar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProvider, setFilterProvider] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('activos')
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const loadClientes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClientes()
      setClientes(data)
    } catch {
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClientes() }, [loadClientes])

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(q)
    const matchProvider = filterProvider === 'todos' || c.provider === filterProvider
    const matchStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'activos' && !c.deletedAt) ||
      (filterStatus === 'inactivos' && !!c.deletedAt)
    return matchSearch && matchProvider && matchStatus
  })

  const stats = {
    total: clientes.length,
    activos: clientes.filter((c) => !c.deletedAt).length,
    google: clientes.filter((c) => c.provider === 'google').length,
    email: clientes.filter((c) => c.provider === 'email').length,
  }

  const handleSaved = (updated) => {
    setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    if (selected?.id === updated.id) setSelected(updated)
    setEditTarget(null)
  }

  const handleToggleStatus = async (cliente, action) => {
    if (action === 'desactivar') {
      setConfirmAction({
        title: 'Desactivar cliente',
        message: `¿Desactivar la cuenta de ${cliente.nombre}? El cliente no podrá iniciar sesión en el portal.`,
        confirmLabel: 'Desactivar',
        confirmClass: 'btn-error',
        onConfirm: async () => {
          await desactivarClienteAdmin(cliente.id)
          const updated = { ...cliente, deletedAt: new Date() }
          setClientes((prev) => prev.map((c) => (c.id === cliente.id ? updated : c)))
          if (selected?.id === cliente.id) setSelected(updated)
          setConfirmAction(null)
          setSelected(null)
        },
      })
    } else {
      setConfirmAction({
        title: 'Reactivar cliente',
        message: `¿Reactivar la cuenta de ${cliente.nombre}? Podrá iniciar sesión nuevamente.`,
        confirmLabel: 'Reactivar',
        confirmClass: 'btn-success',
        onConfirm: async () => {
          await reactivarClienteAdmin(cliente.id)
          const { deletedAt: _removed, ...rest } = cliente
          const updated = { ...rest }
          setClientes((prev) => prev.map((c) => (c.id === cliente.id ? updated : c)))
          if (selected?.id === cliente.id) setSelected(updated)
          setConfirmAction(null)
          setSelected(null)
        },
      })
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Clientes del portal</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Cuentas registradas en el portal web
          </p>
        </div>
        <button onClick={loadClientes} className="btn btn-sm btn-ghost gap-2 self-start sm:self-auto">
          <ArrowPathIcon className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: UsersIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Activos', value: stats.activos, icon: CheckCircleIcon, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Con Google', value: stats.google, icon: UserCircleIcon, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Con email', value: stats.email, icon: EnvelopeIcon, color: 'text-gray-600 dark:text-zinc-400', bg: 'bg-gray-50 dark:bg-zinc-800' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-zinc-100">{loading ? '—' : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + tabla */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl">
        {/* Barra de búsqueda y filtros */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input input-sm input-bordered w-full pl-9 text-sm"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <select
              className="select select-sm select-bordered text-sm"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <option value="todos">Todos los proveedores</option>
              <option value="google">Google</option>
              <option value="email">Email</option>
            </select>
            <select
              className="select select-sm select-bordered text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="activos">Activos</option>
              <option value="inactivos">Desactivados</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <span className="loading loading-spinner loading-md mr-2" />
            Cargando clientes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-zinc-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-800">
                  <th className="font-medium pl-5">Cliente</th>
                  <th className="font-medium">Teléfono</th>
                  <th className="font-medium">Proveedor</th>
                  <th className="font-medium">Estado</th>
                  <th className="font-medium">Registrado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer border-b border-gray-50 dark:border-zinc-800 last:border-0"
                    onClick={() => setSelected(c)}
                  >
                    <td className="pl-5">
                      <div className="flex items-center gap-2.5">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <UserCircleIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800 dark:text-zinc-200 text-sm leading-tight">{c.nombre}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600 dark:text-zinc-400">
                      {c.telefono || <span className="text-gray-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td><ProviderBadge provider={c.provider} /></td>
                    <td><StatusBadge deletedAt={c.deletedAt} /></td>
                    <td className="text-xs text-gray-500 dark:text-zinc-500">{fmtDate(c.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost text-gray-400"
                        onClick={(e) => { e.stopPropagation(); setSelected(c) }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-600">
            {filtered.length} de {clientes.length} clientes
          </div>
        )}
      </div>

      {/* Panel de detalle */}
      {selected && (
        <ClienteDetailPanel
          cliente={selected}
          onClose={() => setSelected(null)}
          onEdit={(c) => { setEditTarget(c); setSelected(null) }}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Modal de edición */}
      {editTarget && (
        <EditModal
          cliente={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal de confirmación */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          confirmClass={confirmAction.confirmClass}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
