import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

// Internal layout with sidebar for authenticated users
export function InternalLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}

// Public layout without sidebar (for login)
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700">
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}

// Portal layout for clients (minimal chrome)
export function PortalLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
    </div>
  )
}

