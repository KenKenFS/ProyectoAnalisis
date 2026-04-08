import { useEffect, useMemo, useState } from 'react'
import {
  TableCellsIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import ModalPortal from '@shared/layout/ModalPortal'
import { collection, onSnapshot } from 'firebase/firestore'

import {
  createMesa,
  deleteMesa,
  updateMesa,
  updateMesaEstado,
} from '@shared/firebase/firestore'
import { db } from '@shared/firebase/firebase'
import { formatMesaLabel } from '@shared/utils/mesaDisplay'

const ESTADOS = ['libre', 'ocupada', 'esperandoCuenta', 'porLimpiar']

function normalizeEstado(raw) {
  const value = String(raw || '').toLowerCase().trim()
  if (value === 'ocupada') return 'ocupada'
  if (value === 'esperandocuenta' || value === 'esperando_cuenta' || value === 'esperandocobro') {
    return 'esperandoCuenta'
  }
  if (value === 'porlimpiar' || value === 'por_limpiar') return 'porLimpiar'
  return 'libre'
}

function getEstadoUI(estado) {
  if (estado === 'ocupada') {
    return {
      label: 'Ocupada',
      pill:
        'inline-flex items-center gap-1.5 rounded-full border border-sky-500/55 bg-sky-500/[0.1] px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-400/45 dark:bg-sky-500/15 dark:text-sky-200',
      dot: 'bg-sky-500 dark:bg-sky-400',
    }
  }
  if (estado === 'esperandoCuenta') {
    return {
      label: 'Lista para pagar',
      pill:
        'inline-flex items-center gap-1.5 rounded-full border border-amber-500/55 bg-amber-500/[0.1] px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/45 dark:bg-amber-500/15 dark:text-amber-200',
      dot: 'bg-amber-500 dark:bg-amber-400',
    }
  }
  if (estado === 'porLimpiar') {
    return {
      label: 'Por limpiar',
      pill:
        'inline-flex items-center gap-1.5 rounded-full border border-violet-500/55 bg-violet-500/[0.1] px-2.5 py-1 text-xs font-semibold text-violet-900 dark:border-violet-400/45 dark:bg-violet-500/15 dark:text-violet-200',
      dot: 'bg-violet-500 dark:bg-violet-400',
    }
  }
  return {
    label: 'Libre',
    pill:
      'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/55 bg-emerald-500/[0.1] px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-200',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  }
}

export default function Orders() {
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')

  const [openForm, setOpenForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    numero: '',
    capacidad: 4,
    zona: 'General',
    estadoMesa: 'libre',
  })
  const [mesaToDelete, setMesaToDelete] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'mesas'),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data()
            const estadoMesa = normalizeEstado(data.estadoMesa ?? data.estado)
            return { id: docSnap.id, ...data, estadoMesa }
          })
          .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))

        setMesas(mapped)
        setLoading(false)
        setError('')
      },
      (e) => {
        setError(e?.message || 'Error al cargar mesas.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const mesasFiltradas = useMemo(() => {
    if (filterEstado === 'todos') return mesas
    return mesas.filter((m) => m.estadoMesa === filterEstado)
  }, [mesas, filterEstado])

  function openCreate() {
    setEditingId(null)
    setForm({
      numero: '',
      capacidad: 4,
      zona: 'General',
      estadoMesa: 'libre',
    })
    setOpenForm(true)
  }

  function openEdit(mesa) {
    setEditingId(mesa.id)
    setForm({
      numero: Number(mesa.numero || 0),
      capacidad: Number(mesa.capacidad || 4),
      zona: mesa.zona || 'General',
      estadoMesa: mesa.estadoMesa || 'libre',
    })
    setOpenForm(true)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (submitting) return

    const numero = Number(form.numero || 0)
    const capacidad = Number(form.capacidad || 0)
    const zona = String(form.zona || '').trim()

    if (!Number.isFinite(numero) || numero <= 0) {
      setError('El numero de mesa debe ser mayor a 0.')
      return
    }
    if (!Number.isFinite(capacidad) || capacidad <= 0) {
      setError('La capacidad debe ser mayor a 0.')
      return
    }
    if (!zona) {
      setError('La zona es obligatoria.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const payload = {
        numero,
        capacidad,
        zona,
        estadoMesa: form.estadoMesa,
      }
      if (editingId) await updateMesa(editingId, payload)
      else await createMesa(payload)

      setOpenForm(false)
    } catch (e2) {
      setError(e2?.message || 'No se pudo guardar la mesa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDeleteMesa() {
    if (!mesaToDelete?.id || deleteSubmitting) return
    try {
      setDeleteSubmitting(true)
      setError('')
      await deleteMesa(mesaToDelete.id)
      setMesaToDelete(null)
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar la mesa.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  async function onChangeEstado(mesa, estado) {
    try {
      setError('')
      await updateMesaEstado(mesa.id, estado)
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar el estado.')
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Gestión de Mesas</h1>
        <p className="text-gray-600 text-sm">CRUD de mesas: numero, capacidad, zona y estado</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <option value="porLimpiar">Por limpiar</option>
          </select>
          <button onClick={openCreate} className="btn btn-sm bg-cyan-600 hover:bg-cyan-700 text-white border-0">
            <PlusIcon className="w-4 h-4" />
            Nueva mesa
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="card bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[140px]">ID</th>
                <th className="w-[90px]">Mesa</th>
                <th className="w-[110px]">Capacidad</th>
                <th className="w-[150px]">Zona</th>
                <th className="w-[240px]">Estado</th>
                <th className="w-[120px]">Cuenta activa</th>
                <th className="w-[170px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">
                    Cargando mesas...
                  </td>
                </tr>
              ) : mesasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">
                    No hay mesas para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                mesasFiltradas.map((m) => {
                  const ui = getEstadoUI(m.estadoMesa)
                  return (
                    <tr key={m.id} className="align-top hover:bg-gray-50/80 dark:hover:bg-zinc-800/40">
                      <td>
                        <div
                          title={m.id}
                          className="font-mono text-xs max-w-[125px] truncate text-gray-600"
                        >
                          {m.id}
                        </div>
                      </td>
                      <td className="font-bold whitespace-nowrap">
                        {m.numero != null && Number(m.numero) > 0 ? formatMesaLabel(m.numero) : '-'}
                      </td>
                      <td className="whitespace-nowrap">{m.capacidad ?? '-'}</td>
                      <td className="whitespace-nowrap">{m.zona || 'General'}</td>
                      <td>
                        <div className="flex flex-col items-start gap-2">
                          <span className={ui.pill}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
                            {ui.label}
                          </span>
                          <select
                            value={m.estadoMesa}
                            onChange={(e) => onChangeEstado(m, e.target.value)}
                            className="select select-bordered select-xs min-w-[160px]"
                          >
                            {ESTADOS.map((estado) => (
                              <option key={estado} value={estado}>{estado}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{m.cuentaActivaId ? 'Si' : 'No'}</td>
                      <td>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => openEdit(m)} className="btn btn-ghost btn-xs">
                            <PencilSquareIcon className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setMesaToDelete(m)}
                            className="btn btn-ghost btn-xs text-red-600 dark:text-red-400"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mesaToDelete && (
        <ModalPortal overlayClassName="flex items-center justify-center p-4">
          <div className="card w-full max-w-md border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-start gap-3 border-b border-gray-200 p-5 dark:border-zinc-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-100">Eliminar mesa</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                  Esta acción no se puede deshacer. Se eliminará la mesa{' '}
                  <span className="font-semibold text-gray-900 dark:text-zinc-200">
                    {mesaToDelete.numero != null && Number(mesaToDelete.numero) > 0
                      ? formatMesaLabel(mesaToDelete.numero)
                      : mesaToDelete.id}
                  </span>
                  {mesaToDelete.zona ? ` (${mesaToDelete.zona})` : ''}.
                </p>
                {mesaToDelete.cuentaActivaId && (
                  <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    Esta mesa tiene cuenta activa: no podrás eliminarla hasta que se libere.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => !deleteSubmitting && setMesaToDelete(null)}
                className="btn btn-ghost btn-sm btn-circle shrink-0"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 p-5 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => !deleteSubmitting && setMesaToDelete(null)}
                className="btn btn-ghost"
                disabled={deleteSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMesa}
                className="btn border-0 bg-red-600 text-white hover:bg-red-700"
                disabled={deleteSubmitting || !!mesaToDelete.cuentaActivaId}
              >
                {deleteSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Eliminando...
                  </>
                ) : (
                  'Confirmar eliminación'
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {openForm && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="card bg-white max-w-lg w-full">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TableCellsIcon className="w-5 h-5 text-cyan-600" />
                {editingId ? 'Editar mesa' : 'Nueva mesa'}
              </h3>
              <button onClick={() => setOpenForm(false)} className="btn btn-ghost btn-sm btn-circle">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-sm font-medium">Numero</label>
                  <input
                    type="number"
                    min="1"
                    value={form.numero}
                    onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label text-sm font-medium">Capacidad</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacidad}
                    onChange={(e) => setForm((p) => ({ ...p, capacidad: e.target.value }))}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-sm font-medium">Zona</label>
                <input
                  type="text"
                  value={form.zona}
                  onChange={(e) => setForm((p) => ({ ...p, zona: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="Salon A, Salon B, Terraza..."
                  required
                />
              </div>

              <div>
                <label className="label text-sm font-medium">Estado inicial</label>
                <select
                  value={form.estadoMesa}
                  onChange={(e) => setForm((p) => ({ ...p, estadoMesa: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  <option value="libre">libre</option>
                  <option value="ocupada">ocupada</option>
                  <option value="esperandoCuenta">lista para pagar</option>
                  <option value="porLimpiar">por limpiar</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpenForm(false)} className="btn btn-ghost flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-cyan-600 hover:bg-cyan-700 text-white border-0 flex-1"
                >
                  {submitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear mesa'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
