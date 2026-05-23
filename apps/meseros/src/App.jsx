import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '@shared/layout/AuthLayout'
import InternalLayout from '@shared/layout/InternalLayout'
import { ProtectedAuthRoute } from '@shared/firebase/ProtectedAuthRoute'
import Login from './pages/Login'
import MeserosPage from './pages/MeserosPage'
import FloorPlanEditor from './pages/FloorPlanEditor'

const meseroSidebarLinks = [
  { to: '/mesero', label: 'Mesas', icon: 'TableCellsIcon', roles: ['Mesero', 'Admin'] },
]

const adminEditorSidebarLinks = [
  { to: '/mesero', label: 'Mesas', icon: 'TableCellsIcon', roles: ['Mesero', 'Admin'] },
  { to: '/mesero/plano', label: 'Editor de plano', icon: 'MapIcon', roles: ['Admin'] },
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
              navbarTitle="Ceviche del Rey - Meseros"
              sidebarLinks={meseroSidebarLinks}
              appName="Meseros"
              hideSidebar
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

        <Route
          element={
            <InternalLayout
              navbarTitle="Ceviche del Rey - Editor de plano"
              sidebarLinks={adminEditorSidebarLinks}
              appName="Plano"
            />
          }
        >
          <Route
            path="/mesero/plano"
            element={
              <ProtectedAuthRoute allowedRoles={['Admin']}>
                <FloorPlanEditor />
              </ProtectedAuthRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
