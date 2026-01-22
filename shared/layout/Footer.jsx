export default function Footer() {
  return (
    <footer className="hidden md:block bg-gradient-to-r from-blue-950 to-blue-900 border-t border-white/10 py-3 px-6 mt-auto">
      <div className="flex items-center justify-between text-xs text-cyan-300/60">
        <div className="flex items-center gap-4">
          <span>Ceviche del Rey - 2025</span>
          <span className="w-1 h-1 bg-cyan-300/30 rounded-full"></span>
          <span>SC-702 - Universidad Fidelitas</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Version 1.0.0</span>
          <span className="w-1 h-1 bg-cyan-300/30 rounded-full"></span>
          <span>Actualizado: {new Date().toLocaleDateString('es-CR')}</span>
        </div>
      </div>
    </footer>
  )
}
