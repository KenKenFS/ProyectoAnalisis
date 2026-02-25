import { useEffect, useMemo, useState } from 'react'
import {
  TableCellsIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClockIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowRightCircleIcon,
} from '@heroicons/react/24/outline'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

import { db } from '@shared/firebase/firebase'
import { useAuth } from '@shared/firebase/AuthContext'

function normalizeMesaStatus(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase()
  if (value === 'libre' || value === 'disponible') return 'libre'
  if (value === 'ocupada' || value === 'ocupado') return 'ocupada'
  if (value === 'esperandocuenta' || value === 'esperando_cuenta' || value === 'esperandocobro') {
    return 'esperandoCuenta'
  }
  return 'libre'
}

function getStatusUI(status) {
  if (status === 'ocupada') {
    return {
      label: 'Ocupada',
      cardClass: 'bg-blue-50 border-blue-300',
      textClass: 'text-blue-700',
      icon: UserGroupIcon,
    }
  }
  if (status === 'esperandoCuenta') {
    return {
      label: 'Lista para pagar',
      cardClass: 'bg-amber-50 border-amber-300',
      textClass: 'text-amber-700',
      icon: ClockIcon,
    }
  }
  return {
    label: 'Libre',
    cardClass: 'bg-green-50 border-green-300',
    textClass: 'text-green-700',
    icon: CheckCircleIcon,
  }
}

function MesaCard({ mesa, selected, onSelect }) {
  const ui = getStatusUI(mesa.estadoMesa)
  const StatusIcon = ui.icon
  return (
    <button
      onClick={() => onSelect(mesa)}
      className={`border-2 rounded-lg p-4 text-left transition ${
        ui.cardClass
      } ${selected ? 'ring-4 ring-cyan-500 shadow-lg' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-gray-900">Mesa {mesa.numero ?? mesa.id}</div>
          <div className="text-xs text-gray-600 mt-1">
            Capacidad: {Number(mesa.capacidad || 0) || 'N/D'} | Zona: {mesa.zona || 'General'}
          </div>
        </div>
        <StatusIcon className={`w-6 h-6 ${ui.textClass}`} />
      </div>
      <div className={`text-xs font-semibold mt-3 ${ui.textClass}`}>{ui.label}</div>
    </button>
  )
}

export default function MeserosPage() {
  const { isMesero, isAdmin, loading: authLoading } = useAuth()
  const [mesas, setMesas] = useState([])
  const [selectedMesaId, setSelectedMesaId] = useState(null)
  const [filterEstado, setFilterEstado] = useState('todos')
  const [loadingMesas, setLoadingMesas] = useState(true)
  const [error, setError] = useState('')
  const [updatingMesaId, setUpdatingMesaId] = useState(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'mesas'),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data()
            const rawEstado = data.estadoMesa ?? data.estado ?? 'libre'
            return {
              id: docSnap.id,
              ...data,
              estadoMesa: normalizeMesaStatus(rawEstado),
            }
          })
          .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))
        setMesas(mapped)
        setLoadingMesas(false)
        setError('')
      },
      (err) => {
        setError(err?.message || 'No se pudieron cargar las mesas.')
        setLoadingMesas(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const filteredMesas = useMemo(() => {
    if (filterEstado === 'todos') return mesas
    return mesas.filter((m) => m.estadoMesa === filterEstado)
  }, [mesas, filterEstado])

  const selectedMesa = useMemo(
    () => mesas.find((m) => m.id === selectedMesaId) || null,
    [mesas, selectedMesaId]
  )

  async function toggleSolicitarCuenta(mesa) {
    if (!mesa?.id || updatingMesaId) return
    setUpdatingMesaId(mesa.id)
    try {
      const nextEstado = mesa.estadoMesa === 'esperandoCuenta' ? 'ocupada' : 'esperandoCuenta'
      await updateDoc(doc(db, 'mesas', mesa.id), {
        estadoMesa: nextEstado,
        estado: nextEstado, // compatibilidad con datos antiguos
        updatedAt: new Date(),
      })
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar el estado de la mesa.')
    } finally {
      setUpdatingMesaId(null)
    }
  }

  if (authLoading) {
    return <div className="text-sm text-gray-600">Cargando permisos...</div>
  }

  if (!isMesero && !isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
        No tienes permisos para acceder al estado de mesas.
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TableCellsIcon className="w-8 h-8" />
          Estado de mesas
        </h1>
        <p className="text-blue-200 mt-2">Visualizacion en tiempo real para organizacion de atencion</p>
      </div>

      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
        <div className="text-sm text-gray-700">
          Total mesas: <span className="font-bold">{mesas.length}</span> (esperadas: 20)
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="todos">Todos</option>
            <option value="libre">Libres</option>
            <option value="ocupada">Ocupadas</option>
            <option value="esperandoCuenta">Lista para pagar</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loadingMesas ? (
            <div className="text-sm text-gray-600">Cargando mesas...</div>
          ) : filteredMesas.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              No hay mesas para el filtro seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMesas.map((mesa) => (
                <MesaCard
                  key={mesa.id}
                  mesa={mesa}
                  selected={selectedMesaId === mesa.id}
                  onSelect={(m) => setSelectedMesaId(m.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="bg-white border border-gray-200 rounded-lg shadow-lg h-fit">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h2 className="font-bold text-gray-900">Detalle de mesa</h2>
          </div>

          {!selectedMesa ? (
            <div className="p-5 text-sm text-gray-500">Selecciona una mesa para ver su detalle.</div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <div className="text-xl font-bold text-gray-900">Mesa {selectedMesa.numero ?? selectedMesa.id}</div>
                <div className="text-sm text-gray-600 mt-1">Zona: {selectedMesa.zona || 'General'}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <span className="font-semibold">{getStatusUI(selectedMesa.estadoMesa).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacidad</span>
                  <span className="font-semibold">{selectedMesa.capacidad || 'N/D'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cuenta activa</span>
                  <span className="font-semibold">{selectedMesa.cuentaActivaId ? 'Si' : 'No'}</span>
                </div>
              </div>

              <button
                onClick={() => toggleSolicitarCuenta(selectedMesa)}
                disabled={updatingMesaId === selectedMesa.id}
                className={`w-full btn btn-sm border-0 text-white ${
                  selectedMesa.estadoMesa === 'esperandoCuenta'
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <ArrowRightCircleIcon className="w-4 h-4" />
                {updatingMesaId === selectedMesa.id
                  ? 'Actualizando...'
                  : selectedMesa.estadoMesa === 'esperandoCuenta'
                    ? 'Quitar lista para pagar'
                    : 'Marcar lista para pagar'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
