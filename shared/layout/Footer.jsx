export default function Footer() {
  return (
    <footer className="hidden md:block bg-gradient-to-r from-blue-950 to-blue-900 border-t border-white/10 py-3 px-6 mt-auto dark:border-zinc-800/90 dark:from-zinc-950 dark:to-zinc-950">
      <div className="flex items-center justify-between text-xs text-cyan-300/60 dark:text-zinc-500">
        <div className="flex items-center gap-4">
          <span>Ceviche del Rey - 2026</span>
          <span className="w-1 h-1 bg-cyan-300/30 rounded-full dark:bg-red-950/80" aria-hidden />
          <span>SC-803 - Universidad Fidelitas</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Version 1.0.0</span>
          <span className="w-1 h-1 bg-cyan-300/30 rounded-full dark:bg-red-950/80" aria-hidden />
          <span>Actualizado: {new Date().toLocaleDateString('es-CR')}</span>
        </div>
      </div>
    </footer>
  )
}
