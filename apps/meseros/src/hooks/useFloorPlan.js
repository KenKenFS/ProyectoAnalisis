import { useEffect, useState } from 'react'
import { onFloorPlanSnapshot } from '@shared/firebase/firestore'

/**
 * Suscripción en tiempo real al documento floorPlan/main.
 *
 * Devuelve:
 *  - plan: documento del plano o null si no existe todavía
 *  - loading: true mientras se recibe el primer snapshot
 *  - error: mensaje de error si la suscripción falla
 */
export function useFloorPlan() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    const unsubscribe = onFloorPlanSnapshot((data) => {
      if (!active) return
      setPlan(data)
      setLoading(false)
      setError('')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { plan, loading, error, setError }
}
