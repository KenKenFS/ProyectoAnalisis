import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { menuItems, promotions, reservations } from '../data/fakeData'
import {
  ShoppingCartIcon,
  CalendarDaysIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

export default function Portal() {
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [activeSection, setActiveSection] = useState('menu')
  const role = localStorage.getItem('role')

  const categories = [...new Set(menuItems.map(m => m.category))]

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {role && role !== 'Cliente' && (
                <button
                  onClick={() => navigate(-1)}
                  className="btn btn-ghost btn-sm btn-circle text-white"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              )}
              <div className="text-2xl"></div>
              <div>
                <div className="font-bold text-lg">Ceviche del Rey</div>
                <div className="text-xs text-cyan-200">Portal de Clientes</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn btn-ghost btn-sm text-white gap-1">
                <PhoneIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Contacto</span>
              </button>
              {cartCount > 0 && (
                <div className="relative">
                  <ShoppingCartIcon className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-700 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-9xl">🐟</div>
          <div className="absolute bottom-10 right-10 text-9xl">🦐</div>
        </div>
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 font-poppins">
            Ceviche del Rey
          </h1>
          <p className="text-xl md:text-2xl text-cyan-100 mb-2">
            Los mejores ceviches de la región
          </p>
          <p className="text-cyan-200 flex items-center justify-center gap-2 mb-6">
            <MapPinIcon className="w-5 h-5" />
            San José, Costa Rica
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveSection('menu')}
              className="btn btn-lg bg-white text-blue-900 hover:bg-cyan-100 border-0"
            >
              Ver Menú
            </button>
            <button
              onClick={() => setActiveSection('reservation')}
              className="btn btn-lg btn-outline text-white border-white hover:bg-white/20"
            >
              Reservar Mesa
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-40 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3">
            {['menu', 'promos', 'reservation', 'tracking'].map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeSection === section
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {section === 'menu' && 'Menú'}
                {section === 'promos' && 'Promociones'}
                {section === 'reservation' && 'Reservar'}
                {section === 'tracking' && 'Mi Pedido'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Promotions Section */}
        {activeSection === 'promos' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Promociones Especiales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotions.filter(p => p.active).map(p => (
                <div key={p.id} className="card bg-gradient-to-br from-amber-100 to-orange-100 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-800">{p.title}</h3>
                      <span className="badge bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-lg px-3 py-2">
                        {p.discount}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{p.desc}</p>
                    <button className="btn btn-primary btn-sm w-full">Aplicar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu Section */}
        {activeSection === 'menu' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Nuestro Menú</h2>

            {categories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {menuItems.filter(m => m.category === category).map(m => (
                    <div key={m.id} className="card bg-white shadow-md hover:shadow-xl transition-all group">
                      <div className="h-36 bg-gradient-to-br from-blue-200 to-cyan-200 flex items-center justify-center relative overflow-hidden">
                        <span className="text-6xl group-hover:scale-110 transition-transform">
                          {m.category === 'Ceviches' ? '🐟' :
                           m.category === 'Bebidas' ? '🍹' :
                           m.category === 'Entradas' ? '🥗' :
                           m.category === 'Acompañamientos' ? '🍟' : '🍽️'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-800">{m.name}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{m.desc}</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xl font-bold text-primary">
                            ₡{(m.price * 700).toLocaleString()}
                          </span>
                          <button
                            onClick={() => setCartCount(c => c + 1)}
                            className="btn btn-primary btn-sm"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Reservation Section */}
        {activeSection === 'reservation' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Reservar Mesa</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg p-6">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Hacer una Reservación</h3>
                <form className="space-y-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Tu nombre</span></label>
                    <input className="input input-bordered" placeholder="Nombre completo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Email</span></label>
                      <input className="input input-bordered" type="email" placeholder="tu@email.com" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Teléfono</span></label>
                      <input className="input input-bordered" placeholder="8888-8888" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Fecha</span></label>
                      <input className="input input-bordered" type="date" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Hora</span></label>
                      <select className="select select-bordered">
                        <option>12:00</option>
                        <option>13:00</option>
                        <option>14:00</option>
                        <option>18:00</option>
                        <option>19:00</option>
                        <option>20:00</option>
                        <option>21:00</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Número de personas</span></label>
                    <select className="select select-bordered">
                      <option>1 persona</option>
                      <option>2 personas</option>
                      <option>3 personas</option>
                      <option>4 personas</option>
                      <option>5 personas</option>
                      <option>6+ personas</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Notas especiales (opcional)</span></label>
                    <textarea className="textarea textarea-bordered" placeholder="Cumpleaños, preferencias..."></textarea>
                  </div>
                  <button className="btn btn-primary w-full">Confirmar Reservación</button>
                </form>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-4">Próximas Reservas (Demo)</h3>
                <div className="space-y-3">
                  {reservations.map(r => (
                    <div key={r.id} className="card bg-white shadow-md p-4 border-l-4 border-primary">
                      <div className="font-bold text-gray-800">{r.name}</div>
                      <div className="text-sm text-gray-600 mt-2 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-4 h-4 text-primary" />
                          {r.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4 text-primary" />
                          {r.time}
                        </span>
                        <span className="flex items-center gap-1">
                          {r.guests} personas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Order Tracking Section */}
        {activeSection === 'tracking' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Seguimiento de Pedido</h2>

            <div className="card bg-white shadow-lg p-6 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl text-gray-800">Pedido #ORD-001</h3>
                <p className="text-gray-500">Mesa 3</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">Pedido recibido</div>
                    <div className="text-sm text-gray-500">14:32</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">En preparación</div>
                    <div className="text-sm text-gray-500">14:35</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white animate-pulse">⏳</div>
                  <div className="flex-1">
                    <div className="font-medium text-amber-600">Casi listo...</div>
                    <div className="text-sm text-gray-500">Estimado: 5-10 min</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 opacity-50">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">4</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-500">Listo para servir</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Tu pedido:</h4>
                <div className="text-sm text-gray-600">
                  <p>• 2x Ceviche Mixto</p>
                  <p>• 1x Limonada Fresca</p>
                </div>
                <div className="mt-2 pt-2 border-t font-bold">
                  Total: ₡11,200
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Contact Footer */}
      <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <div className="text-3xl mb-3"></div>
              <h3 className="font-bold text-xl mb-2">Ceviche del Rey</h3>
              <p className="text-cyan-200 text-sm">Los mejores ceviches de la región desde 2020</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contacto</h4>
              <div className="space-y-2 text-cyan-100 text-sm">
                <p className="flex items-center justify-center md:justify-start gap-2">
                  <PhoneIcon className="w-4 h-4" />
                  +506 2203-5109
                </p>
                <p className="flex items-center justify-center md:justify-start gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  San José, Costa Rica
                </p>
                <p>info@cevichedelrey.cr</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Horario</h4>
              <div className="space-y-1 text-cyan-100 text-sm">
                <p>Lunes - Viernes: 11am - 10pm</p>
                <p>Sábado - Domingo: 12pm - 11pm</p>
              </div>
              <div className="flex justify-center md:justify-start gap-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 cursor-pointer">f</div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 cursor-pointer">📸</div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 cursor-pointer">🎵</div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-cyan-200">
            <p>© 2025 Ceviche del Rey — Proyecto SC-702, Universidad Fidélitas</p>
            <p className="mt-1 text-cyan-300/60">Equipo: Rosemary • Kency • Daniel</p>
          </div>
        </div>
      </footer>

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button className="btn btn-primary btn-lg shadow-2xl gap-2 rounded-full">
            <ShoppingCartIcon className="w-6 h-6" />
            <span className="font-bold">{cartCount}</span>
            <span className="hidden sm:inline">items</span>
          </button>
        </div>
      )}
    </div>
  )
}
