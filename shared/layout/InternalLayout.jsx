import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function InternalLayout({
  navbarTitle = 'Ceviche del Rey',
  sidebarLinks = [],
  sidebarExtra = null,
  appName = 'Sistema',
  hideFooter = false,
  hideSidebar = false,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-base-100 dark:bg-zinc-950">
      <Navbar title={navbarTitle} />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && (
          <Sidebar links={sidebarLinks} appName={appName} extraContent={sidebarExtra} />
        )}
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6 dark:bg-zinc-950">
          <Outlet />
        </main>
      </div>
      {!hideFooter && <Footer />}
    </div>
  )
}
