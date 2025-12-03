import { Link } from 'react-router-dom'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="text-8xl mb-4">🐚</div>
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Página no encontrada</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </p>
      <div className="flex gap-3">
        <Link to="/admin" className="btn btn-primary gap-2">
          <HomeIcon className="w-5 h-5" />
          Ir al Dashboard
        </Link>
        <button onClick={() => window.history.back()} className="btn btn-outline gap-2">
          <ArrowLeftIcon className="w-5 h-5" />
          Volver
        </button>
      </div>
    </div>
  )
}
