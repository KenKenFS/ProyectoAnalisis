import { useState } from 'react'
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  LanguageIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const settingsTabs = [
  { id: 'general', label: 'General', icon: BuildingStorefrontIcon },
  { id: 'notifications', label: 'Notificaciones', icon: BellIcon },
  { id: 'security', label: 'Seguridad', icon: ShieldCheckIcon },
  { id: 'payment', label: 'Pagos', icon: CreditCardIcon },
  { id: 'integrations', label: 'Integraciones', icon: LanguageIcon },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    restaurantName: 'Ceviche del Rey',
    email: 'info@cevichedelrey.com',
    phone: '+506 2234-5678',
    address: 'San José, Costa Rica',
    timezone: 'America/Costa_Rica',
    language: 'es',
    businessHours: '9:00 AM - 10:00 PM',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-poppins">Configuración del Sistema</h1>
        <p className="text-gray-600 mt-1">Ajusta los parámetros de tu restaurante</p>
      </div>

      {/* Success Alert */}
      {saved && (
        <div className="alert alert-success shadow-lg">
          <CheckIcon className="w-6 h-6" />
          <span>Cambios guardados correctamente</span>
        </div>
      )}

      {/* Tabs */}
      <div className="card bg-white shadow-lg">
        <div className="card-body p-0">
          <div className="tabs tabs-bordered">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab tab-lg ${activeTab === tab.id ? 'tab-active' : ''}`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Nombre del Restaurante</span>
                  </label>
                  <input
                    type="text"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Correo Electrónico</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input input-bordered flex-1"
                      />
                      <span className="bg-blue-100">
                        <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                      </span>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Teléfono</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input input-bordered flex-1"
                      />
                      <span className="bg-green-100">
                        <PhoneIcon className="w-5 h-5 text-green-600" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Dirección</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="input input-bordered flex-1"
                    />
                    <span className="bg-purple-100">
                      <MapPinIcon className="w-5 h-5 text-purple-600" />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Zona Horaria</span>
                    </label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="select select-bordered"
                    >
                      <option>America/Costa_Rica</option>
                      <option>America/Los_Angeles</option>
                      <option>America/New_York</option>
                      <option>Europe/London</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Idioma</span>
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="select select-bordered"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Horario de Funcionamiento</span>
                  </label>
                  <input
                    type="text"
                    name="businessHours"
                    value={formData.businessHours}
                    onChange={handleChange}
                    className="input input-bordered"
                  />
                </div>

                <button onClick={handleSave} className="btn btn-primary gap-2">
                  <CheckIcon className="w-5 h-5" />
                  Guardar Cambios
                </button>
              </div>
            )}

            {/* Other Tabs */}
            {activeTab !== 'general' && (
              <div className="text-center py-8">
                <p className="text-gray-500">Configuración de {settingsTabs.find(t => t.id === activeTab)?.label} disponible próximamente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
