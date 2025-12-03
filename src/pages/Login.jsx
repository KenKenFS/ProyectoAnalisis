import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const roles = [
  { id: 'Admin', label: 'Administrador', desc: 'Acceso completo al sistema', color: 'from-purple-500 to-indigo-600' },
  { id: 'Cajero', label: 'Cajero', desc: 'POS y cobros', color: 'from-green-500 to-emerald-600' },
  { id: 'Mesero', label: 'Mesero', desc: 'Pedidos y mesas', color: 'from-blue-500 to-cyan-600' },
  { id: 'Cocina', label: 'Cocina', desc: 'Cola de pedidos', color: 'from-orange-500 to-amber-600' },
  { id: 'Cliente', label: 'Cliente', desc: 'Portal público', color: 'from-pink-500 to-rose-600' },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)

  function handleLogin(role) {
    const r = role || selectedRole
    if (!r) return
    localStorage.setItem('role', r)
    localStorage.setItem('name', name || r)
    if (r === 'Cliente') navigate('/portal')
    else if (r === 'Cocina') navigate('/cocina')
    else if (r === 'Admin') navigate('/admin')
    else navigate('/pos')
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Logo y título */}
      <div className="text-center mb-10 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-poppins">
          Ceviche del Rey
        </h1>
        <p className="text-cyan-200 text-lg">Plataforma Inteligente para Restaurantes</p>
        <p className="text-cyan-300/70 text-sm mt-1">Universidad Fidélitas — SC-702</p>
      </div>

      {/* Card principal */}
      <div className="card bg-white/95 backdrop-blur shadow-2xl">
        <div className="card-body p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1 font-poppins">
            Iniciar Sesión
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Selecciona un rol para explorar el prototipo de demostración
          </p>

          {/* Campos opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-600">Nombre (opcional)</span>
              </label>
              <input
                className="input input-bordered bg-gray-50 focus:bg-white transition-colors"
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-600">Email (demo)</span>
              </label>
              <input
                className="input input-bordered bg-gray-50 focus:bg-white transition-colors"
                placeholder="usuario@demo.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Selección de roles */}
          <div className="mb-6">
            <label className="label">
              <span className="label-text text-gray-600 font-medium">Selecciona tu rol:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleLogin(role.id)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    selectedRole === role.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {role.id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="font-semibold text-gray-800">{role.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Separador */}
          <div className="divider text-gray-400">O acceso rápido</div>

          {/* Botones rápidos */}
          <div className="flex flex-wrap justify-center gap-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleLogin(role.id)}
                className={`btn btn-sm bg-gradient-to-r ${role.color} text-white border-0 hover:opacity-90`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Footer info */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500">
              <p className="mb-1">
                <strong>Equipo:</strong> Rosemary Carballo • Kency Fallas • Daniel Rodríguez
              </p>
              <p>
                Proyecto académico SC-702 Diseño y Desarrollo de Sistemas
              </p>
              <p className="mt-1 text-gray-400">
                Propietaria: Rosa Luz Anticona Sotomayor — Ceviche del Rey, Costa Rica
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nota legal */}
      <p className="text-center text-cyan-200/60 text-xs mt-6">
        Este es un prototipo de demostración sin funcionalidad real.
        <br />Todos los datos son ficticios con fines académicos.
      </p>
    </div>
  )
}
