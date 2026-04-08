import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-ceviche-black flex flex-col">
      {/* En Home, el navbar flota sobre el hero. En otras páginas es normal */}
      <div className={isHome ? 'absolute top-0 left-0 right-0 z-50' : 'relative z-50'}>
        <Navbar />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
