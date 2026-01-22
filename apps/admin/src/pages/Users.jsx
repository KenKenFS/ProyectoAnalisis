import { useState } from 'react'
import {
  UsersIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

const employees = [
  { id: 1, name: 'Carlos Mendoza', email: 'carlos.mendoza@ceviche.com', role: 'Admin', status: 'Activo' },
  { id: 2, name: 'María García', email: 'maria.garcia@ceviche.com', role: 'Cajero', status: 'Activo' },
  { id: 3, name: 'Juan Rodríguez', email: 'juan.rodriguez@ceviche.com', role: 'Mesero', status: 'Activo' },
  { id: 4, name: 'Sofia Pérez', email: 'sofia.perez@ceviche.com', role: 'Cocina', status: 'Activo' },
  { id: 5, name: 'Luis Martínez', email: 'luis.martinez@ceviche.com', role: 'Mesero', status: 'Activo' },
  { id: 6, name: 'Ana Sánchez', email: 'ana.sanchez@ceviche.com', role: 'Cajero', status: 'Inactivo' },
  { id: 7, name: 'Diego López', email: 'diego.lopez@ceviche.com', role: 'Cocina', status: 'Activo' },
  { id: 8, name: 'Patricia Torres', email: 'patricia.torres@ceviche.com', role: 'Admin', status: 'Inactivo' },
]

const roleConfig = {
  'Admin': { color: 'bg-purple-500', label: 'Administrador' },
  'Cajero': { color: 'bg-green-500', label: 'Cajero' },
  'Mesero': { color: 'bg-blue-500', label: 'Mesero' },
  'Cocina': { color: 'bg-orange-500', label: 'Cocina' },
}

export default function Users() {
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const activeUsers = employees.filter(u => u.status === 'Activo').length
  const inactiveUsers = employees.filter(u => u.status === 'Inactivo').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Gestión de Usuarios</h1>
          <p className="text-gray-600 text-sm">Administración de usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSelectedUser(null); }}
          className="btn btn-primary gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {showForm ? 'Cerrar' : 'Nuevo Usuario'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{employees.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
        <div className="card bg-white border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <div className="text-xs text-gray-500">Activos</div>
            </div>
          </div>
        </div>
        <div className="card bg-white border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{inactiveUsers}</div>
              <div className="text-xs text-gray-500">Inactivos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-white border border-gray-100 overflow-hidden">
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
              {employees.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${roleConfig[user.role]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-gray-800">{user.name}</div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{user.email}</td>
                  <td>
                    <span className={`badge ${roleConfig[user.role]?.color} text-white`}>
                      {roleConfig[user.role]?.label}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'Activo' ? 'badge-success' : 'badge-ghost'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedUser(user)} className="btn btn-ghost btn-sm gap-1">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-red-500 gap-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
