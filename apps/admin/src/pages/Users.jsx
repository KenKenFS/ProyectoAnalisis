import { useState, useEffect, useCallback } from 'react'
import {
  UsersIcon,
  PlusIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import {
  getAllUsers,
  registerUserWithRole,
  updateUserRole,
  updateUserData,
  sendUserPasswordReset,
  deactivateUser,
  reactivateUser,
  VALID_ROLES,
} from '@shared/firebase/auth'
import { useAuth } from '@shared/firebase/AuthContext'

const roleConfig = {
  Admin: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400', avatar: 'bg-violet-100 text-violet-600', label: 'Administrador' },
  Cajero: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', avatar: 'bg-emerald-100 text-emerald-600', label: 'Cajero' },
  Mesero: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400', avatar: 'bg-sky-100 text-sky-600', label: 'Mesero' },
  Cocina: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', avatar: 'bg-amber-100 text-amber-600', label: 'Cocina' },
}

const ROLES = ['Admin', 'Cajero', 'Mesero', 'Cocina']

function validatePassword(pw) {
  const errors = []
  if (pw.length < 8) errors.push('Minimo 8 caracteres')
  if (!/[A-Z]/.test(pw)) errors.push('Al menos una mayuscula')
  if (!/[0-9]/.test(pw)) errors.push('Al menos un numero')
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Al menos un caracter especial')
  return errors
}

export default function Users() {
  const { user: currentAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Formulario de creacion
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('Mesero')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Modal de edicion
  const [editUser, setEditUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [roleConfirmStep, setRoleConfirmStep] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  // Modal de desactivacion/reactivacion
  const [statusModal, setStatusModal] = useState(null)
  const [statusMotivo, setStatusMotivo] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusSuccess, setStatusSuccess] = useState('')

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const pwErrors = validatePassword(password)

  const hasFilters = searchQuery || filterRole || filterStatus

  const filteredUsers = users.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = (u.name || '').toLowerCase().includes(q)
      const matchEmail = (u.email || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail) return false
    }
    if (filterRole && u.role !== filterRole) return false
    if (filterStatus) {
      const s = (u.status || '').toLowerCase()
      const isActive = s === 'active' || s === 'activo'
      if (filterStatus === 'active' && !isActive) return false
      if (filterStatus === 'inactive' && isActive) return false
    }
    return true
  })

  const filteredActive = filteredUsers.filter(u => {
    const s = (u.status || '').toLowerCase()
    return s === 'active' || s === 'activo'
  }).length
  const filteredInactive = filteredUsers.length - filteredActive

  const clearFilters = () => {
    setSearchQuery('')
    setFilterRole('')
    setFilterStatus('')
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || a.createdAt || 0
        const tb = b.createdAt?.toDate?.() || b.createdAt || 0
        return new Date(tb) - new Date(ta)
      })
      setUsers(data)
    } catch (err) {
      console.error('Error cargando usuarios:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // --- Crear usuario ---

  const resetForm = () => {
    setName(''); setEmail(''); setPhone(''); setRole('Mesero')
    setPassword(''); setConfirmPassword('')
    setFormError(''); setFormSuccess(''); setShowPassword(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError(''); setFormSuccess('')

    if (!name.trim() || !email.trim() || !password || !role) {
      setFormError('Completa todos los campos obligatorios.')
      return
    }
    if (pwErrors.length > 0) {
      setFormError('La contraseña no cumple los requisitos.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await registerUserWithRole(email.trim(), password, role, {
        name: name.trim(),
        phone: phone.trim(),
      })
      setFormSuccess(`Usuario ${name.trim()} creado correctamente.`)
      resetForm()
      await loadUsers()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setFormError('Ya existe un usuario registrado con ese correo electronico.')
      } else {
        setFormError(err.message || 'Error al crear el usuario.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // --- Editar usuario ---

  const openEdit = (user) => {
    setEditUser(user)
    setEditName(user.name || '')
    setEditPhone(user.phone || '')
    setEditRole(user.role || '')
    setEditError(''); setEditSuccess('')
    setRoleConfirmStep(false)
    setResetMsg('')
  }

  const closeEdit = () => {
    setEditUser(null)
    setEditError(''); setEditSuccess('')
    setRoleConfirmStep(false)
    setResetMsg('')
  }

  const handleSaveEdit = async () => {
    setEditError(''); setEditSuccess('')

    if (!editName.trim()) {
      setEditError('El nombre es obligatorio.')
      return
    }

    const roleChanged = editRole !== editUser.role
    if (roleChanged && !roleConfirmStep) {
      setRoleConfirmStep(true)
      return
    }

    setEditSaving(true)
    try {
      const dataChanges = {
        name: editName.trim(),
        phone: editPhone.trim(),
      }
      let saved = false

      const hasDataChanges = dataChanges.name !== editUser.name
        || dataChanges.phone !== (editUser.phone || '')

      if (hasDataChanges) {
        await updateUserData(editUser.id, dataChanges, currentAdmin?.uid)
        saved = true
      }

      if (roleChanged) {
        await updateUserRole(editUser.id, editRole, currentAdmin?.uid)
        saved = true
      }

      if (!saved) {
        setEditError('No se detectaron cambios.')
        return
      }

      setEditSuccess('Usuario actualizado correctamente.')
      await loadUsers()
      setTimeout(closeEdit, 1200)
    } catch (err) {
      setEditError(err.message)
      setRoleConfirmStep(false)
    } finally {
      setEditSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!editUser?.email) return
    setResetSending(true)
    setResetMsg('')
    try {
      await sendUserPasswordReset(editUser.email)
      setResetMsg('Correo de restablecimiento enviado.')
    } catch (err) {
      setResetMsg(err.message || 'Error al enviar correo.')
    } finally {
      setResetSending(false)
    }
  }

  // --- Desactivar / Reactivar ---

  const openStatusModal = (user) => {
    const s = (user.status || '').toLowerCase()
    const isActive = s === 'active' || s === 'activo'
    if (isActive && user.id === currentAdmin?.uid) {
      setEditError('No puede desactivar su propia cuenta.')
      return
    }
    setStatusModal({ ...user, isActive })
    setStatusMotivo('')
    setStatusError('')
    setStatusSuccess('')
  }

  const closeStatusModal = () => {
    setStatusModal(null)
    setStatusMotivo('')
    setStatusError('')
    setStatusSuccess('')
  }

  const handleStatusChange = async () => {
    setStatusError('')
    if (!statusMotivo.trim()) {
      setStatusError('Debe ingresar un motivo valido.')
      return
    }
    if (statusMotivo.trim().length > 200) {
      setStatusError('El motivo no puede superar los 200 caracteres.')
      return
    }

    setStatusSaving(true)
    try {
      if (statusModal.isActive) {
        await deactivateUser(statusModal.id, statusMotivo.trim(), currentAdmin?.uid)
        setStatusSuccess('Usuario desactivado correctamente.')
      } else {
        await reactivateUser(statusModal.id, statusMotivo.trim(), currentAdmin?.uid)
        setStatusSuccess('Usuario reactivado correctamente.')
      }
      await loadUsers()
      setTimeout(closeStatusModal, 1200)
    } catch (err) {
      setStatusError(err.message)
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">
            Gestion de Usuarios
          </h1>
          <p className="text-gray-600 text-sm">
            Administracion de usuarios y permisos del sistema
          </p>
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); setShowForm(!showForm) }}
          className="btn btn-primary gap-2"
        >
          {showForm ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          {showForm ? 'Cerrar' : 'Nuevo Usuario'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{filteredUsers.length}</div>
              <div className="text-xs text-gray-400">{hasFilters ? 'Resultados' : 'Total'}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{filteredActive}</div>
              <div className="text-xs text-gray-400">Activos</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{filteredInactive}</div>
              <div className="text-xs text-gray-400">Inactivos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creacion */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Crear nuevo usuario</h2>

          {formError && <div className="alert alert-error mb-4 text-sm">{formError}</div>}
          {formSuccess && <div className="alert alert-success mb-4 text-sm">{formSuccess}</div>}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nombre completo *</span></label>
              <input type="text" className="input input-bordered w-full" value={name}
                onChange={e => setName(e.target.value)} placeholder="Nombre del empleado" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Correo electronico *</span></label>
              <input type="email" className="input input-bordered w-full" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Telefono</span></label>
              <input type="tel" className="input input-bordered w-full" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Rol *</span></label>
              <select className="select select-bordered w-full" value={role}
                onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{roleConfig[r]?.label || r}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Contraseña *</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'}
                  className="input input-bordered w-full pr-10" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8, mayuscula, numero, especial" />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {password && pwErrors.length > 0 && (
                <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                  {pwErrors.map(e => <li key={e}>- {e}</li>)}
                </ul>
              )}
              {password && pwErrors.length === 0 && (
                <p className="mt-1 text-xs text-green-600">Contraseña valida</p>
              )}
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Confirmar contraseña *</span></label>
              <input type={showPassword ? 'text' : 'password'}
                className="input input-bordered w-full" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" className="btn btn-ghost"
                onClick={() => { resetForm(); setShowForm(false) }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="input input-bordered w-full pl-9 input-sm"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select className="select select-bordered select-sm"
            value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{roleConfig[r]?.label || r}</option>)}
          </select>
          <select className="select select-bordered select-sm"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="btn btn-ghost btn-sm gap-1 text-gray-500">
              <XCircleIcon className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="font-semibold text-gray-700">Nombre</th>
                  <th className="font-semibold text-gray-700">Email</th>
                  <th className="font-semibold text-gray-700">Rol</th>
                  <th className="font-semibold text-gray-700">Estado</th>
                  <th className="font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      {hasFilters ? (
                        <div className="space-y-2">
                          <p className="text-gray-400">No se encontraron usuarios con los filtros aplicados</p>
                          <button onClick={clearFilters} className="btn btn-ghost btn-sm text-primary">
                            Limpiar filtros
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400">No hay usuarios registrados</p>
                      )}
                    </td>
                  </tr>
                )}
                {filteredUsers.map(user => {
                  const statusNorm = (user.status || '').toLowerCase()
                  const isActive = statusNorm === 'active' || statusNorm === 'activo'
                  const rc = roleConfig[user.role] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', avatar: 'bg-gray-100 text-gray-500', label: user.role }
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-800">{user.name || '-'}</div>
                        </div>
                      </td>
                      <td className="text-sm text-gray-500">{user.email}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${rc.bg} ${rc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                          {rc.label}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(user)}
                            className="btn btn-ghost btn-sm btn-square text-gray-400 hover:text-gray-600"
                            title="Editar usuario">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => openStatusModal(user)}
                            className={`btn btn-ghost btn-sm btn-square ${isActive ? 'text-gray-400 hover:text-rose-500' : 'text-gray-400 hover:text-emerald-500'}`}
                            title={isActive ? 'Desactivar' : 'Reactivar'}>
                            {isActive
                              ? <UserCircleIcon className="w-4 h-4" />
                              : <ShieldCheckIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edicion */}
      {editUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Editar usuario</h3>
                <button onClick={closeEdit} className="btn btn-ghost btn-sm btn-square">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Correo electronico</p>
                  <p className="text-sm font-medium text-gray-700">{editUser.email}</p>
                </div>
              </div>

              {editError && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{editError}</div>}
              {editSuccess && <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">{editSuccess}</div>}

              {!editSuccess && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Nombre *</span></label>
                      <input type="text" className="input input-bordered w-full"
                        value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Telefono</span></label>
                      <input type="tel" className="input input-bordered w-full"
                        value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Opcional" />
                    </div>
                    <div className="form-control sm:col-span-2">
                      <label className="label"><span className="label-text">Rol</span></label>
                      <select className="select select-bordered w-full" value={editRole}
                        onChange={e => { setEditRole(e.target.value); setRoleConfirmStep(false) }}>
                        {ROLES.map(r => <option key={r} value={r}>{roleConfig[r]?.label || r}</option>)}
                      </select>
                    </div>
                  </div>

                  {roleConfirmStep && editRole !== editUser.role && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        Se cambiara el rol de <span className="font-semibold">{editUser.name}</span> de{' '}
                        <span className="font-semibold">{roleConfig[editUser.role]?.label || editUser.role}</span> a{' '}
                        <span className="font-semibold">{roleConfig[editRole]?.label || editRole}</span>.
                        Si el usuario tiene sesion abierta, debera volver a iniciar sesion.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <KeyIcon className="w-4 h-4" />
                        <span>Contraseña</span>
                      </div>
                      <button onClick={handlePasswordReset}
                        className="btn btn-ghost btn-sm text-sm"
                        disabled={resetSending}>
                        {resetSending
                          ? <span className="loading loading-spinner loading-xs" />
                          : 'Enviar correo de restablecimiento'}
                      </button>
                    </div>
                    {resetMsg && (
                      <p className={`text-xs mt-2 ${resetMsg.includes('enviado') ? 'text-emerald-600' : 'text-red-500'}`}>
                        {resetMsg}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeEdit} className="btn btn-ghost btn-sm">Cancelar</button>
                    <button onClick={handleSaveEdit} className="btn btn-primary btn-sm" disabled={editSaving}>
                      {editSaving
                        ? <span className="loading loading-spinner loading-sm" />
                        : roleConfirmStep && editRole !== editUser.role
                          ? 'Confirmar cambios'
                          : 'Guardar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de desactivacion / reactivacion */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {statusModal.isActive ? 'Desactivar usuario' : 'Reactivar usuario'}
                </h3>
                <button onClick={closeStatusModal} className="btn btn-ghost btn-sm btn-square">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-gray-700">{statusModal.name}</p>
                <p className="text-xs text-gray-500">{statusModal.email}</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium mt-1 ${statusModal.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusModal.isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  {statusModal.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {statusModal.isActive && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                  <p className="text-sm text-rose-700">
                    Al desactivar este usuario, se le impedira iniciar sesion. Si tiene una sesion abierta, se le denegara el acceso en la siguiente accion.
                  </p>
                </div>
              )}

              {statusError && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{statusError}</div>}
              {statusSuccess && <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">{statusSuccess}</div>}

              {!statusSuccess && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Motivo *</span>
                      <span className="label-text-alt text-gray-400">{statusMotivo.length}/200</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={3}
                      maxLength={200}
                      value={statusMotivo}
                      onChange={e => setStatusMotivo(e.target.value)}
                      placeholder={statusModal.isActive
                        ? 'Razon de la desactivacion...'
                        : 'Razon de la reactivacion...'}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeStatusModal} className="btn btn-ghost btn-sm">Cancelar</button>
                    <button onClick={handleStatusChange}
                      className={`btn btn-sm ${statusModal.isActive ? 'btn-error' : 'btn-success'}`}
                      disabled={statusSaving}>
                      {statusSaving
                        ? <span className="loading loading-spinner loading-sm" />
                        : statusModal.isActive ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
