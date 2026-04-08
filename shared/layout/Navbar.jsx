import { useState, useEffect } from 'react'
import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '../context/ThemeContext'

export default function Navbar({
  title = 'Ceviche del Rey',
  showNotifications = true,
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const userName = localStorage.getItem('userName') || 'Usuario'
  const userRole = localStorage.getItem('role') || 'Guest'
  const { theme, toggleTheme } = useTheme()

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
    <nav className="bg-gradient-to-r from-blue-900 to-blue-950 border-b border-white/10 shadow-lg dark:border-zinc-800/90 dark:from-zinc-950 dark:to-zinc-950 dark:shadow-black/20">
      <div className="max-w-full px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="text-white font-bold text-lg md:text-xl leading-tight truncate">{title}</div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-cyan-100 text-sm dark:text-zinc-400">
          <div className="w-8 h-8 bg-white/10 dark:bg-zinc-900 rounded-lg flex items-center justify-center ring-0 dark:ring-1 dark:ring-red-950/40">
            <ClockIcon className="w-4 h-4 text-cyan-200 dark:text-red-800/80" />
          </div>
          <div>{currentTime.toLocaleTimeString('es-CR')}</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition dark:border-red-950/35 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 text-red-300/90" />
            ) : (
              <MoonIcon className="w-5 h-5 text-cyan-200" />
            )}
          </button>

          {showNotifications && (
            <button type="button" className="relative p-2 hover:bg-white/10 dark:hover:bg-zinc-900 rounded-lg transition">
              <BellIcon className="w-5 h-5 text-cyan-300 dark:text-red-800/80" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full dark:bg-red-800 dark:ring-1 dark:ring-zinc-950" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10 dark:border-zinc-800">
            <div className="text-right">
              <div className="text-white text-sm font-medium">{userName}</div>
              <div className="text-cyan-300 text-xs dark:text-zinc-500">{userRole}</div>
            </div>
            <UserCircleIcon className="w-8 h-8 text-cyan-400 dark:text-red-800/80" />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="group flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition text-sm font-medium dark:bg-zinc-900 dark:hover:bg-red-950/40 dark:border dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-red-950/60 dark:hover:text-red-300/90"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-200 group-hover:text-red-100 dark:text-red-900/75 dark:group-hover:text-red-300/90" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
