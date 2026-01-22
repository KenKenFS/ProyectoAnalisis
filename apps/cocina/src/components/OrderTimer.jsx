import { useEffect, useState } from 'react'

export default function OrderTimer({ createdAt, status }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status === 'ready') {
      // Si está lista, no contar más tiempo
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = Math.floor((now - createdAt) / 1000) // segundos
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
  if (minutes >= 2) {
    timerColor = 'text-red-600'
  } else if (minutes >= 1) {
    timerColor = 'text-yellow-600'
  }

  return (
    <div className={`text-sm font-mono font-bold ${timerColor}`}>
      {formatTime(minutes, seconds)}
    </div>
  )
}
