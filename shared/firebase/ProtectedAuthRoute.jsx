import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedAuthRoute({ children, requiredRole = null, allowedRoles = null }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-white text-lg">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole) {
    if (!role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <p className="text-white text-lg">Cargando datos...</p>
          </div>
        </div>
      )
    }
    
    if (role?.toLowerCase() !== requiredRole.toLowerCase()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900">
          <div className="card bg-white/95 shadow-xl p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
            <p className="text-gray-700 mb-6">No tienes permiso para acceder a esta sección</p>
            <div className="space-y-2 mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Tu rol: <strong>{role || 'N/A'}</strong></p>
              <p className="text-sm text-gray-600">Rol requerido: <strong>{requiredRole}</strong></p>
            </div>
            <a href="/login" className="btn btn-primary">Cambiar Usuario</a>
          </div>
        </div>
      )
    }
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(role?.toLowerCase())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900">
        <div className="card bg-white/95 shadow-xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 mb-6">Tu rol no tiene permiso para esta sección</p>
          <div className="space-y-2 mb-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Tu rol: <strong>{role || 'N/A'}</strong></p>
            <p className="text-sm text-gray-600">Roles permitidos: <strong>{allowedRoles.join(', ')}</strong></p>
          </div>
          <a href="/login" className="btn btn-primary">Cambiar Usuario</a>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedAuthRoute
