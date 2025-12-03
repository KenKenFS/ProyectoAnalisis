import { useState } from 'react'
import { users } from '../data/fakeData'
import {
  UsersIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  EnvelopeIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'

const roleConfig = {
  'Admin': { color: 'bg-purple-500', label: 'Administrador' },
  'Cajero': { color: 'bg-green-500', label: 'Cajero' },
  'Mesero': { color: 'bg-blue-500', label: 'Mesero' },
  'Cocina': { color: 'bg-orange-500', label: 'Cocina' },
}

export default function Users() {
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const activeUsers = users.filter(u => u.status === 'Activo').length

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{users.length}</div>
              <div className="text-xs text-gray-500">Total usuarios</div>
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
        <div className="card bg-white border border-purple-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'Admin').length}</div>
              <div className="text-xs text-gray-500">Admins</div>
            </div>
          </div>
        </div>
        <div className="card bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{users.length - activeUsers}</div>
              <div className="text-xs text-gray-500">Inactivos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-primary" />
            {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <UserCircleIcon className="w-4 h-4" />
                  Nombre completo
                </span>
              </label>
              <input
                className="input input-bordered"
                placeholder="Ej: Juan Pérez"
                defaultValue={selectedUser?.name || ''}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <EnvelopeIcon className="w-4 h-4" />
                  Email
                </span>
              </label>
              <input
                className="input input-bordered"
                type="email"
                placeholder="usuario@ceviche.cr"
                defaultValue={selectedUser?.email || ''}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Rol
                </span>
              </label>
              <select className="select select-bordered" defaultValue={selectedUser?.role || ''}>
                <option value="" disabled>Seleccionar rol</option>
                <option value="Admin">Administrador</option>
                <option value="Cajero">Cajero</option>
                <option value="Mesero">Mesero</option>
                <option value="Cocina">Cocina</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <KeyIcon className="w-4 h-4" />
                  {selectedUser ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'}
                </span>
              </label>
              <input
                className="input input-bordered"
                type="password"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-success gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              {selectedUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setSelectedUser(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.status === 'Inactivo' ? 'opacity-60' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${roleConfig[u.role]?.color || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-sm`}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="font-medium text-gray-800">{u.name}</div>
                    </div>
                  </td>
                  <td className="text-gray-600">{u.email}</td>
                  <td>
                    <span className={`badge ${roleConfig[u.role]?.color || 'bg-gray-500'} text-white border-0`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'Activo' ? 'badge-success' : 'badge-ghost'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelectedUser(u); setShowForm(true); }}
                        className="btn btn-ghost btn-sm btn-circle"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-circle text-red-500">
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

      {/* Role Distribution & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-white border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Distribución por Rol
          </h3>
          <div className="space-y-3">
            {Object.entries(roleConfig).map(([role, config]) => {
              const count = users.filter(u => u.role === role).length
              const percentage = (count / users.length) * 100
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {role.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700">{config.label}</span>
                      <span className="text-sm text-gray-500">{count} usuarios</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.color} rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card bg-white border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="font-medium text-gray-800">Rosa Luz inició sesión</div>
              <div className="text-xs text-gray-500">Hace 2 minutos • Admin</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="font-medium text-gray-800">Ana María creó orden ORD-004</div>
              <div className="text-xs text-gray-500">Hace 15 minutos • Mesero</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div className="font-medium text-gray-800">Marcos registró cobro</div>
              <div className="text-xs text-gray-500">Hace 22 minutos • Cajero</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <div className="font-medium text-gray-800">Luis modificó estado de pedido</div>
              <div className="text-xs text-gray-500">Hace 35 minutos • Cocina</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
