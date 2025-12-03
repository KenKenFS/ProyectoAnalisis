import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { InternalLayout, PublicLayout, PortalLayout } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Inventory from './pages/Inventory'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Promotions from './pages/Promotions'
import Portal from './pages/Portal'
import Cocina from './pages/Cocina'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

function App() {
  return (
    <BrowserRouter basename="/ProyectoAnalisis/">
      <Routes>
        {/* Public routes - no sidebar/navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Portal routes - special layout for clients */}
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<Portal />} />
        </Route>

        {/* Internal routes - with sidebar/navbar */}
        <Route element={<InternalLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<ProtectedRoute allowed={["Admin"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute allowed={["Cajero", "Mesero", "Admin"]}><POS /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute allowed={["Admin", "Mesero", "Cocina"]}><Orders /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowed={["Admin"]}><Inventory /></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute allowed={["Admin"]}><Accounting /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowed={["Admin"]}><Reports /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowed={["Admin"]}><Users /></ProtectedRoute>} />
          <Route path="/promotions" element={<ProtectedRoute allowed={["Admin", "Mesero"]}><Promotions /></ProtectedRoute>} />
          <Route path="/cocina" element={<ProtectedRoute allowed={["Cocina"]}><Cocina /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
