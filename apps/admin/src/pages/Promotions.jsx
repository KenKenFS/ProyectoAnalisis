import { useEffect, useMemo, useState } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  createPromocion,
  deletePromocionExpirada,
  getPromocionesAplicadasTransacciones,
  getPromociones,
  restorePromocionEliminada,
  setPromocionEstado,
  updatePromocionActiva,
  updatePromocionProgramada,
} from '@shared/firebase/firestore'

const WEEK_DAYS = [
  { id: 'lunes', label: 'Lun' },
  { id: 'martes', label: 'Mar' },
  { id: 'miercoles', label: 'Mie' },
  { id: 'jueves', label: 'Jue' },
  { id: 'viernes', label: 'Vie' },
  { id: 'sabado', label: 'Sab' },
  { id: 'domingo', label: 'Dom' },
]

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatBenefit(item) {
  const value = Number(item.valorBeneficio || 0)
  if (item.tipoBeneficio === 'porcentaje') return `${value}%`
  return `₡${value.toLocaleString()}`
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'activa') return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'programada') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (s === 'expirada') return 'bg-gray-50 text-gray-600 border-gray-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function initialForm(today) {
  return {
    nombre: '',
    descripcion: '',
    fechaInicio: today,
    fechaFin: today,
    tipoBeneficio: 'porcentaje',
    valorBeneficio: '',
    montoMinimo: '',
    categoriaProducto: '',
    diaSemana: [],
    motivo: '',
  }
}

export default function Promotions() {
  const { user } = useAuth()
  const today = toDateStr(new Date())

  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteMotivo, setDeleteMotivo] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreMotivo, setRestoreMotivo] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [aplicadasLoading, setAplicadasLoading] = useState(false)
  const [aplicadasError, setAplicadasError] = useState('')
  const [aplicadasData, setAplicadasData] = useState(null)
  const [aplicadasRange, setAplicadasRange] = useState({
    inicio: toDateStr(new Date(Date.now() - (29 * 24 * 60 * 60 * 1000))),
    fin: today,
    promocionId: '',
  })

  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [formData, setFormData] = useState(initialForm(today))
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadPromotions()
  }, [])

  useEffect(() => {
    loadPromocionesAplicadas()
  }, [aplicadasRange.inicio, aplicadasRange.fin, aplicadasRange.promocionId])

  async function loadPromotions() {
    setLoading(true)
    setError('')
    try {
      const list = await getPromociones()
      setPromotions(list)
    } catch (err) {
      setError('Error al cargar promociones: ' + err.message)
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

  async function loadPromocionesAplicadas() {
    setAplicadasLoading(true)
    setAplicadasError('')
    try {
      const result = await getPromocionesAplicadasTransacciones({
        fechaInicio: aplicadasRange.inicio,
        fechaFin: aplicadasRange.fin,
        promocionId: aplicadasRange.promocionId || '',
      })
      setAplicadasData(result)
    } catch (err) {
      setAplicadasError(err.message)
      setAplicadasData(null)
    } finally {
      setAplicadasLoading(false)
    }
  }

  function resetForm() {
    setEditingPromotion(null)
    setFormData(initialForm(today))
    setFormError('')
  }

  function openCreateForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditForm(item) {
    setEditingPromotion(item)
    setFormData({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      fechaInicio: item.fechaInicio || today,
      fechaFin: item.fechaFin || today,
      tipoBeneficio: item.tipoBeneficio || 'porcentaje',
      valorBeneficio: String(item.valorBeneficio || ''),
      montoMinimo: String(item.condiciones?.montoMinimo || ''),
      categoriaProducto: item.condiciones?.categoriaProducto || '',
      diaSemana: Array.isArray(item.condiciones?.diaSemana) ? item.condiciones.diaSemana : [],
      motivo: '',
    })
    setFormError('')
    setShowForm(true)
  }

  function toggleWeekDay(day) {
    setFormData(prev => {
      const exists = prev.diaSemana.includes(day)
      return {
        ...prev,
        diaSemana: exists ? prev.diaSemana.filter(d => d !== day) : [...prev.diaSemana, day],
      }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        tipoBeneficio: formData.tipoBeneficio,
        valorBeneficio: Number(formData.valorBeneficio),
        montoMinimo: Number(formData.montoMinimo || 0),
        categoriaProducto: formData.categoriaProducto,
        diaSemana: formData.diaSemana,
        usuarioUid: user?.uid || null,
      }

      if (editingPromotion?.id) {
        const status = String(editingPromotion.estadoPromocion || '').toLowerCase()
        if (status === 'programada') {
          await updatePromocionProgramada({
            promocionId: editingPromotion.id,
            ...payload,
          })
        } else {
          await updatePromocionActiva({
            promocionId: editingPromotion.id,
            ...payload,
            motivo: formData.motivo,
          })
        }
      } else {
        await createPromocion(payload)
      }

      setShowForm(false)
      resetForm()
      await loadPromotions()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleEstado(item, activate) {
    if (!item?.id) return
    setFormError('')
    setError('')
    setTogglingId(item.id)
    try {
      await setPromocionEstado({
        promocionId: item.id,
        activar: activate,
        usuarioUid: user?.uid || null,
      })
      await loadPromotions()
    } catch (err) {
      setError(err.message)
    } finally {
      setTogglingId('')
    }
  }

  async function handleDeleteExpirada() {
    if (!deleteTarget?.id) return
    setError('')
    setDeleting(true)
    try {
      await deletePromocionExpirada({
        promocionId: deleteTarget.id,
        motivo: deleteMotivo,
        usuarioUid: user?.uid || null,
      })
      setDeleteTarget(null)
      setDeleteMotivo('')
      await loadPromotions()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleRestorePromocion() {
    if (!restoreTarget?.id) return
    setError('')
    setRestoring(true)
    try {
      await restorePromocionEliminada({
        promocionId: restoreTarget.id,
        motivo: restoreMotivo,
        usuarioUid: user?.uid || null,
      })
      setRestoreTarget(null)
      setRestoreMotivo('')
      await loadPromotions()
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  const stats = useMemo(() => {
    const activas = promotions.filter(p => String(p.estadoPromocion || '').toLowerCase() === 'activa').length
    const programadas = promotions.filter(p => String(p.estadoPromocion || '').toLowerCase() === 'programada').length
    return {
      total: promotions.length,
      activas,
      programadas,
    }
  }, [promotions])

  const visiblePromotions = useMemo(() => {
    return promotions.filter(p => {
      const s = String(p.estadoPromocion || '').toLowerCase()
      return s === 'activa' || s === 'programada' || s === 'expirada' || s === 'inactiva'
    })
  }, [promotions])

  const deletedPromotions = useMemo(() => {
    return promotions.filter(p => String(p.estadoPromocion || '').toLowerCase() === 'eliminada')
  }, [promotions])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Promociones y Fidelización</h1>
          <p className="text-gray-600 text-sm">Gestión de promociones por vigencia, beneficio y condiciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPromotions} className="btn btn-outline btn-sm gap-2" disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button onClick={openCreateForm} className="btn btn-primary btn-sm gap-2">
            <PlusIcon className="w-4 h-4" />
            Nueva promoción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-700">Activas</p>
          <p className="text-2xl font-bold text-green-700">{stats.activas}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">Programadas</p>
          <p className="text-2xl font-bold text-blue-700">{stats.programadas}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            {editingPromotion ? 'Editar promoción' : 'Registrar promoción'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Nombre *</label>
                <input type="text" value={formData.nombre} onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Descripción</label>
                <input type="text" value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Fecha inicio *</label>
                <input type="date" value={formData.fechaInicio} onChange={e => setFormData(p => ({ ...p, fechaInicio: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Fecha fin *</label>
                <input type="date" value={formData.fechaFin} onChange={e => setFormData(p => ({ ...p, fechaFin: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Tipo beneficio *</label>
                <select value={formData.tipoBeneficio} onChange={e => setFormData(p => ({ ...p, tipoBeneficio: e.target.value }))} className="select select-bordered select-sm w-full">
                  <option value="porcentaje">Porcentaje</option>
                  <option value="monto_fijo">Monto fijo</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Valor beneficio * {formData.tipoBeneficio === 'porcentaje' ? '(%)' : '(CRC)'}
                </label>
                <input type="number" min="1" step="1" value={formData.valorBeneficio} onChange={e => setFormData(p => ({ ...p, valorBeneficio: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Monto mínimo (CRC)</label>
                <input type="number" min="0" step="1" value={formData.montoMinimo} onChange={e => setFormData(p => ({ ...p, montoMinimo: e.target.value }))} className="input input-bordered input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Categoría producto (opcional)</label>
                <input type="text" value={formData.categoriaProducto} onChange={e => setFormData(p => ({ ...p, categoriaProducto: e.target.value }))} className="input input-bordered input-sm w-full" placeholder="Ej: ceviches, bebidas" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">Días de la semana (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map(day => {
                  const selected = formData.diaSemana.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekDay(day.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs border transition ${selected ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {editingPromotion && String(editingPromotion.estadoPromocion || '').toLowerCase() === 'activa' && (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Motivo de modificación *</label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={e => setFormData(p => ({ ...p, motivo: e.target.value }))}
                  className="input input-bordered input-sm w-full"
                  placeholder="Ej: ajuste por campaña de temporada"
                />
              </div>
            )}
            {editingPromotion && String(editingPromotion.estadoPromocion || '').toLowerCase() === 'inactiva' && (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Motivo de modificación *</label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={e => setFormData(p => ({ ...p, motivo: e.target.value }))}
                  className="input input-bordered input-sm w-full"
                  placeholder="Ej: ajustes antes de reactivar la promoción"
                />
              </div>
            )}

            {formError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Guardando...' : editingPromotion ? 'Guardar cambios' : 'Crear promoción'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Promociones registradas</h2>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-sm text-gray-500">Cargando promociones...</div>
        ) : visiblePromotions.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-500">No hay promociones registradas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visiblePromotions.map(item => {
              const status = String(item.estadoPromocion || '').toLowerCase()
              const canEdit = status === 'programada' || status === 'activa' || status === 'inactiva'
              const canActivate = status === 'programada' || status === 'inactiva'
              const canDeactivate = status === 'activa'
              const canDelete = status === 'expirada'
              const isToggling = togglingId === item.id
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{item.nombre}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-xs border ${statusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </div>
                      {item.descripcion && (
                        <p className="text-sm text-gray-600">{item.descripcion}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        Vigencia: {item.fechaInicio} a {item.fechaFin}
                      </div>
                      <div className="text-xs text-gray-500">
                        Beneficio: {item.tipoBeneficio === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'} ({formatBenefit(item)})
                      </div>
                      <div className="text-xs text-gray-500">
                        Condiciones: monto mínimo ₡{Number(item.condiciones?.montoMinimo || 0).toLocaleString()}
                        {item.condiciones?.categoriaProducto ? ` | categoría ${item.condiciones.categoriaProducto}` : ''}
                        {Array.isArray(item.condiciones?.diaSemana) && item.condiciones.diaSemana.length > 0
                          ? ` | días ${item.condiciones.diaSemana.join(', ')}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'activa' && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                      {status === 'programada' && <ClockIcon className="w-5 h-5 text-blue-600" />}
                      {status === 'inactiva' && <PauseCircleIcon className="w-5 h-5 text-amber-600" />}
                      {canEdit && (
                        <button onClick={() => openEditForm(item)} className="btn btn-outline btn-sm gap-1">
                          <PencilSquareIcon className="w-4 h-4" />
                          Editar
                        </button>
                      )}
                      {canActivate && (
                        <button
                          onClick={() => handleToggleEstado(item, true)}
                          className="btn btn-outline btn-sm text-green-700"
                          disabled={isToggling}
                        >
                          {isToggling ? '...' : 'Activar'}
                        </button>
                      )}
                      {canDeactivate && (
                        <button
                          onClick={() => handleToggleEstado(item, false)}
                          className="btn btn-outline btn-sm text-amber-700"
                          disabled={isToggling}
                        >
                          {isToggling ? '...' : 'Desactivar'}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            setDeleteTarget(item)
                            setDeleteMotivo('')
                          }}
                          className="btn btn-outline btn-sm text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="font-semibold text-gray-800">Promociones aplicadas en transacciones</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={aplicadasRange.inicio}
              onChange={e => setAplicadasRange(p => ({ ...p, inicio: e.target.value }))}
              className="input input-bordered input-sm"
            />
            <input
              type="date"
              value={aplicadasRange.fin}
              onChange={e => setAplicadasRange(p => ({ ...p, fin: e.target.value }))}
              className="input input-bordered input-sm"
            />
            <select
              value={aplicadasRange.promocionId}
              onChange={e => setAplicadasRange(p => ({ ...p, promocionId: e.target.value }))}
              className="select select-bordered select-sm"
            >
              <option value="">Todas las promociones</option>
              {promotions
                .filter(p => String(p.estadoPromocion || '').toLowerCase() !== 'eliminada')
                .map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
            </select>
            <button onClick={loadPromocionesAplicadas} className="btn btn-outline btn-sm gap-2" disabled={aplicadasLoading}>
              <ArrowPathIcon className={`w-4 h-4 ${aplicadasLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {aplicadasError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {aplicadasError}
            </div>
          )}

          {aplicadasData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Transacciones con promoción</div>
                  <div className="text-xl font-bold text-gray-800">{aplicadasData.totalTransacciones || 0}</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">Descuento acumulado</div>
                  <div className="text-xl font-bold text-emerald-700">₡{Number(aplicadasData.totalDescuento || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="text-xs text-blue-700">Promociones con uso</div>
                  <div className="text-xl font-bold text-blue-700">{(aplicadasData.resumenPorPromo || []).length}</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-600">Fecha</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-600">Promoción</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-600">Descuento</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-600">Monto venta</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-600">Aplicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(aplicadasData.transacciones || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No hay transacciones con promociones en este rango.</td>
                      </tr>
                    ) : (aplicadasData.transacciones || []).map(t => (
                      <tr key={t.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{t.fecha}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium">{t.promocionNombre}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-semibold">₡{Number(t.descuentoAplicado || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-700">₡{Number(t.montoTotal || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {t.aplicacionTipo === 'manual' ? 'Manual' : (t.aplicacionTipo || '-')}
                          {' | '}Cajero: {t.cajeroNombre || '-'}
                          {' | '}Origen: {t.fuente === 'venta_directa' ? 'Venta directa' : 'Pago de cuenta'}
                          {' | '}Motivo: {t.motivoAplicacion || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Historial de promociones eliminadas</h2>
        </div>
        {deletedPromotions.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No hay promociones eliminadas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {deletedPromotions.map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-800">{item.nombre}</div>
                  <button
                    onClick={() => {
                      setRestoreTarget(item)
                      setRestoreMotivo('')
                    }}
                    className="btn btn-outline btn-xs text-green-700"
                  >
                    Restaurar
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Vigencia original: {item.fechaInicio} a {item.fechaFin} | Beneficio: {formatBenefit(item)}
                </div>
                <div className="text-xs text-gray-500">
                  Eliminada: {item.eliminadoAt?.toDate ? toDateStr(item.eliminadoAt.toDate()) : '-'} | Motivo: {item.motivoEliminacion || '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Eliminar promoción expirada</h3>
            <p className="text-sm text-gray-600">
              La promoción se ocultará de la vista principal y quedará en historial.
            </p>
            <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div><span className="text-gray-500">Promoción:</span> {deleteTarget.nombre}</div>
              <div><span className="text-gray-500">Vigencia:</span> {deleteTarget.fechaInicio} a {deleteTarget.fechaFin}</div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Motivo de eliminación *</label>
              <input
                type="text"
                value={deleteMotivo}
                onChange={e => setDeleteMotivo(e.target.value)}
                className="input input-bordered input-sm w-full"
                placeholder="Ej: limpieza de promociones expiradas"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (deleting) return
                  setDeleteTarget(null)
                  setDeleteMotivo('')
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteExpirada}
                className="btn btn-error btn-sm text-white"
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Restaurar promoción</h3>
            <p className="text-sm text-gray-600">
              La promoción volverá al listado principal con estado inactiva.
            </p>
            <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div><span className="text-gray-500">Promoción:</span> {restoreTarget.nombre}</div>
              <div><span className="text-gray-500">Vigencia:</span> {restoreTarget.fechaInicio} a {restoreTarget.fechaFin}</div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Motivo de restauración *</label>
              <input
                type="text"
                value={restoreMotivo}
                onChange={e => setRestoreMotivo(e.target.value)}
                className="input input-bordered input-sm w-full"
                placeholder="Ej: se vuelve a usar en campaña especial"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (restoring) return
                  setRestoreTarget(null)
                  setRestoreMotivo('')
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestorePromocion}
                className="btn btn-success btn-sm text-white"
                disabled={restoring}
              >
                {restoring ? 'Restaurando...' : 'Confirmar restauración'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
