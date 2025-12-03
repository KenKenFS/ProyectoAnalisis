import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const navigate = useNavigate()
  const role = localStorage.getItem('role') || 'Guest'
  const name = localStorage.getItem('name') || ''
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function logout() {
    localStorage.removeItem('role')
    localStorage.removeItem('name')
    navigate('/login')
  }

  const roleColors = {
    'Admin': 'bg-purple-500',
    'Cajero': 'bg-green-500',
    'Mesero': 'bg-blue-500',
    'Cocina': 'bg-orange-500',
    'Cliente': 'bg-pink-500',
    'Guest': 'bg-gray-500',
  }

  const roleInitials = {
    'Admin': 'AD',
    'Cajero': 'CA',
    'Mesero': 'ME',
    'Cocina': 'CO',
    'Cliente': 'CL',
    'Guest': 'GU',
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={role === 'Admin' ? '/admin' : '/pos'} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg">
              CR
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold font-poppins tracking-tight">Ceviche del Rey</div>
              <div className="text-xs text-cyan-200 -mt-1">Sistema POS</div>
            </div>
          </Link>

          {/* Desktop: User info */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <div className={`w-8 h-8 rounded-full ${roleColors[role]} flex items-center justify-center text-white text-xs font-bold`}>
                {roleInitials[role]}
              </div>
              <div className="text-sm">
                <div className="font-medium">{name || role}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${roleColors[role]} text-white inline-block`}>
                  {role}
                </div>
              </div>
            </div>

            {role !== 'Guest' && (
              <button
                onClick={logout}
                className="btn btn-ghost btn-sm text-white hover:bg-white/10 gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Salir
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 p-3 bg-white/10 rounded-lg">
              <div className={`w-10 h-10 rounded-full ${roleColors[role]} flex items-center justify-center text-white text-sm font-bold`}>
                {roleInitials[role]}
              </div>
              <div>
                <div className="font-medium">{name || role}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${roleColors[role]} text-white inline-block`}>
                  {role}
                </div>
              </div>
            </div>

            {role !== 'Guest' && (
              <button
                onClick={logout}
                className="w-full btn btn-ghost text-white justify-start gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Cerrar sesión
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
