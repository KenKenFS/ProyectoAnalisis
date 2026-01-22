import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, loginWithGoogle } from '../firebase/auth'
import {
  EnvelopeIcon,
  KeyIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export default function LoginForm({
  appName = 'Ceviche del Rey',
  appSubtitle = 'Sistema de Gestion',
  moduleTitle = '',
  formTitle = 'Iniciar Sesion',
  redirectPath = '/',
  testUsers = [],
  showGoogleLogin = true,
}) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const user = await loginUser(email, password)
      
      if (user) {
        setSuccess('Login exitoso, redirigiendo...')
        
        localStorage.setItem('userEmail', user.email)
        localStorage.setItem('uid', user.uid)
        
        setTimeout(() => {
          navigate(redirectPath)
        }, 500)
      }
    } catch (err) {
      const errorMsg = err.message || 'Error en el login'
      
      if (errorMsg.includes('user-not-found')) {
        setError('Usuario no encontrado. Verifica tu email.')
      } else if (errorMsg.includes('wrong-password')) {
        setError('Contrasena incorrecta.')
      } else if (errorMsg.includes('invalid-email')) {
        setError('Email invalido.')
      } else if (errorMsg.includes('too-many-requests')) {
        setError('Demasiados intentos. Intenta mas tarde.')
      } else {
        setError(errorMsg)
      }
      
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleTestLogin(testUser) {
    setEmail(testUser.email)
    setPassword(testUser.password)
    setTimeout(() => {
      handleLogin({ preventDefault: () => {} })
    }, 100)
  }

  async function handleGoogleLogin() {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const user = await loginWithGoogle()
      
      if (user) {
        setSuccess('Login con Google exitoso, redirigiendo...')
        localStorage.setItem('userEmail', user.email)
        localStorage.setItem('uid', user.uid)
        
        setTimeout(() => {
          navigate(redirectPath)
        }, 500)
      }
    } catch (err) {
      const errorMsg = err.message || 'Error en el login con Google'
      setError(errorMsg)
      console.error('Google login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo y titulo */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-cyan-400/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2 font-poppins">
          {appName}
        </h1>
        <p className="text-cyan-200 text-lg">{appSubtitle}</p>
        {moduleTitle && (
          <p className="text-cyan-300/60 text-sm mt-1">{moduleTitle}</p>
        )}
      </div>

      {/* Card de login */}
      <div className="card bg-white/95 backdrop-blur shadow-2xl border border-white/20 rounded-xl">
        <div className="card-body p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 font-poppins">
            {formTitle}
          </h2>

          {/* Mensajes */}
          {error && (
            <div className="alert alert-error bg-red-50 border-l-4 border-red-500 rounded-lg mb-4">
              <div className="flex gap-3">
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="alert alert-success bg-green-50 border-l-4 border-green-500 rounded-lg mb-4">
              <div className="flex gap-3">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-green-600" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-700 font-medium flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  Email
                </span>
              </label>
              <input
                type="email"
                placeholder="correo@ceviche.cr"
                className="input input-bordered bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-700 font-medium flex items-center gap-2">
                  <KeyIcon className="w-4 h-4" />
                  Contrasena
                </span>
              </label>
              <input
                type="password"
                placeholder="********"
                className="input input-bordered bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Boton Login */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-6 text-white font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>

            {/* Google Login */}
            {showGoogleLogin && (
              <>
                <div className="divider text-gray-300 text-xs my-4">O continua con</div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="btn btn-outline w-full text-gray-700 hover:bg-gray-50 border-gray-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </>
            )}
          </form>

          {/* Usuarios de prueba */}
          {testUsers && testUsers.length > 0 && (
            <>
              <div className="divider text-gray-400 text-xs my-6">Usuarios de Prueba</div>

              <div className="space-y-2">
                {testUsers.map(user => (
                  <button
                    key={user.email}
                    onClick={() => handleTestLogin(user)}
                    disabled={loading}
                    className="w-full btn btn-sm btn-ghost justify-start border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-left"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{user.password}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Universidad Fidelitas - SC-702</p>
            <p className="mt-1">Demo: Firebase Authentication</p>
          </div>
        </div>
      </div>
    </div>
  )
}
