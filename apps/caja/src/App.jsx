import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '@shared/layout/AuthLayout'
import InternalLayout from '@shared/layout/InternalLayout'
import { ProtectedAuthRoute } from '@shared/firebase/ProtectedAuthRoute'
import Login from './pages/Login'
import VentasPage from './pages/VentasPage'
import CierresCajaPage from './pages/CierresCajaPage'
import ReportesPage from './pages/ReportesPage'

const sidebarLinks = [
  { to: '/ventas', label: 'Ventas', icon: 'ShoppingCartIcon', roles: ['Cajero', 'Admin'] },
  { to: '/cierres', label: 'Cierres de Caja', icon: 'DocumentTextIcon', roles: ['Cajero', 'Admin'] },
  { to: '/reportes', label: 'Reportes', icon: 'ChartBarIcon', roles: ['Cajero', 'Admin'] },
]

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Route>

        <Route
          element={
            <InternalLayout
              navbarTitle="Ceviche del Rey"
              navbarSubtitle="Modulo Caja - POS"
              sidebarLinks={sidebarLinks}
              appName="Caja"
              showNotifications={false}
            />
          }
        >
          <Route
            path="/caja"
            element={
              <ProtectedAuthRoute allowedRoles={['Cajero', 'Admin']}>
                <VentasPage />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/ventas"
            element={
              <ProtectedAuthRoute allowedRoles={['Cajero', 'Admin']}>
                <VentasPage />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/cierres"
            element={
              <ProtectedAuthRoute allowedRoles={['Cajero', 'Admin']}>
                <CierresCajaPage />
              </ProtectedAuthRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedAuthRoute allowedRoles={['Cajero', 'Admin']}>
                <ReportesPage />
              </ProtectedAuthRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
