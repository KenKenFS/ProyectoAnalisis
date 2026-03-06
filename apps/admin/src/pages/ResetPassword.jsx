import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { confirmUserPasswordReset, verifyUserPasswordResetCode } from '@shared/firebase/auth'
import { CheckCircleIcon, ExclamationCircleIcon, KeyIcon } from '@heroicons/react/24/outline'

function getPasswordChecks(password) {
  return [
    { id: 'len', label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { id: 'upper', label: 'Al menos 1 mayúscula', ok: /[A-Z]/.test(password) },
    { id: 'number', label: 'Al menos 1 número', ok: /[0-9]/.test(password) },
    { id: 'special', label: 'Al menos 1 carácter especial', ok: /[^A-Za-z0-9]/.test(password) },
  ]
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loadingCode, setLoadingCode] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const oobCode = params.get('oobCode') || ''

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password])
  const passwordIsValid = useMemo(() => passwordChecks.every((check) => check.ok), [passwordChecks])

  useEffect(() => {
    let mounted = true
    async function verifyCode() {
      if (!oobCode) {
        if (mounted) {
          setError('El enlace no es valido o esta incompleto.')
          setLoadingCode(false)
        }
        return
      }

      try {
        const codeEmail = await verifyUserPasswordResetCode(oobCode)
        if (!mounted) return
        setEmail(codeEmail || '')
        setError('')
      } catch (_) {
        if (!mounted) return
        setError('El enlace de recuperacion es invalido o ya vencio.')
      } finally {
        if (mounted) setLoadingCode(false)
      }
    }

    verifyCode()
    return () => { mounted = false }
  }, [oobCode])

  async function onSubmit(e) {
    e.preventDefault()
    if (submitting || loadingCode) return
    setError('')
    setSuccess('')

    if (!password || !confirmPassword) {
      setError('Completa ambos campos de contraseña.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!passwordIsValid) {
      setError('La contraseña no cumple los requisitos.')
      return
    }

    try {
      setSubmitting(true)
      await confirmUserPasswordReset(oobCode, password)
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.')
      setTimeout(() => navigate('/login'), 1200)
    } catch (_) {
      setError('No se pudo restablecer la contraseña. Solicita un enlace nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2 font-poppins">Ceviche del Rey</h1>
        <p className="text-cyan-200 text-lg">Sistema de Gestión</p>
        <p className="text-cyan-300/60 text-sm mt-1">Recuperar contraseña</p>
      </div>

      <div className="card bg-white/95 backdrop-blur shadow-2xl border border-white/20 rounded-xl">
        <div className="card-body p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2 font-poppins">Restablecer contraseña</h2>
          {email && <p className="text-sm text-gray-500 mb-4">Cuenta: {email}</p>}

          {loadingCode && (
            <div className="py-6 text-center text-gray-600">
              <span className="loading loading-spinner loading-md"></span>
              <p className="mt-2 text-sm">Validando enlace...</p>
            </div>
          )}

          {!loadingCode && error && (
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

          {!loadingCode && !success && !error.includes('invalido') && !error.includes('incompleto') && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-gray-700 font-medium flex items-center gap-2">
                    <KeyIcon className="w-4 h-4" />
                    Nueva contraseña
                  </span>
                </label>
                <input
                  type="password"
                  className="input input-bordered bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="********"
                />
              </div>

              {password && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos de contraseña:</p>
                  <div className="space-y-1">
                    {passwordChecks.map((check) => (
                      <p key={check.id} className={`text-xs ${check.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                        {check.ok ? '✓' : '✗'} {check.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-gray-700 font-medium">Confirmar contraseña</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="********"
                />
              </div>

              {confirmPassword && (
                <p className={`text-xs ${confirmPassword === password ? 'text-emerald-700' : 'text-red-600'}`}>
                  {confirmPassword === password ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full text-white font-semibold" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-sm"></span> : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
