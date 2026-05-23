import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import {
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT,
  CANVAS_MIN,
  DEFAULT_SECTION_CANVAS_WIDTH,
  DEFAULT_SECTION_CANVAS_HEIGHT,
  formatCanvasSize,
} from './canvasConfig'

const SECTION_COLORS = [
  { id: 'emerald', label: 'Verde', value: '#bbf7d0' },
  { id: 'sky', label: 'Cielo', value: '#bae6fd' },
  { id: 'amber', label: 'Ámbar', value: '#fde68a' },
  { id: 'violet', label: 'Violeta', value: '#ddd6fe' },
  { id: 'rose', label: 'Rosa', value: '#fecdd3' },
  { id: 'slate', label: 'Pizarra', value: '#cbd5e1' },
]

/**
 * Navegador de secciones (cada sección = plano independiente).
 *
 * Props:
 *  - sections, activeSectionId
 *  - onSelect(id), onAdd, onUpdate(id, patch), onRemove(id)
 *  - onCanvasSizeChange({ width, height }) — tamaño del área dibujable
 */
export default function SectionsPanel({
  sections = [],
  activeSectionId = null,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onCanvasSizeChange,
}) {
  function handleAdd() {
    if (typeof onAdd !== 'function') return
    onAdd({
      canvasWidth: DEFAULT_SECTION_CANVAS_WIDTH,
      canvasHeight: DEFAULT_SECTION_CANVAS_HEIGHT,
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-zinc-800">
        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">Planos</div>
        <button
          type="button"
          onClick={handleAdd}
          className="btn btn-xs border-0 bg-cyan-600 text-white hover:bg-cyan-700"
          title="Nueva sección"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {sections.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-500">
            Crea una sección para empezar.
          </div>
        ) : (
          sections.map((s) => {
            const isActive = s.id === activeSectionId
            return (
              <div
                key={s.id}
                className={`space-y-2 rounded-lg border p-2.5 transition ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200 dark:border-cyan-400 dark:bg-cyan-950/30 dark:ring-cyan-500/20'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(s.id)}
                  className="flex w-full items-center gap-2 text-left"
                  title="Activar este plano"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-gray-300 dark:border-zinc-700"
                    style={{ backgroundColor: s.color || '#e5e7eb' }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {s.name || 'Sección'}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-zinc-500">
                      {(s.elements || []).length} elemento(s)
                    </div>
                  </div>
                  {isActive && <CheckIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                </button>

                {isActive && (
                  <>
                    <input
                      type="text"
                      value={s.name || ''}
                      onChange={(e) => onUpdate?.(s.id, { name: e.target.value })}
                      className="input input-bordered input-xs min-h-8 h-8 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Nombre sección"
                    />
                    {typeof onCanvasSizeChange === 'function' && (
                      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900/80">
                        <div className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                          Tamaño del área
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-500">
                          {formatCanvasSize(s.canvasWidth, s.canvasHeight)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-[10px] text-gray-500 dark:text-zinc-500">
                            Ancho (px)
                            <input
                              type="number"
                              min={CANVAS_MIN}
                              max={CANVAS_MAX_WIDTH}
                              step={50}
                              value={s.canvasWidth}
                              onChange={(e) =>
                                onCanvasSizeChange({
                                  width: Number(e.target.value),
                                  height: s.canvasHeight,
                                })
                              }
                              className="input input-bordered input-xs mt-0.5 h-8 min-h-8 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                          <label className="block text-[10px] text-gray-500 dark:text-zinc-500">
                            Alto (px)
                            <input
                              type="number"
                              min={CANVAS_MIN}
                              max={CANVAS_MAX_HEIGHT}
                              step={50}
                              value={s.canvasHeight}
                              onChange={(e) =>
                                onCanvasSizeChange({
                                  width: s.canvasWidth,
                                  height: Number(e.target.value),
                                })
                              }
                              className="input input-bordered input-xs mt-0.5 h-8 min-h-8 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                        </div>
                        <p className="text-[10px] leading-snug text-gray-400 dark:text-zinc-500">
                          Máx. {CANVAS_MAX_WIDTH} × {CANVAS_MAX_HEIGHT} px. Guarda el plano para aplicar en
                          meseros.
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {SECTION_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onUpdate?.(s.id, { color: c.value })}
                          className={`h-5 w-5 rounded-full border-2 transition ${
                            s.color === c.value
                              ? 'border-cyan-600 dark:border-cyan-400'
                              : 'border-gray-200 dark:border-zinc-700'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la sección "${s.name}" y todos sus elementos?`)) {
                          onRemove?.(s.id)
                        }
                      }}
                      className="btn btn-ghost btn-xs w-full text-red-600 dark:text-red-400"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Eliminar plano
                    </button>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
