import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@shared/firebase/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { getSolicitudesPortal } from '@shared/firebase/firestore'
import {
  GlobeAltIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

const PORTAL_URL = 'https://cevichedelrey-portal.web.app'

function StatCard({ icon: Icon, label, value, sub, color = 'primary', onClick }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
  }
  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-sm p-5 ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {onClick && <ArrowRightIcon className="w-4 h-4 text-base-content/30" />}
      </div>
      <div className="text-2xl font-bold text-base-content">{value ?? '—'}</div>
      <div className="text-sm font-medium text-base-content/70 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-base-content/40 mt-1">{sub}</div>}
    </div>
  )
}

export default function Portal() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ clientes: 0, solicitudes: 0, confirmadas: 0, canceladas: 0 })
  const [solicitudes, setSolicitudes] = useState([])
  const [clientesRecientes, setClientesRecientes] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        const [
          clientesSnap,
          solicitudesData,
          confirmadasSnap,
          canceladasSnap,
          clientesRecSnap,
        ] = await Promise.all([
          getDocs(collection(db, 'clientes')),
          getSolicitudesPortal(),
          getDocs(query(collection(db, 'reservas'), where('estado', '==', 'confirmada'))),
          getDocs(query(collection(db, 'reservas'), where('estado', '==', 'cancelada'))),
          getDocs(query(collection(db, 'clientes'), orderBy('createdAt', 'desc'), limit(5))),
        ])

        setStats({
          clientes: clientesSnap.size,
          solicitudes: solicitudesData.length,
          confirmadas: confirmadasSnap.size,
          canceladas: canceladasSnap.size,
        })
        setSolicitudes(solicitudesData.slice(0, 5))
        setClientesRecientes(clientesRecSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Error cargando datos del portal:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function formatFecha(fecha) {
    if (!fecha) return '—'
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Portal Web del Cliente</h1>
          <p className="text-sm text-base-content/50 mt-1">
            Gestión y métricas del portal público de clientes
          </p>
        </div>
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm gap-2 self-start sm:self-auto"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          Abrir portal
        </a>
      </div>

      {/* URL del portal */}
      <div className="card bg-base-100 border border-base-300 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <GlobeAltIcon className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">URL del portal</span>
              <span className="badge badge-success badge-xs gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                En línea
              </span>
            </div>
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline font-mono truncate block"
            >
              {PORTAL_URL}
            </a>
          </div>
          <button
            className="btn btn-ghost btn-xs gap-1 text-base-content/50"
            onClick={() => navigator.clipboard?.writeText(PORTAL_URL)}
          >
            Copiar enlace
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card bg-base-100 border border-base-300 p-5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-base-200 mb-3" />
              <div className="h-7 w-12 bg-base-200 rounded mb-1" />
              <div className="h-4 w-20 bg-base-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={UserGroupIcon}
            label="Clientes registrados"
            value={stats.clientes}
            sub="Cuentas en el portal"
            color="primary"
          />
          <StatCard
            icon={ExclamationCircleIcon}
            label="Solicitudes pendientes"
            value={stats.solicitudes}
            sub="Esperan confirmación"
            color="warning"
            onClick={() => navigate('/reservas')}
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Reservas confirmadas"
            value={stats.confirmadas}
            sub="Total historial"
            color="success"
          />
          <StatCard
            icon={CalendarDaysIcon}
            label="Reservas canceladas"
            value={stats.canceladas}
            sub="Total historial"
            color="info"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Solicitudes recientes */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="p-5 border-b border-base-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base-content">Solicitudes pendientes</h2>
              <p className="text-xs text-base-content/40 mt-0.5">Reservas del portal esperando confirmación</p>
            </div>
            <button
              className="btn btn-ghost btn-xs gap-1 text-primary"
              onClick={() => navigate('/reservas')}
            >
              Ver todas
              <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-base-200" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-base-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-base-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="text-center py-8 text-base-content/40">
                <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin solicitudes pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-base-200">
                {solicitudes.map((s) => (
                  <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ClockIcon className="w-4 h-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-base-content truncate">
                          {s.clienteNombre || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-base-content/50">
                          {formatFecha(s.fecha)} · {s.hora} · {s.cantidadPersonas} personas
                        </p>
                        {s.clienteEmail && (
                          <p className="text-xs text-base-content/40 truncate">{s.clienteEmail}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs text-primary flex-shrink-0"
                      onClick={() => navigate('/reservas')}
                    >
                      Gestionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clientes recientes */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="p-5 border-b border-base-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base-content">Clientes recientes</h2>
              <p className="text-xs text-base-content/40 mt-0.5">Últimos registros en el portal</p>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-base-200" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-base-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-base-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clientesRecientes.length === 0 ? (
              <div className="text-center py-8 text-base-content/40">
                <UserGroupIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aún no hay clientes registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-base-200">
                {clientesRecientes.map((c) => (
                  <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserCircleIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-base-content truncate">
                        {c.nombre || 'Sin nombre'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs text-base-content/50 truncate">
                            <EnvelopeIcon className="w-3 h-3 flex-shrink-0" />
                            {c.email}
                          </span>
                        )}
                        {c.telefono && (
                          <span className="flex items-center gap-1 text-xs text-base-content/50">
                            <PhoneIcon className="w-3 h-3 flex-shrink-0" />
                            {c.telefono}
                          </span>
                        )}
                      </div>
                      {c.provider && (
                        <span className="badge badge-ghost badge-xs mt-1">
                          {c.provider === 'google' ? 'Google' : 'Email'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="p-5 border-b border-base-200">
          <h2 className="font-semibold text-base-content">Acciones rápidas</h2>
          <p className="text-xs text-base-content/40 mt-0.5">Navegación directa a secciones relacionadas con el portal</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              icon: ExclamationCircleIcon,
              label: 'Gestionar solicitudes',
              sub: 'Confirmar o rechazar reservas del portal',
              color: 'text-warning',
              bg: 'bg-warning/10',
              action: () => navigate('/reservas'),
            },
            {
              icon: CalendarDaysIcon,
              label: 'Todas las reservas',
              sub: 'Ver el calendario y listado completo',
              color: 'text-primary',
              bg: 'bg-primary/10',
              action: () => navigate('/reservas'),
            },
            {
              icon: GlobeAltIcon,
              label: 'Abrir portal',
              sub: 'Ver el portal como lo ve el cliente',
              color: 'text-success',
              bg: 'bg-success/10',
              action: () => window.open(PORTAL_URL, '_blank'),
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="flex items-center gap-3 p-4 rounded-xl border border-base-300 hover:border-primary/30 hover:bg-base-200/50 transition-all text-left group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-base-content group-hover:text-primary transition-colors">{item.label}</p>
                <p className="text-xs text-base-content/40 leading-snug">{item.sub}</p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-base-content/20 group-hover:text-primary/60 ml-auto flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
