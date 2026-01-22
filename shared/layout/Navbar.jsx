import { useState, useEffect } from 'react'
import { 
  BellIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function Navbar({ 
  title = 'Ceviche del Rey', 
  subtitle = 'Sistema',
  showNotifications = true 
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const userName = localStorage.getItem('userName') || 'Usuario'
  const userRole = localStorage.getItem('role') || 'Guest'

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  function handleLogout() {
    localStorage.removeItem('role')
    localStorage.removeItem('userName')
    localStorage.removeItem('uid')
    localStorage.removeItem('userEmail')
    window.location.href = '/login'
  }

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-blue-950 border-b border-white/10 shadow-lg">
      <div className="max-w-full px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo y Titulo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="text-white font-bold text-lg">{title}</div>
            <div className="text-cyan-300 text-xs">{subtitle}</div>
          </div>
        </div>

        {/* Centro - Reloj */}
        <div className="hidden md:flex items-center gap-2 text-cyan-100 text-sm">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <ClockIcon className="w-4 h-4" />
          </div>
          <div>{currentTime.toLocaleTimeString('es-CR')}</div>
        </div>

        {/* Derecha - Usuario y Acciones */}
        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          {showNotifications && (
            <button className="relative p-2 hover:bg-white/10 rounded-lg transition">
              <BellIcon className="w-5 h-5 text-cyan-300" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}

          {/* Menu de Usuario */}
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10">
            <div className="text-right">
              <div className="text-white text-sm font-medium">{userName}</div>
              <div className="text-cyan-300 text-xs">{userRole}</div>
            </div>
            <UserCircleIcon className="w-8 h-8 text-cyan-400" />
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition text-sm font-medium"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
