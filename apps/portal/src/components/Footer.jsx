import { Link } from 'react-router-dom'
import { PhoneIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'
import RestaurantLogo from './RestaurantLogo'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ceviche-dark border-t border-white/8">
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Branding */}
          <div className="lg:col-span-1">
            <RestaurantLogo size="md" showTagline />
            <p className="mt-5 text-white/40 text-sm leading-relaxed">
              Tradición peruana con el mejor marisco fresco de Costa Rica.
              Un lugar para compartir momentos únicos.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="https://www.ubereats.com/cr/store/restaurante-ceviche-del-rey/uTChiG0CQ2CvtRoLXptztA"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/70 transition-colors border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg"
              >
                Uber Eats
              </a>
              <a
                href="https://www.rappi.co.cr/restaurantes/468-ceviche-del-rey"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/70 transition-colors border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg"
              >
                Rappi
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase">Navegación</h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Inicio' },
                { to: '/menu', label: 'Nuestro Menú' },
                { to: '/nueva-reserva', label: 'Hacer Reserva' },
                { to: '/mis-reservas', label: 'Mis Reservas' },
                { to: '/perfil', label: 'Mi Perfil' },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-white/40 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Horarios */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-ceviche-red-light" />
              Horarios
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { dias: 'Lun — Mié', horas: '11:45 — 21:30' },
                { dias: 'Jue — Sáb', horas: '11:30 — 21:30' },
                { dias: 'Domingo', horas: '11:45 — 20:45' },
              ].map(h => (
                <li key={h.dias} className="flex justify-between gap-4">
                  <span className="text-white/40">{h.dias}</span>
                  <span className="text-white/70 font-medium">{h.horas}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a
                  href="tel:+50622035109"
                  className="flex items-start gap-3 text-white/40 hover:text-white transition-colors"
                >
                  <PhoneIcon className="w-4 h-4 mt-0.5 text-ceviche-red-light flex-shrink-0" />
                  <span>+506 2203-5109</span>
                </a>
              </li>
              <li>
                <a
                  href="https://maps.google.com/?q=Ceviche+del+Rey+Santa+Ana+Costa+Rica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-white/40 hover:text-white transition-colors"
                >
                  <MapPinIcon className="w-4 h-4 mt-0.5 text-ceviche-red-light flex-shrink-0" />
                  <span>800 m al este de la Cruz Roja, Santa Ana, San José</span>
                </a>
              </li>
            </ul>

            <div className="mt-6">
              <Link
                to="/nueva-reserva"
                className="inline-flex items-center gap-2 btn-primary text-sm px-5 py-2.5 rounded-lg"
              >
                Reservar Mesa
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/25 text-xs">
            © {year} Ceviche del Rey. Todos los derechos reservados.
          </p>
          <p className="text-white/20 text-xs">
            Santa Ana, San José, Costa Rica · CP 10901
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
