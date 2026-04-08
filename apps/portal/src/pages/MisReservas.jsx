import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon,
  ArrowRightIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

const STATUS_STYLES = {
  confirmada: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircleIcon, label: 'Confirmada' },
  pendiente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: PendingIcon, label: 'Pendiente' },
  cancelada: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircleIcon, label: 'Cancelada' },
  completada: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircleIcon, label: 'Completada' },
}

function MisReservas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelandoId, setCancelandoId] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/mis-reservas' } } })
      return
    }
    loadReservas()
  }, [user, navigate])

  const loadReservas = async () => {
    try {
      const { getReservasByClienteUid } = await import('@shared/firebase/firestore')
      const data = await getReservasByClienteUid(user.uid)
      setReservas(data.sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`)
        const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`)
        return dateB - dateA
      }))
    } catch (e) {
      setError('Error al cargar las reservas')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = async (reservaId) => {
    if (!confirm('Estas seguro de que deseas cancelar esta reserva?')) return
    setCancelandoId(reservaId)
    try {
      const { cancelarReservaCliente } = await import('../utils/clientAuth')
      await cancelarReservaCliente(reservaId, user.uid)
      await loadReservas()
    } catch (e) {
      alert(e.message || 'Error al cancelar la reserva')
    } finally {
      setCancelandoId(null)
    }
  }

  const getStatusStyle = (estado) => {
    return STATUS_STYLES[estado?.toLowerCase()] || STATUS_STYLES.pendiente
  }

  const formatDate = (fecha) => {
    if (!fecha) return ''
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  const isFutureReservation = (fecha, hora) => {
    const now = new Date()
    const reservaDate = new Date(`${fecha}T${hora || '23:59'}`)
    return reservaDate > now
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ceviche-red" />
      </div>
    )
  }

  const reservasActivas = reservas.filter(r => 
    ['confirmada', 'pendiente'].includes(r.estado?.toLowerCase()) &&
    isFutureReservation(r.fecha, r.hora)
  )
  const reservasPasadas = reservas.filter(r => 
    !reservasActivas.includes(r)
  )

  return (
    <div className="animate-fade-in section-padding">
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-white mb-4">
            Mis Reservas
          </h1>
          <p className="text-white/60">
            Gestiona tus reservas y consulta su estado
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end mb-6">
          <button
            onClick={() => navigate('/nueva-reserva')}
            className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <CalendarIcon className="w-5 h-5" />
            Nueva Reserva
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        {reservas.length === 0 ? (
          <div className="card-dark p-12 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold text-white mb-2">No tienes reservas</h3>
            <p className="text-white/60 mb-6">
              Aun no has realizado ninguna reserva con nosotros.
            </p>
            <button
              onClick={() => navigate('/nueva-reserva')}
              className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              Hacer una reserva
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {reservasActivas.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-ceviche-red-light" />
                  Reservas Activas
                </h2>
                <div className="space-y-4">
                  {reservasActivas.map(reserva => {
                    const status = getStatusStyle(reserva.estado)
                    const StatusIcon = status.icon
                    const puedeCancelar = isFutureReservation(reserva.fecha, reserva.hora) && 
                      ['confirmada', 'pendiente'].includes(reserva.estado?.toLowerCase())

                    return (
                      <div key={reserva.id} className="card-dark p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                                <StatusIcon className="w-4 h-4" />
                                {status.label}
                              </span>
                              {reserva.mesaNumero && (
                                <span className="text-sm text-white/50 flex items-center gap-1">
                                  <MapPinIcon className="w-4 h-4" />
                                  Mesa {reserva.mesaNumero}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              <div>
                                <p className="text-white/50 text-xs mb-1">Fecha</p>
                                <p className="text-white font-medium flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4 text-ceviche-red-light" />
                                  {formatDate(reserva.fecha)}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/50 text-xs mb-1">Hora</p>
                                <p className="text-white font-medium flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4 text-ceviche-red-light" />
                                  {reserva.hora || 'No especificada'}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/50 text-xs mb-1">Personas</p>
                                <p className="text-white font-medium flex items-center gap-1">
                                  <UserGroupIcon className="w-4 h-4 text-ceviche-red-light" />
                                  {reserva.cantidadPersonas || 'No especificado'}
                                </p>
                              </div>
                            </div>
                            {reserva.observaciones && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-white/50 text-xs">Observaciones:</p>
                                <p className="text-white/70 text-sm">{reserva.observaciones}</p>
                              </div>
                            )}
                          </div>
                          {puedeCancelar && (
                            <div className="flex md:flex-col gap-2">
                              <button
                                onClick={() => handleCancelar(reserva.id)}
                                disabled={cancelandoId === reserva.id}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                {cancelandoId === reserva.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4" />
                                )}
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {reservasPasadas.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-white/40" />
                  Historial
                </h2>
                <div className="space-y-4 opacity-70">
                  {reservasPasadas.map(reserva => {
                    const status = getStatusStyle(reserva.estado)
                    const StatusIcon = status.icon

                    return (
                      <div key={reserva.id} className="card-dark p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                            <StatusIcon className="w-4 h-4" />
                            {status.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <p className="text-white/50 text-xs mb-1">Fecha</p>
                            <p className="text-white font-medium flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4 text-ceviche-red-light" />
                              {formatDate(reserva.fecha)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/50 text-xs mb-1">Hora</p>
                            <p className="text-white font-medium flex items-center gap-1">
                              <ClockIcon className="w-4 h-4 text-ceviche-red-light" />
                              {reserva.hora || 'No especificada'}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/50 text-xs mb-1">Personas</p>
                            <p className="text-white font-medium flex items-center gap-1">
                              <UserGroupIcon className="w-4 h-4 text-ceviche-red-light" />
                              {reserva.cantidadPersonas || 'No especificado'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MisReservas
