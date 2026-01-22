import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '@shared/layout/AuthLayout'
import InternalLayout from '@shared/layout/InternalLayout'
import { ProtectedAuthRoute } from '@shared/firebase/ProtectedAuthRoute'
import Login from './pages/Login'
import KitchenPage from './pages/KitchenPage'
import KitchenFullscreen from './pages/KitchenFullscreen'
import PedidosReservasPage from './pages/PedidosReservasPage'
import { useContext } from 'react'
import { OrdersContext } from './context/OrdersContext'
import { ClockIcon, FireIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

function KitchenStatusCounter() {
  const { pendingCount, preparingCount, readyCount } = useContext(OrdersContext)
  
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-cyan-300/70 font-medium mb-3">
        Estado Cocina
      </div>
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2 text-cyan-100 mb-2">
          <ClockIcon className="w-4 h-4" />
          <span className="text-xs uppercase">Pendientes</span>
        </div>
        <div className="text-2xl font-bold text-white">{pendingCount}</div>
      </div>
      <div className="bg-amber-500/20 rounded-lg p-3 border border-amber-400/30">
        <div className="flex items-center gap-2 text-amber-200 mb-2">
          <FireIcon className="w-4 h-4" />
          <span className="text-xs uppercase">En Prep.</span>
        </div>
        <div className="text-2xl font-bold text-amber-100">{preparingCount}</div>
      </div>
      <div className="bg-green-500/20 rounded-lg p-3 border border-green-400/30">
        <div className="flex items-center gap-2 text-green-200 mb-2">
          <CheckCircleIcon className="w-4 h-4" />
          <span className="text-xs uppercase">Listos</span>
        </div>
        <div className="text-2xl font-bold text-green-100">{readyCount}</div>
      </div>
    </div>
  )
}

const sidebarLinks = [
  { to: '/pedidos', label: 'Pedidos y Reservas', icon: 'ClipboardDocumentListIcon', roles: ['Cocina', 'Admin'] },
  { to: '/cocina', label: 'Cocina', icon: 'FireIcon', roles: ['Cocina', 'Admin'] },
  { to: '/configuracion', label: 'Configuracion', icon: 'Cog6ToothIcon', roles: ['Cocina', 'Admin'] },
]

function AppContent() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      <Route
        path="/cocina/fullscreen"
        element={
          <ProtectedAuthRoute allowedRoles={['Cocina', 'Admin']}>
            <KitchenFullscreen />
          </ProtectedAuthRoute>
        }
      />

      <Route
        element={
          <InternalLayout
            navbarTitle="Ceviche del Rey"
            navbarSubtitle="Modulo Cocina"
            sidebarLinks={sidebarLinks}
            sidebarExtra={<KitchenStatusCounter />}
            appName="Cocina"
            showNotifications={false}
          />
        }
      >
        <Route
          path="/cocina"
          element={
            <ProtectedAuthRoute allowedRoles={['Cocina', 'Admin']}>
              <KitchenPage />
            </ProtectedAuthRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <ProtectedAuthRoute allowedRoles={['Cocina', 'Admin']}>
              <PedidosReservasPage />
            </ProtectedAuthRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <ProtectedAuthRoute allowedRoles={['Cocina', 'Admin']}>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
                <p className="text-gray-600">Ajustes del modulo de cocina</p>
              </div>
            </ProtectedAuthRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
