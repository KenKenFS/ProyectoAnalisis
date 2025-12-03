import { Navigate } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ProtectedRoute({ children, allowed = [] }) {
  const role = localStorage.getItem('role')

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (allowed.length && !allowed.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="card bg-red-50 border border-red-200 p-8 max-w-md text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">
            No tienes permiso para acceder a esta sección con el rol <strong>{role}</strong>.
          </p>
          <p className="text-sm text-gray-600">
            Roles permitidos: {allowed.join(', ')}
          </p>
        </div>
      </div>
    )
  }

  return children
}
