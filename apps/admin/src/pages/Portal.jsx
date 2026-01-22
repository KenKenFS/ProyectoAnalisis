import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCartIcon,
  CalendarDaysIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const menuItems = [
  { id: 1, name: 'Ceviche Clásico', description: 'Pescado fresco, limón, cebolla, cilantro', price: 8500, category: 'Ceviches' },
  { id: 2, name: 'Ceviche de Camarón', description: 'Camarones frescos con nuestro toque especial', price: 10500, category: 'Ceviches' },
  { id: 3, name: 'Ceviche Mixto', description: 'Pescado, camarón, pulpo y cangrejo', price: 12500, category: 'Ceviches' },
  { id: 4, name: 'Tiradito', description: 'Pescado crudo con salsa de ají amarillo', price: 9500, category: 'Entradas' },
  { id: 5, name: 'Causas', description: 'Causa de papa amarilla con mariscos', price: 7500, category: 'Entradas' },
  { id: 6, name: 'Arroz con Mariscos', description: 'Arroz cremoso con mezcla de mariscos', price: 11000, category: 'Platos' },
  { id: 7, name: 'Escabeche', description: 'Pescado en caldo de cebolla marinada', price: 8500, category: 'Platos' },
  { id: 8, name: 'Bebida Refrescante', description: 'Limonada fresca o jugo natural', price: 2500, category: 'Bebidas' },
]

const activePromotions = [
  { id: 1, title: 'Happy Hour', description: '30% en bebidas alcohólicas', discount: '30%' },
  { id: 2, title: 'Menú del Día', description: 'Entrada + plato + bebida', discount: '20%' },
]

const schedule = [
  { day: 'Lunes', hours: '11:00 - 23:00' },
  { day: 'Martes', hours: '11:00 - 23:00' },
  { day: 'Miércoles', hours: '11:00 - 23:00' },
  { day: 'Jueves', hours: '11:00 - 23:00' },
  { day: 'Viernes', hours: '11:00 - 00:00' },
  { day: 'Sábado', hours: '12:00 - 00:00' },
  { day: 'Domingo', hours: '12:00 - 22:00' },
]

export default function Portal() {
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [activeSection, setActiveSection] = useState('menu')
  const [reservationData, setReservationData] = useState({ name: '', email: '', date: '', time: '', guests: '' })
  const role = localStorage.getItem('role')

  const categories = [...new Set(menuItems.map(m => m.category))]

  const handleReservation = () => {
    alert(`Reserva confirmada para ${reservationData.guests} personas`)
  }

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
              <div>
                <div className="font-bold text-lg">Ceviche del Rey</div>
                <div className="text-xs text-cyan-200">Portal de Clientes</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn btn-ghost btn-sm text-white gap-1">
                <PhoneIcon className="w-4 h-4" />
                <span className="hidden sm:inline">+506 2234-5678</span>
              </button>
              {cartCount > 0 && (
                <div className="relative">
                  <ShoppingCartIcon className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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
            {['menu', 'promos', 'reservation', 'schedule'].map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeSection === section
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {section === 'menu' && 'Menú'}
                {section === 'promos' && 'Promociones'}
                {section === 'reservation' && 'Reservar'}
                {section === 'schedule' && 'Horarios'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Menu Section */}
        {activeSection === 'menu' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Nuestro Menú</h2>

            {categories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-blue-500 pb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.filter(m => m.category === category).map(item => (
                    <div key={item.id} className="card bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-800">{item.name}</h4>
                          <span className="badge badge-primary">₡{item.price.toFixed(0)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                        <button 
                          onClick={() => setCartCount(cartCount + 1)}
                          className="btn btn-primary btn-sm w-full gap-1"
                        >
                          <ShoppingCartIcon className="w-4 h-4" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Promotions Section */}
        {activeSection === 'promos' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Promociones Especiales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activePromotions.map(p => (
                <div key={p.id} className="card bg-gradient-to-br from-amber-100 to-orange-100 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-800">{p.title}</h3>
                      <span className="badge bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-lg px-3 py-2">
                        {p.discount}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{p.description}</p>
                    <button className="btn btn-primary btn-sm w-full">Aplicar Promoción</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reservation Section */}
        {activeSection === 'reservation' && (
          <section className="mb-12 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Reservar Mesa</h2>
            <div className="card bg-white border border-gray-100 p-6">
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Nombre</span></label>
                  <input 
                    className="input input-bordered" 
                    placeholder="Tu nombre completo"
                    value={reservationData.name}
                    onChange={(e) => setReservationData({...reservationData, name: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Correo</span></label>
                  <input 
                    className="input input-bordered" 
                    type="email" 
                    placeholder="tu@email.com"
                    value={reservationData.email}
                    onChange={(e) => setReservationData({...reservationData, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Fecha</span></label>
                    <input 
                      className="input input-bordered" 
                      type="date"
                      value={reservationData.date}
                      onChange={(e) => setReservationData({...reservationData, date: e.target.value})}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Hora</span></label>
                    <input 
                      className="input input-bordered" 
                      type="time"
                      value={reservationData.time}
                      onChange={(e) => setReservationData({...reservationData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Número de personas</span></label>
                  <input 
                    className="input input-bordered" 
                    type="number" 
                    placeholder="4"
                    value={reservationData.guests}
                    onChange={(e) => setReservationData({...reservationData, guests: e.target.value})}
                  />
                </div>
                <button 
                  onClick={handleReservation}
                  className="btn btn-primary w-full gap-2"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  Reservar
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Schedule Section */}
        {activeSection === 'schedule' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-poppins">Nuestro Horario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {schedule.map((item, idx) => (
                <div key={idx} className="card bg-white border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-bold text-gray-800">{item.day}</h4>
                      <p className="text-sm text-gray-600">{item.hours}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 mt-8">
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Contacto</h3>
                <p className="flex items-center gap-2">
                  <PhoneIcon className="w-5 h-5" />
                  +506 2234-5678
                </p>
                <p className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  San José, Costa Rica
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h4 className="font-bold mb-2">Contacto</h4>
              <div className="space-y-1 text-sm text-cyan-200">
                <p>📍 San José, Costa Rica</p>
                <p>📞 +506 2234-5678</p>
                <p>✉️ info@cevichedelrey.com</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-2">Horario</h4>
              <div className="space-y-1 text-sm text-cyan-200">
                <p>Lunes - Viernes: 11:00 - 23:00</p>
                <p>Sábados: 12:00 - 00:00</p>
                <p>Domingos: 12:00 - 22:00</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-2">Síguenos</h4>
              <div className="space-y-1 text-sm text-cyan-200">
                <p>🔵 Facebook</p>
                <p>📷 Instagram</p>
                <p>🎵 TikTok</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm text-cyan-300">
            <p>© 2025 Ceviche del Rey. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
