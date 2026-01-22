import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '@shared/layout/AuthLayout'
import InternalLayout from '@shared/layout/InternalLayout'
import { ProtectedAuthRoute } from '@shared/firebase/ProtectedAuthRoute'
import Login from './pages/Login'
import MeserosPage from './pages/MeserosPage'

const sidebarLinks = [
  { to: '/mesero', label: 'Mesas', icon: 'TableCellsIcon', roles: ['Mesero', 'Admin'] },
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
              navbarTitle="Meseros"
              navbarSubtitle="Tablet de Ordenes"
              sidebarLinks={sidebarLinks}
              appName="Meseros"
              showNotifications={false}
            />
          }
        >
          <Route
            path="/mesero"
            element={
              <ProtectedAuthRoute allowedRoles={['Mesero', 'Admin']}>
                <MeserosPage />
              </ProtectedAuthRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
