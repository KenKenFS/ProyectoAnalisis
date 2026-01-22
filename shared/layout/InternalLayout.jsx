import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function InternalLayout({
  navbarTitle = 'Ceviche del Rey',
  navbarSubtitle = 'Sistema',
  sidebarLinks = [],
  sidebarExtra = null,
  appName = 'Sistema',
  showNotifications = true,
  hideFooter = false,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-base-100">
      <Navbar 
        title={navbarTitle} 
        subtitle={navbarSubtitle}
        showNotifications={showNotifications}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar links={sidebarLinks} appName={appName} extraContent={sidebarExtra} />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      {!hideFooter && <Footer />}
    </div>
  )
}
