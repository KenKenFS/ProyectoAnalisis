import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import RestaurantLogo from '../components/RestaurantLogo'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos obligatorios'); return false
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres'); return false
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos una mayúscula'); return false
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos un número'); return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden'); return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true); setError('')
    try {
      const { registerCliente } = await import('../utils/clientAuth')
      await registerCliente({ nombre: formData.nombre, email: formData.email, telefono: formData.telefono, password: formData.password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2200)
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const { loginClienteGoogle } = await import('../utils/clientAuth')
      await loginClienteGoogle()
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al registrarse con Google')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ceviche-black px-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-playfair font-semibold text-white mb-2">¡Cuenta creada!</h2>
          <p className="text-white/50">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-ceviche-dark flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ceviche-dark via-ceviche-black to-ceviche-red-dim/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(153,27,27,0.35)_0%,transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.5\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}
        />
        <div className="relative z-10">
          <Link to="/"><RestaurantLogo size="md" showTagline /></Link>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-2xl font-playfair text-white/90 leading-relaxed">
            Tu mesa favorita,<br />
            <span className="italic text-ceviche-red-light">reservada en segundos.</span>
          </h2>
          <ul className="space-y-3">
            {[
              'Reservas online sin costo',
              'Historial de visitas',
              'Notificaciones por correo',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-white/50 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-ceviche-red flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10">
          <p className="text-white/25 text-xs">Santa Ana, San José · +506 2203-5109</p>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-7/12 flex items-center justify-center bg-ceviche-black px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-10 flex justify-center">
            <Link to="/"><RestaurantLogo size="lg" showTagline /></Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-playfair font-semibold text-white mb-2">Crear cuenta</h2>
            <p className="text-white/40 text-sm">Regístrate para reservar y gestionar tus visitas</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="Tu nombre"
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Correo electrónico *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="tu@email.com"
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="input-dark w-full"
                placeholder="88888888"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-dark w-full pr-12"
                  placeholder="Mín. 8 caracteres"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-white/30 text-xs mt-1.5">Mínimo 8 caracteres, una mayúscula y un número</p>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-dark w-full pr-12"
                  placeholder="Repite la contraseña"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showConfirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Crear cuenta'
              }
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-ceviche-black text-white/30 text-xs uppercase tracking-wider">o continúa con</span>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-medium text-sm flex items-center justify-center gap-3 transition-all hover:bg-white/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              <path fill="#4285F4" d="M21.8 10.22h-9.8v3.78h5.6c-.52 2.58-2.72 4.22-5.6 4.22-3.38 0-6.14-2.82-6.14-6.22S8.62 5.78 12 5.78c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 5.93 1 1 5.93 1 12s4.93 11 11 11c6.08 0 10.5-4.3 10.5-11 0-.62-.06-1.24-.17-1.78z"/>
              <path fill="#34A853" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#FBBC05" d="M12 23c3.24 0 5.95-1.07 7.93-2.91l-3.65-2.83c-1.02.69-2.35 1.09-4.28 1.09-2.88 0-5.3-1.93-6.16-4.53l-3.66 2.84C3.99 20.53 7.7 23 12 23z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="mt-8 text-center text-white/40 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-white hover:text-ceviche-red-light font-medium transition-colors">
              Iniciar sesión
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="text-white/25 hover:text-white/50 text-xs transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
