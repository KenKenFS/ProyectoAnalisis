import { Link } from 'react-router-dom'
import { HomeIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        <div className="card-dark p-8 sm:p-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-ceviche-red/20 flex items-center justify-center">
            <span className="text-5xl font-playfair font-bold text-ceviche-red">404</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-white mb-4">
            Pagina no encontrada
          </h1>
          <p className="text-white/60 mb-8">
            Lo sentimos, la pagina que buscas no existe o ha sido movida.
          </p>
          <Link
            to="/"
            className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            <HomeIcon className="w-5 h-5" />
            Volver al Inicio
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
