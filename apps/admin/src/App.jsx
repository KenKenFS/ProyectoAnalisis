import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '@shared/layout/AuthLayout'
import InternalLayout from '@shared/layout/InternalLayout'
import { ProtectedAuthRoute } from '@shared/firebase/ProtectedAuthRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Inventory from './pages/Inventory'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Promotions from './pages/Promotions'
import Portal from './pages/Portal'
import Customers from './pages/Customers'
import Settings from './pages/Settings'
import SystemLogs from './pages/SystemLogs'
import NotFound from './pages/NotFound'
import './index.css'

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: 'HomeIcon', roles: ['Admin'] },
  { to: '/orders', label: 'Ordenes', icon: 'ClipboardDocumentListIcon', roles: ['Admin'] },
  { to: '/inventory', label: 'Inventario', icon: 'CubeIcon', roles: ['Admin'] },
  { to: '/accounting', label: 'Contabilidad', icon: 'BanknotesIcon', roles: ['Admin'] },
  { to: '/reports', label: 'Reporteria', icon: 'ChartBarIcon', roles: ['Admin'] },
  { to: '/users', label: 'Usuarios', icon: 'UsersIcon', roles: ['Admin'] },
  { to: '/promotions', label: 'Promociones', icon: 'GiftIcon', roles: ['Admin'] },
  { to: '/customers', label: 'Clientes', icon: 'UsersIcon', roles: ['Admin'] },
  { to: '/settings', label: 'Configuracion', icon: 'Cog6ToothIcon', roles: ['Admin'] },
  { to: '/system-logs', label: 'Logs', icon: 'DocumentTextIcon', roles: ['Admin'] },
  { to: '/portal', label: 'Portal Cliente', icon: 'GlobeAltIcon', roles: ['Admin'] },
]

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route
          element={
            <InternalLayout
              navbarTitle="Ceviche del Rey"
              navbarSubtitle="Sistema"
              sidebarLinks={sidebarLinks}
              appName="Admin"
              showNotifications={true}
            />
          }
        >
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Dashboard />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Orders />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Inventory />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/accounting"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Accounting />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Reports />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Users />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Promotions />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Customers />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <Settings />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/system-logs"
            element={
              <ProtectedAuthRoute requiredRole="Admin">
                <SystemLogs />
              </ProtectedAuthRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
