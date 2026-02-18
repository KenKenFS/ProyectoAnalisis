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
} from '@heroicons/react/24/outline'
import { getAllUsers, registerUserWithRole } from '@shared/firebase/auth'

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
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('Mesero')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const pwErrors = validatePassword(password)

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

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setRole('Mesero')
    setPassword('')
    setConfirmPassword('')
    setFormError('')
    setFormSuccess('')
    setShowPassword(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!name.trim() || !email.trim() || !password || !role) {
      setFormError('Completa todos los campos obligatorios.')
      return
    }

    if (pwErrors.length > 0) {
      setFormError('La contrasena no cumple los requisitos.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Las contrasenas no coinciden.')
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

  const activeUsers = users.filter(u => {
    const s = (u.status || '').toLowerCase()
    return s === 'active' || s === 'activo'
  }).length
  const inactiveUsers = users.length - activeUsers

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
          onClick={() => {
            if (showForm) resetForm()
            setShowForm(!showForm)
          }}
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
              <div className="text-xl font-semibold text-gray-800">{users.length}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{activeUsers}</div>
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
              <div className="text-xl font-semibold text-gray-800">{inactiveUsers}</div>
              <div className="text-xs text-gray-400">Inactivos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creacion */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Crear nuevo usuario</h2>

          {formError && (
            <div className="alert alert-error mb-4 text-sm">{formError}</div>
          )}
          {formSuccess && (
            <div className="alert alert-success mb-4 text-sm">{formSuccess}</div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nombre completo *</span></label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del empleado"
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Correo electronico *</span></label>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Telefono</span></label>
              <input
                type="tel"
                className="input input-bordered w-full"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Rol *</span></label>
              <select
                className="select select-bordered w-full"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{roleConfig[r]?.label || r}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Contrasena *</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input input-bordered w-full pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8, mayuscula, numero, especial"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword
                    ? <EyeSlashIcon className="w-5 h-5" />
                    : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {password && pwErrors.length > 0 && (
                <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                  {pwErrors.map(e => <li key={e}>- {e}</li>)}
                </ul>
              )}
              {password && pwErrors.length === 0 && (
                <p className="mt-1 text-xs text-green-600">Contrasena valida</p>
              )}
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Confirmar contrasena *</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite la contrasena"
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-500">Las contrasenas no coinciden</p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { resetForm(); setShowForm(false) }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-8">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
                {users.map(user => {
                  const statusNorm = (user.status || '').toLowerCase()
                  const isActive = statusNorm === 'active' || statusNorm === 'activo'
                  const rc = roleConfig[user.role] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', avatar: 'bg-gray-100 text-gray-500', label: user.role }
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${rc.avatar} flex items-center justify-center text-sm font-semibold`}>
                            {(user.name || '?').charAt(0).toUpperCase()}
                          </div>
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
                        <button className="btn btn-ghost btn-sm btn-square text-gray-400 hover:text-gray-600">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
