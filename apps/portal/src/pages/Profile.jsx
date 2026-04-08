import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/perfil' } } })
      return
    }
    loadCliente()
  }, [user, navigate])

  const loadCliente = async () => {
    try {
      const { getClienteByUid } = await import('../utils/clientAuth')
      const data = await getClienteByUid(user.uid)
      setCliente(data)
      setFormData({
        nombre: data?.nombre || '',
        telefono: data?.telefono || '',
      })
    } catch (e) {
      setError('Error al cargar los datos del perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { updateCliente } = await import('../utils/clientAuth')
      await updateCliente(user.uid, {
        nombre: formData.nombre,
        telefono: formData.telefono,
      })
      setSuccess('Perfil actualizado correctamente')
      setEditing(false)
      await loadCliente()
    } catch (e) {
      setError(e.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (passwordData.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    setChangingPassword(true)
    setError('')
    try {
      const { reauthenticateAndChangePassword } = await import('../utils/clientAuth')
      await reauthenticateAndChangePassword(user.email, passwordData.currentPassword, passwordData.newPassword)
      setSuccess('Contraseña actualizada correctamente')
      setShowPasswordModal(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      setError(e.message || 'Error al cambiar la contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      setError('Debes escribir ELIMINAR para confirmar')
      return
    }

    setDeleting(true)
    setError('')
    try {
      const { deleteClienteAccount } = await import('../utils/clientAuth')
      await deleteClienteAccount(user.uid)
      await logout()
      navigate('/')
    } catch (e) {
      setError(e.message || 'Error al eliminar la cuenta')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ceviche-red" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in section-padding">
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-white mb-4">
            Mi Perfil
          </h1>
          <p className="text-white/60">
            Gestiona tu información personal y preferencias de cuenta
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <div className="card-dark p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5 text-ceviche-red-light" />
              Información Personal
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Nombre completo
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-dark w-full"
                />
              ) : (
                <p className="text-white">{cliente?.nombre || 'No especificado'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4" />
                Correo electrónico
              </label>
              <p className="text-white/80">{user?.email}</p>
              <p className="text-xs text-white/40 mt-1">
                El correo no puede modificarse desde aquí
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <PhoneIcon className="w-4 h-4" />
                Teléfono
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="input-dark w-full"
                  placeholder="8888-8888"
                />
              ) : (
                <p className="text-white">{cliente?.telefono || 'No especificado'}</p>
              )}
            </div>

            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      nombre: cliente?.nombre || '',
                      telefono: cliente?.telefono || '',
                    })
                    setError('')
                  }}
                  className="btn-secondary px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card-dark p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <LockClosedIcon className="w-5 h-5 text-ceviche-red-light" />
            Seguridad
          </h2>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn-secondary px-6 py-3 rounded-lg w-full sm:w-auto"
          >
            Cambiar contraseña
          </button>
        </div>

        <div className="card-dark p-8 border-red-500/20">
          <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            Zona de Peligro
          </h2>
          <p className="text-white/60 mb-6">
            Al eliminar tu cuenta, perderás acceso a tu historial de reservas y todos los datos asociados. 
            Esta acción no se puede deshacer.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Eliminar mi cuenta
          </button>
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-dark p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                Cambiar contraseña
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Contraseña actual</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input-dark w-full pr-10"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                    >
                      {showPasswords.current ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input-dark w-full pr-10"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                    >
                      {showPasswords.new ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Confirmar nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="input-dark w-full pr-10"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                    >
                      {showPasswords.confirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="btn-primary px-4 py-2 rounded-lg flex-1"
                >
                  {changingPassword ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto" />
                  ) : (
                    'Cambiar'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setError('')
                  }}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-dark p-6 w-full max-w-md border-red-500/30">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                ¿Eliminar tu cuenta?
              </h3>
              <p className="text-white/70 mb-4 text-sm">
                Esta acción eliminará permanentemente tu cuenta y todos tus datos. 
                Para confirmar, escribe <strong className="text-white">ELIMINAR</strong> en el campo de abajo.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-dark w-full mb-4"
                placeholder="Escribe ELIMINAR"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== 'ELIMINAR'}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <TrashIcon className="w-4 h-4" />
                      Eliminar permanentemente
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                    setError('')
                  }}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
