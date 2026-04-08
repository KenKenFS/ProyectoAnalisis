import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MapPinIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

const STEPS = [
  { id: 1, title: 'Buscar', description: 'Fecha y hora' },
  { id: 2, title: 'Datos', description: 'Información de contacto' },
]

const HORARIOS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
]

function NuevaReserva() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [modo, setModo] = useState(user ? 'cuenta' : 'invitado')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cliente, setCliente] = useState(null)

  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    cantidadPersonas: 2,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    observaciones: '',
  })

  useEffect(() => {
    if (user) {
      loadClienteData()
    }
  }, [user])

  const loadClienteData = async () => {
    try {
      const { getClienteByUid } = await import('../utils/clientAuth')
      const data = await getClienteByUid(user.uid)
      setCliente(data)
      if (data) {
        setFormData(prev => ({
          ...prev,
          clienteNombre: data.nombre || '',
          clienteEmail: user.email || '',
          clienteTelefono: data.telefono || '',
        }))
      }
    } catch (e) {
      console.error('Error cargando cliente:', e)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.fecha) { setError('Selecciona una fecha'); return false }
    if (!formData.hora) { setError('Selecciona una hora'); return false }
    const personas = parseInt(formData.cantidadPersonas)
    if (!personas || personas < 1) {
      setError('Indica el numero de personas'); return false
    }
    if (personas > 20) {
      setError('Maximo 20 personas por reserva. Para grupos mayores, contactenos directamente.'); return false
    }
    const fechaReserva = new Date(`${formData.fecha}T${formData.hora}`)
    if (fechaReserva < new Date()) { setError('La fecha debe ser futura'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!formData.clienteNombre.trim()) { setError('Ingresa tu nombre'); return false }
    if (!formData.clienteEmail.trim()) { setError('Ingresa tu correo'); return false }
    if (!formData.clienteTelefono.trim()) { setError('Ingresa tu telefono'); return false }
    // Validar telefono solo numeros
    const telefonoLimpio = formData.clienteTelefono.replace(/[-\s]/g, '')
    if (!/^\d{8,}$/.test(telefonoLimpio)) {
      setError('Telefono invalido. Ingrese solo numeros (minimo 8 digitos)'); return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step < 2) { setStep(step + 1); window.scrollTo(0, 0) }
    else handleSubmit()
  }

  const handleBack = () => {
    if (step > 1) { setStep(step - 1); setError(''); window.scrollTo(0, 0) }
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const { createReservaCliente } = await import('../utils/clientAuth')
      const reservaData = {
        fecha: formData.fecha,
        hora: formData.hora,
        cantidadPersonas: parseInt(formData.cantidadPersonas),
        clienteNombre: formData.clienteNombre,
        clienteEmail: formData.clienteEmail,
        clienteTelefono: formData.clienteTelefono,
        observaciones: formData.observaciones,
        clienteUid: modo === 'cuenta' && user ? user.uid : null,
      }
      await createReservaCliente(reservaData)
      setSuccess(true)
      setTimeout(() => {
        navigate(modo === 'cuenta' && user ? '/mis-reservas' : '/')
      }, 3000)
    } catch (e) {
      setError(e.message || 'Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="card-dark p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-playfair font-bold text-white mb-3">Reserva Solicitada</h2>
            <p className="text-white/70 mb-6">
              Tu solicitud de reserva ha sido registrada. Te confirmaremos por correo electronico una vez que nuestro equipo verifique la disponibilidad.
            </p>
            <p className="text-white/50 text-sm mb-6">
              Redirigiendo {modo === 'cuenta' && user ? 'a tus reservas' : 'al inicio'}...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in section-padding">
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-white mb-4">
            Reservar Mesa
          </h1>
          <p className="text-white/60">
            Completa los siguientes pasos para solicitar tu reserva
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-4">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center ${step === s.id ? 'text-ceviche-red-light' : step > s.id ? 'text-white' : 'text-white/40'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-1 ${
                    step === s.id ? 'bg-ceviche-red text-white' : step > s.id ? 'bg-ceviche-red text-white' : 'bg-ceviche-dark border border-white/20'
                  }`}>
                    {step > s.id ? <CheckCircleIcon className="w-5 h-5" /> : s.id}
                  </div>
                  <span className="text-xs hidden sm:block">{s.title}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-16 sm:w-24 h-0.5 mx-2 sm:mx-4 ${step > s.id ? 'bg-ceviche-red' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {!user && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-ceviche-dark rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setModo('invitado')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  modo === 'invitado' ? 'bg-ceviche-red text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Como Invitado
              </button>
              <button
                onClick={() => { setModo('cuenta'); navigate('/login', { state: { from: { pathname: '/nueva-reserva' } } }) }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  modo === 'cuenta' ? 'bg-ceviche-red text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Con mi Cuenta
              </button>
            </div>
          </div>
        )}

        <div className="card-dark p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Fecha de reserva
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleChange('fecha', e.target.value)}
                    min={today}
                    max={maxDate}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" />
                    Numero de personas
                  </label>
                  <input
                    type="number"
                    value={formData.cantidadPersonas}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      if (val > 20) {
                        handleChange('cantidadPersonas', 20)
                        setError('Maximo 20 personas. Para grupos mayores, contactenos.')
                      } else {
                        handleChange('cantidadPersonas', val)
                        setError('')
                      }
                    }}
                    min={1}
                    max={20}
                    className="input-dark w-full"
                  />
                  <p className="text-xs text-white/40 mt-1">Maximo 20 personas</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Hora preferida
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {HORARIOS.map(hora => (
                    <button
                      key={hora}
                      onClick={() => handleChange('hora', hora)}
                      className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                        formData.hora === hora
                          ? 'bg-ceviche-red text-white'
                          : 'bg-ceviche-dark border border-white/10 text-white/70 hover:border-ceviche-red/30'
                      }`}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-ceviche-red/10 rounded-lg border border-ceviche-red/20">
                <InformationCircleIcon className="w-5 h-5 text-ceviche-red-light flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/70">
                  La disponibilidad de mesas sera confirmada por nuestro equipo despues de recibir tu solicitud.
                  Te enviaremos una confirmacion por correo electronico.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {modo === 'cuenta' && user && cliente && (
                <div className="p-4 bg-ceviche-red/10 rounded-lg border border-ceviche-red/20 mb-6">
                  <p className="text-sm text-white/70 flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-ceviche-red-light" />
                    Usando datos de tu cuenta: <strong className="text-white">{cliente?.nombre || user.email}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.clienteNombre}
                  onChange={(e) => handleChange('clienteNombre', e.target.value)}
                  className="input-dark w-full"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4" />
                    Correo electronico
                  </label>
                  <input
                    type="email"
                    value={formData.clienteEmail}
                    onChange={(e) => handleChange('clienteEmail', e.target.value)}
                    className="input-dark w-full"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4" />
                    Telefono
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.clienteTelefono}
                    onChange={(e) => {
                      // Solo permitir numeros, guiones y espacios
                      const valor = e.target.value.replace(/[^0-9\-\s]/g, '')
                      handleChange('clienteTelefono', valor)
                    }}
                    className="input-dark w-full"
                    placeholder="88888888"
                  />
                  <p className="text-xs text-white/40 mt-1">Solo numeros (8+ digitos)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  className="input-dark w-full h-24 resize-none"
                  placeholder="Alergias, ocasion especial, preferencias de mesa..."
                />
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-ceviche-red-light" />
                  Resumen de tu solicitud
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Fecha:</p>
                    <p className="text-white">{formData.fecha}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Hora:</p>
                    <p className="text-white">{formData.hora}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Personas:</p>
                    <p className="text-white">{formData.cantidadPersonas}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 mt-6 border-t border-white/10">
            <button
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="btn-secondary px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Atras
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : step === 2 ? (
                <>{'Confirmar Reserva'} <CheckCircleIcon className="w-4 h-4" /></>
              ) : (
                <>{'Continuar'} <ArrowRightIcon className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NuevaReserva
