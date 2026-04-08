import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '@shared/firebase/AuthContext'

import Layout from './components/Layout'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MisReservas from './pages/MisReservas'
import NuevaReserva from './pages/NuevaReserva'
import NotFound from './pages/NotFound'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-ceviche-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ceviche-red" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login y registro sin navbar/footer */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* Resto del portal con layout completo */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/mis-reservas" element={<MisReservas />} />
          <Route path="/nueva-reserva" element={<NuevaReserva />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
