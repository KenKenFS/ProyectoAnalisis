import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, loginWithGoogle, sendUserPasswordReset } from '../firebase/auth'
import {
  EnvelopeIcon,
  KeyIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '../context/ThemeContext'

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
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()

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
      const code = err.code || ''
      const msg = err.message || ''

      if (code === 'ACCOUNT_INACTIVE') {
        setError('Cuenta inactiva. Contacta al administrador.')
      } else if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
        setError('Demasiados intentos fallidos. Tu cuenta fue bloqueada temporalmente. Intenta de nuevo en unos minutos.')
      } else if (code === 'auth/invalid-credential' || msg.includes('invalid-credential')) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      } else if (msg.includes('user-not-found')) {
        setError('Usuario no encontrado. Verifica tu email.')
      } else if (msg.includes('wrong-password')) {
        setError('Contraseña incorrecta.')
      } else if (msg.includes('invalid-email')) {
        setError('Email invalido.')
      } else {
        setError(msg)
      }
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
      const code = err.code || ''
      if (code === 'ACCOUNT_INACTIVE') {
        setError('Cuenta inactiva. Contacta al administrador.')
      } else {
        setError(err.message || 'Error en el login con Google')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!resetEmail) { setResetMsg('Ingresa tu correo electronico.'); return }
    setResetLoading(true)
    setResetMsg('')
    try {
      await sendUserPasswordReset(resetEmail, `${window.location.origin}/reset-password`)
      setResetMsg('Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.')
    } catch (_) {
      setResetMsg('Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo y titulo */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/20 ring-1 ring-cyan-400/30 dark:border dark:border-red-950/50 dark:bg-zinc-900 dark:shadow-[0_0_20px_rgba(127,29,29,0.35)] dark:ring-2 dark:ring-red-900/45">
            <svg
              className="h-8 w-8 text-cyan-300 dark:text-red-300/90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2 font-poppins">
          {appName}
        </h1>
        <p className="text-cyan-200 text-lg dark:text-zinc-300">{appSubtitle}</p>
        {moduleTitle && (
          <p className="text-cyan-300/60 text-sm mt-1 dark:text-red-300/55">{moduleTitle}</p>
        )}
      </div>

      {/* Card de login */}
      <div className="card bg-white/95 backdrop-blur shadow-2xl border border-white/20 rounded-xl relative overflow-hidden">
        <div className="card-body p-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-zinc-100 font-poppins">
              {formTitle}
            </h2>
            <button
              type="button"
              onClick={toggleTheme}
              className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 dark:border-red-950/40 dark:bg-zinc-900 dark:text-red-300/90 dark:hover:bg-zinc-800 dark:hover:text-red-200"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5 text-cyan-700" />
              )}
            </button>
          </div>

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
                  Contraseña
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

            <div className="text-right">
              <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); setResetMsg('') }}
                className="text-xs text-primary hover:underline">
                Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2 text-white font-semibold"
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

          {testUsers && testUsers.length > 0 && (
            <details className="group mt-4 rounded-lg border border-gray-200/90 bg-gray-50/90 dark:border-zinc-700 dark:bg-zinc-900/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-gray-600 transition hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                <span>Credenciales de prueba ({testUsers.length})</span>
                <ChevronDownIcon className="h-4 w-4 shrink-0 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-1 border-t border-gray-200/90 px-2 py-2 dark:border-zinc-700">
                {testUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => handleTestLogin(user)}
                    disabled={loading}
                    className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition hover:bg-white disabled:opacity-50 dark:hover:bg-zinc-800"
                  >
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-gray-800 dark:text-zinc-200">{user.name}</span>
                      <span className="shrink-0 rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {user.role}
                      </span>
                    </span>
                    <span className="truncate font-mono text-[10px] text-gray-500 dark:text-zinc-500">
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-700 text-center text-xs text-gray-500 dark:text-zinc-400">
            <p>Universidad Fidelitas - SC-803</p>
            <p className="mt-1">Firebase Authentication</p>
          </div>

          {/* Panel de recuperación de contraseña */}
          {showReset && (
            <div className="absolute inset-0 bg-white rounded-xl p-8 overflow-y-auto">
              <div className="max-w-md">
                <button onClick={() => { setShowReset(false); setResetMsg('') }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Volver al login
                </button>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Recuperar contraseña</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                {resetMsg && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">{resetMsg}</p>
                  </div>
                )}
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="form-control">
                    <input type="email" placeholder="correo@ceviche.cr"
                      className="input input-bordered bg-gray-50 w-full"
                      value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      disabled={resetLoading} />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={resetLoading}>
                    {resetLoading
                      ? <span className="loading loading-spinner loading-sm" />
                      : 'Enviar enlace'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
