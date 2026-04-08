import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import RestaurantLogo from '../components/RestaurantLogo'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Por favor completa todos los campos'); return }
    setLoading(true)
    try {
      const { loginCliente } = await import('../utils/clientAuth')
      await loginCliente(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const { loginClienteGoogle } = await import('../utils/clientAuth')
      await loginClienteGoogle()
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Error con Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-ceviche-dark flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ceviche-red-dim/80 via-ceviche-dark to-ceviche-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(153,27,27,0.4)_0%,transparent_50%)]" />
        {/* Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.5\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}
        />

        <div className="relative z-10">
          <Link to="/">
            <RestaurantLogo size="md" showTagline />
          </Link>
        </div>

        <div className="relative z-10">
          <blockquote className="text-3xl font-playfair italic text-white/90 leading-relaxed mb-6">
            "El mejor ceviche de Costa Rica,<br />preparado con el corazón."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-px bg-ceviche-red-light" />
            <p className="text-white/50 text-sm">Santa Ana, San José · +506 2203-5109</p>
          </div>
        </div>

        <div className="relative z-10 flex gap-2">
          {['Lun–Mié 11:45–21:30', 'Jue–Sáb 11:30–21:30', 'Dom 11:45–20:45'].map(h => (
            <span key={h} className="text-[11px] text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-ceviche-black px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo mobile */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Link to="/">
              <RestaurantLogo size="lg" showTagline />
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-playfair font-semibold text-white mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-white/40 text-sm">
              Inicia sesión para gestionar tus reservas y perfil
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full"
                placeholder="tu@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/50 uppercase mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark w-full pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
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
                : 'Iniciar Sesión'
              }
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-ceviche-black text-white/30 text-xs uppercase tracking-wider">
                o continúa con
              </span>
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
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-white hover:text-ceviche-red-light font-medium transition-colors">
              Crear cuenta gratis
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link to="/" className="text-white/25 hover:text-white/50 text-xs transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
