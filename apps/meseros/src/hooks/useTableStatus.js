import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@shared/firebase/firebase'

function normalizeMesaStatus(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase()
  if (value === 'libre' || value === 'disponible') return 'libre'
  if (value === 'ocupada' || value === 'ocupado') return 'ocupada'
  if (value === 'esperandocuenta' || value === 'esperando_cuenta' || value === 'esperandocobro') {
    return 'esperandoCuenta'
  }
  if (value === 'porlimpiar' || value === 'por_limpiar' || value === 'por limpiar') {
    return 'porLimpiar'
  }
  return 'libre'
}

/**
 * Suscripción en tiempo real a la colección `mesas`.
 * Devuelve la lista con estado normalizado y ordenada por número.
 */
export function useTableStatus() {
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        setLoading(false)
        setError('')
      },
      (err) => {
        setError(err?.message || 'No se pudieron cargar las mesas.')
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { mesas, loading, error }
}

export { normalizeMesaStatus }
