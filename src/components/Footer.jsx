export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} <strong>Ceviche del Rey</strong></span>
            <span className="hidden sm:inline">—</span>
            <span className="hidden sm:inline">SC-702, Universidad Fidélitas</span>
          </div>
          <div className="text-gray-500 text-xs sm:text-sm">
            Equipo: Rosemary Carballo • Kency Fallas • Daniel Rodríguez
          </div>
        </div>
      </div>
    </footer>
  )
}
