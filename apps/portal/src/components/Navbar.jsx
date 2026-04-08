import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'
import RestaurantLogo from './RestaurantLogo'

function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
  }

  return (
    <nav
      className={`w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-ceviche-black/95 backdrop-blur-md shadow-2xl shadow-black/50 border-b border-white/8'
          : 'bg-transparent'
      }`}
    >
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          <Link to="/" className="group">
            <RestaurantLogo size="md" showTagline />
          </Link>

          {/* Nav links desktop */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { to: '/', label: 'Inicio' },
              { to: '/menu', label: 'Menú' },
              { to: '/nueva-reserva', label: 'Reservar' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-all duration-200 relative group ${
                  isActive(link.to) ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-ceviche-red transition-all duration-300 ${
                  isActive(link.to) ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
              </Link>
            ))}
          </div>

          {/* Right side desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="tel:+50622035109"
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              <span>2203-5109</span>
            </a>
            <span className="w-px h-4 bg-white/20" />
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/mis-reservas"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all ${
                    isActive('/mis-reservas')
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Mis Reservas
                </Link>
                <Link
                  to="/perfil"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all ${
                    isActive('/perfil')
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserCircleIcon className="w-4 h-4" />
                  Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition-all"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro"
                  className="btn-primary text-sm px-5 py-2.5 rounded-lg"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen
              ? <XMarkIcon className="w-6 h-6" />
              : <Bars3Icon className="w-6 h-6" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-ceviche-black border-t border-white/8 px-4 py-4 space-y-1">
          {[
            { to: '/', label: 'Inicio' },
            { to: '/menu', label: 'Menú' },
            { to: '/nueva-reserva', label: 'Reservar Mesa' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block py-3 px-4 rounded-lg text-base font-medium transition-colors ${
                isActive(link.to)
                  ? 'bg-ceviche-red/20 text-white border-l-2 border-ceviche-red'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <a
            href="tel:+50622035109"
            className="flex items-center gap-2 py-3 px-4 text-base font-medium text-white/70 hover:text-white"
          >
            <PhoneIcon className="w-5 h-5" />
            2203-5109
          </a>

          <div className="border-t border-white/8 pt-3 mt-3 space-y-1">
            {user ? (
              <>
                <Link to="/mis-reservas" className="flex items-center gap-2 py-3 px-4 text-base font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                  <CalendarIcon className="w-5 h-5" /> Mis Reservas
                </Link>
                <Link to="/perfil" className="flex items-center gap-2 py-3 px-4 text-base font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                  <UserCircleIcon className="w-5 h-5" /> Perfil
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 py-3 px-4 text-base font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                  <ArrowRightOnRectangleIcon className="w-5 h-5" /> Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-3 px-4 text-base font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                  Iniciar Sesión
                </Link>
                <Link to="/registro" className="block py-3 px-4 text-base font-semibold text-white bg-ceviche-red rounded-lg text-center">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
