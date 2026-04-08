import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  ClockIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  StarIcon,
  UserGroupIcon,
  GlobeAmericasIcon,
} from '@heroicons/react/24/outline'
import { useScrollRevealAll } from '../hooks/useScrollReveal'

const HORARIOS = [
  { dias: 'Lunes — Miércoles', horas: '11:45 — 21:30' },
  { dias: 'Jueves — Sábado', horas: '11:30 — 21:30' },
  { dias: 'Domingo', horas: '11:45 — 20:45' },
]

const ESPECIALIDADES = [
  {
    nombre: 'Ceviche del Rey',
    descripcion: 'Nuestra firma: corvina, camarón y pulpo marinados en limón con camote, choclo y chifles.',
    precio: '₡19.450',
  },
  {
    nombre: 'Tiradito 3 Sabores',
    descripcion: 'Láminas de corvina en tres salsas: leche de tigre, ají amarillo y crema de olivo.',
    precio: '₡7.600',
  },
  {
    nombre: 'Mariscada del Rey',
    descripcion: 'Fuente para compartir: langosta, pulpo, camarones y corvina en salsa especial de la casa.',
    precio: '₡19.950',
  },
  {
    nombre: 'Arroz Chaufa de Mariscos',
    descripcion: 'Arroz estilo chino-peruano salteado con camarones, calamar y pulpo al wok.',
    precio: '₡5.950',
  },
  {
    nombre: 'Pulpo al Olivo',
    descripcion: 'Pulpo marinado con aceite de olivo y limón, bañado en nuestra salsa de olivas negras.',
    precio: '₡7.350',
  },
  {
    nombre: 'Jalea de Mariscos',
    descripcion: 'Mix de mariscos fritos con salsa tártara, sarsa criolla y yuca dorada.',
    precio: '₡6.150',
  },
]

const INSTAGRAM_POSTS = [
  {
    categoria: 'Ceviche',
    descripcion: 'Nuestro ceviche clásico: corvina fresca, limón, ají y camote.',
    aspectRatio: 'aspect-square',
    accent: 'from-ceviche-red/30 to-ceviche-dark/80',
  },
  {
    categoria: 'Mariscada',
    descripcion: 'La Mariscada del Rey: una fuente de sabores del mar para compartir.',
    aspectRatio: 'aspect-[4/5]',
    accent: 'from-red-900/40 to-ceviche-black/90',
  },
  {
    categoria: 'Tiradito',
    descripcion: 'Láminas de corvina en tres salsas artesanales.',
    aspectRatio: 'aspect-square',
    accent: 'from-red-800/30 to-ceviche-surface/90',
  },
  {
    categoria: 'Ambiente',
    descripcion: 'Un espacio acogedor para celebrar con quienes más quieres.',
    aspectRatio: 'aspect-[4/5]',
    accent: 'from-ceviche-red-dim/40 to-ceviche-black/90',
  },
  {
    categoria: 'Pulpo',
    descripcion: 'Pulpo al olivo con salsa negra de la casa. Un clásico irresistible.',
    aspectRatio: 'aspect-square',
    accent: 'from-red-900/30 to-ceviche-dark/80',
  },
  {
    categoria: 'Jalea',
    descripcion: 'Jalea de mariscos con yuca dorada y sarsa criolla.',
    aspectRatio: 'aspect-square',
    accent: 'from-ceviche-red/20 to-ceviche-surface/80',
  },
]

function InstagramSection() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-white/8">
      {/* Background sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-ceviche-black to-ceviche-surface/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(153,27,27,0.12)_0%,transparent_65%)]" />

      <div className="relative z-10 container-limit mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          {/* Instagram badge */}
          <a
            href="https://www.instagram.com/ceviche_del_rey_santa_ana/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 mb-6 group"
          >
            <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-all duration-300">
              <InstagramIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                @ceviche_del_rey_santa_ana
              </span>
              <span className="text-white/35 text-xs border-l border-white/15 pl-2 ml-1">1.4K seguidores</span>
            </span>
          </a>

          <p className="section-label mb-3">Nuestra comunidad</p>
          <h2 className="text-4xl sm:text-5xl font-playfair font-semibold text-white mb-4">
            Síguenos en Instagram
          </h2>
          <div className="divider-red" />
          <p className="text-white/45 max-w-lg mx-auto mt-6 text-sm leading-relaxed">
            Cada día compartimos los platos del día, momentos del restaurante
            y la esencia de nuestra cocina peruana. Únete a nuestra comunidad.
          </p>
        </div>

        {/* Grid de posts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10 reveal">
          {INSTAGRAM_POSTS.map((post, i) => (
            <a
              key={i}
              href="https://www.instagram.com/ceviche_del_rey_santa_ana/"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                group relative aspect-square rounded-xl overflow-hidden
                border border-white/8 hover:border-white/20
                transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40
                bg-ceviche-surface
              `}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Fondo con patrón de textura que simula el plato */}
              <div className={`absolute inset-0 bg-gradient-to-br ${post.accent}`} />

              {/* Pattern decorativo específico por plato */}
              <PlatePattern index={i} />

              {/* Overlay con info al hover */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center">
                <div className="w-6 h-6 mb-2">
                  <InstagramIcon className="w-full h-full" />
                </div>
                <p className="text-white font-semibold text-xs leading-tight">{post.categoria}</p>
              </div>

              {/* Etiqueta de categoría */}
              <div className="absolute bottom-2 left-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                <span className="inline-block px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] rounded-md font-medium">
                  {post.categoria}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center reveal">
          <a
            href="https://www.instagram.com/ceviche_del_rey_santa_ana/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/40"
            style={{
              background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
            }}
          >
            <InstagramIcon className="w-5 h-5" />
            Seguir en Instagram
          </a>
          <p className="text-white/30 text-xs mt-4">
            Visita nuestro perfil para ver las fotos y videos más recientes
          </p>
        </div>
      </div>
    </section>
  )
}

function InstagramIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fcb045" />
          <stop offset="40%" stopColor="#fd1d1d" />
          <stop offset="100%" stopColor="#833ab4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" />
    </svg>
  )
}

function PlatePattern({ index }) {
  const patterns = [
    // Ceviche: ondas concéntricas
    <svg key="0" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
      <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="1" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="6" fill="white" opacity="0.4" />
      <path d="M30 50 Q40 38 50 50 Q60 62 70 50" fill="none" stroke="white" strokeWidth="1" />
    </svg>,
    // Mariscada: estrella de mar
    <svg key="1" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-15">
      <polygon points="50,15 58,40 85,40 63,56 72,82 50,65 28,82 37,56 15,40 42,40" fill="none" stroke="white" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="8" fill="white" opacity="0.3" />
    </svg>,
    // Tiradito: líneas diagonales elegantes
    <svg key="2" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-15">
      {[15, 30, 45, 60, 75].map((x, i) => (
        <line key={i} x1={x} y1="20" x2={x + 30} y2="80" stroke="white" strokeWidth="1" />
      ))}
      <rect x="25" y="42" width="50" height="16" rx="8" fill="none" stroke="white" strokeWidth="1.2" />
    </svg>,
    // Ambiente: cuadrícula sutil
    <svg key="3" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-10">
      {[20, 35, 50, 65, 80].map((v, i) => (
        <g key={i}>
          <line x1={v} y1="10" x2={v} y2="90" stroke="white" strokeWidth="0.8" />
          <line x1="10" y1={v} x2="90" y2={v} stroke="white" strokeWidth="0.8" />
        </g>
      ))}
      <circle cx="50" cy="50" r="22" fill="none" stroke="white" strokeWidth="1.5" />
    </svg>,
    // Pulpo: tentáculos
    <svg key="4" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x2 = 50 + Math.cos(rad) * 38
        const y2 = 50 + Math.sin(rad) * 38
        const cx1 = 50 + Math.cos(rad + 0.5) * 20
        const cy1 = 50 + Math.sin(rad + 0.5) * 20
        return <path key={i} d={`M50,50 Q${cx1},${cy1} ${x2},${y2}`} fill="none" stroke="white" strokeWidth="1" />
      })}
      <circle cx="50" cy="50" r="10" fill="white" opacity="0.25" />
    </svg>,
    // Jalea: salpicadura
    <svg key="5" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-15">
      {[[50,50,18],[25,30,8],[70,25,6],[75,65,9],[30,72,7],[60,78,5],[20,55,6],[78,42,7]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity={i === 0 ? 0.3 : 0.2} />
      ))}
    </svg>,
  ]
  return patterns[index % patterns.length]
}

function Home() {
  useScrollRevealAll()

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-ceviche-black/60 to-ceviche-black z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(153,27,27,0.25)_0%,transparent_60%)]" />
        {/* Texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />

        <div className="relative z-20 container-limit mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-40">
          <div className="max-w-4xl">
            <p className="section-label mb-6 animate-fade-in">Cocina Peruana · Santa Ana, Costa Rica</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-playfair font-bold mb-8 leading-[1.05] animate-slide-up">
              <span className="text-white block">Sabores del</span>
              <span className="text-ceviche-red-light block italic">Mar</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-xl animate-fade-in font-light leading-relaxed">
              Recetas peruanas auténticas con el mejor marisco fresco. 
              Más de 30 años llevando los sabores del Pacífico a tu mesa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
              <Link
                to="/menu"
                className="btn-primary px-8 py-4 rounded-xl text-base font-semibold inline-flex items-center gap-2"
              >
                Ver Menú Completo
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <Link
                to="/nueva-reserva"
                className="btn-secondary px-8 py-4 rounded-xl text-base font-semibold inline-flex items-center gap-2"
              >
                <CalendarDaysIcon className="w-5 h-5" />
                Reservar Mesa
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== STATS / RAZONES ===== */}
      <section className="py-12 border-y border-white/8 bg-ceviche-surface/30">
        <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { valor: '+30', label: 'Años de tradición', icono: CheckBadgeIcon },
              { valor: '4.3', label: 'Calificación promedio', icono: StarIcon },
              { valor: '600+', label: 'Reseñas positivas', icono: UserGroupIcon },
              { valor: '50+', label: 'Platos en el menú', icono: GlobeAmericasIcon },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <div className="text-3xl sm:text-4xl font-playfair font-bold text-white mb-1">{item.valor}</div>
                <div className="text-white/40 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ESPECIALIDADES ===== */}
      <section className="section-padding">
        <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="section-label mb-3">Lo mejor de nuestra cocina</p>
            <h2 className="text-4xl sm:text-5xl font-playfair font-semibold text-white mb-4">
              Especialidades
            </h2>
            <div className="divider-red" />
            <p className="text-white/50 max-w-xl mx-auto mt-6 leading-relaxed">
              Platos preparados cada día con ingredientes frescos del mercado,
              siguiendo recetas tradicionales de la cocina nikkei-peruana.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ESPECIALIDADES.map((plato, i) => (
              <div
                key={plato.nombre}
                className={`reveal reveal-delay-${(i % 3) + 1} group card-dark p-6 hover:border-ceviche-red/30 hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="w-1 h-8 bg-ceviche-red rounded-full mb-4 group-hover:h-10 transition-all duration-300" />
                <h3 className="text-lg font-playfair font-semibold text-white mb-2 group-hover:text-ceviche-red-light transition-colors">
                  {plato.nombre}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  {plato.descripcion}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">{plato.precio}</span>
                  <Link
                    to="/menu"
                    className="text-xs text-ceviche-red-light opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    Ver menú <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 reveal">
            <Link to="/menu" className="btn-outline-red px-8 py-3 rounded-xl inline-flex items-center gap-2 font-semibold">
              Menú Completo
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== RESERVAS CTA ===== */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-ceviche-red-dim to-ceviche-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(185,28,28,0.4)_0%,transparent_60%)]" />
        <div className="relative z-10 container-limit mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto reveal">
            <p className="section-label mb-4">Reserva sin costo</p>
            <h2 className="text-4xl sm:text-5xl font-playfair font-semibold text-white mb-6">
              Reserva tu Mesa
            </h2>
            <p className="text-white/70 mb-10 text-lg leading-relaxed">
              Garantiza tu lugar para una experiencia gastronómica única.
              Sin costos, sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/nueva-reserva"
                className="bg-white text-ceviche-red font-bold px-10 py-4 rounded-xl text-base hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-2xl inline-flex items-center gap-2"
              >
                <CalendarDaysIcon className="w-5 h-5" />
                Reservar Ahora
              </Link>
              <a
                href="tel:+50622035109"
                className="btn-secondary px-10 py-4 rounded-xl text-base inline-flex items-center gap-2"
              >
                <PhoneIcon className="w-5 h-5" />
                Llamar: 2203-5109
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HORARIOS Y MAPA ===== */}
      <section className="section-padding">
        <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="section-label mb-3">Información del local</p>
            <h2 className="text-4xl sm:text-5xl font-playfair font-semibold text-white mb-4">
              Visítanos
            </h2>
            <div className="divider-red" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Info column */}
            <div className="space-y-6 reveal">
              {/* Horarios */}
              <div className="card-dark p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-ceviche-red/20 flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-ceviche-red-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Horarios de Atención</h3>
                </div>
                <div className="space-y-3">
                  {HORARIOS.map((h) => (
                    <div key={h.dias} className="flex items-center justify-between py-2 border-b border-white/8 last:border-0">
                      <span className="text-white/60 text-sm">{h.dias}</span>
                      <span className="text-white font-medium text-sm">{h.horas}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dirección */}
              <div className="card-dark p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-ceviche-red/20 flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-ceviche-red-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Ubicación</h3>
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  800 metros al este de la Cruz Roja,<br />
                  Santa Ana, San José, Costa Rica<br />
                  <span className="text-white/40">Código postal: 10901</span>
                </p>
                <a
                  href="https://maps.google.com/?q=Ceviche+del+Rey+Santa+Ana+Costa+Rica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ceviche-red-light hover:text-white transition-colors flex items-center gap-1"
                >
                  Ver en Google Maps <ArrowRightIcon className="w-3 h-3" />
                </a>
              </div>

              {/* Contacto */}
              <div className="card-dark p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-ceviche-red/20 flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-ceviche-red-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Contacto</h3>
                </div>
                <div className="space-y-3">
                  <a href="tel:+50622035109" className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm group">
                    <PhoneIcon className="w-4 h-4 text-ceviche-red-light" />
                    <span>+506 2203-5109</span>
                  </a>
                  <div className="pt-3 border-t border-white/8">
                    <p className="text-white/40 text-xs mb-3">También disponible en:</p>
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href="https://www.ubereats.com/cr/store/restaurante-ceviche-del-rey/uTChiG0CQ2CvtRoLXptztA"
                        target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-ceviche-surface border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
                      >
                        Uber Eats
                      </a>
                      <a
                        href="https://www.rappi.co.cr/restaurantes/468-ceviche-del-rey"
                        target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-ceviche-surface border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
                      >
                        Rappi
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa */}
            <div className="reveal reveal-delay-2">
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[500px] lg:h-[620px]">
                <iframe
                  title="Mapa Ceviche del Rey Santa Ana"
                  src="https://maps.google.com/maps?q=Ceviche+del+Rey+Santa+Ana+San+Jose+Costa+Rica&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(0.9) hue-rotate(180deg) saturate(0.6) brightness(0.95)' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ¿POR QUÉ ELEGIRNOS? ===== */}
      <section className="py-20 bg-ceviche-surface/20 border-t border-white/8">
        <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="section-label mb-3">Un lugar único</p>
            <h2 className="text-4xl font-playfair font-semibold text-white mb-4">
              ¿Por qué elegirnos?
            </h2>
            <div className="divider-red" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                titulo: 'Ingredientes Frescos',
                texto: 'Seleccionamos el mejor marisco fresco cada mañana. Sin congelados, sin compromisos con la calidad.',
                icono: GlobeAmericasIcon,
              },
              {
                titulo: 'Recetas Auténticas',
                texto: 'Nuestros platos siguen la tradición de la cocina nikkei-peruana, preparados por chefs con décadas de experiencia.',
                icono: CheckBadgeIcon,
              },
              {
                titulo: 'Ambiente Familiar',
                texto: 'Un espacio cálido y acogedor, ideal para celebraciones en familia o con amigos. Calificación 4.3 en más de 600 reseñas.',
                icono: UserGroupIcon,
              },
            ].map((item, i) => {
              const Icon = item.icono
              return (
                <div key={item.titulo} className={`reveal reveal-delay-${i + 1} text-center p-8`}>
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-ceviche-red/15 border border-ceviche-red/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-ceviche-red-light" />
                  </div>
                  <h3 className="text-xl font-playfair font-semibold text-white mb-3">{item.titulo}</h3>
                  <p className="text-white/50 leading-relaxed text-sm">{item.texto}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== INSTAGRAM ===== */}
      <InstagramSection />
    </div>
  )
}

export default Home
