import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div
      className="auth-shell flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 p-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-black"
    >
      <Outlet />
    </div>
  )
}
