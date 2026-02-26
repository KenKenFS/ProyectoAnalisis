import { useEffect, useState } from 'react'

export default function OrderTimer({ createdAt, status }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status === 'listo' || status === 'ready') {
      // Si está lista, no contar más tiempo
      return
    }

    const createdAtMs =
      typeof createdAt === 'number'
        ? createdAt
        : typeof createdAt?.toDate === 'function'
          ? createdAt.toDate().getTime()
          : new Date(createdAt).getTime()

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - createdAtMs) / 1000)) // segundos
      setElapsed(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [createdAt, status])

  // Calcular minutos y segundos
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  const formatTime = (min, sec) => {
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Color basado en tiempo transcurrido
  let timerColor = 'text-green-600'
  if (minutes >= 10) {
    timerColor = 'text-red-600'
  } else if (minutes >= 5) {
    timerColor = 'text-yellow-600'
  }

  return (
    <div className={`text-sm font-mono font-bold ${timerColor}`}>
      {formatTime(minutes, seconds)}
    </div>
  )
}
