import {
  Squares2X2Icon,
  StopCircleIcon,
  RectangleGroupIcon,
  PlusCircleIcon,
  ViewColumnsIcon,
  Bars3BottomLeftIcon,
  PaintBrushIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { DECORATION_META } from './decorationTypes'

const STRUCTURE_TYPES = ['kitchen', 'bar', 'cashier', 'reception', 'bathroom', 'hallway']
const SIGNAL_TYPES = ['entrance', 'exit']

const WALL_PRESETS = [
  { id: 'h', label: 'Horizontal', Icon: Bars3BottomLeftIcon, orientation: 'horizontal' },
  { id: 'v', label: 'Vertical', Icon: ViewColumnsIcon, orientation: 'vertical' },
]

const FLOOR_TILES = [
  {
    id: 'wood',
    label: 'Madera',
    fill: 'repeating-linear-gradient(90deg, #c9986a, #c9986a 10px, #be8a5a 10px, #be8a5a 18px)',
  },
  {
    id: 'tile',
    label: 'Loseta',
    fill:
      'repeating-linear-gradient(0deg, #e8e8e8, #e8e8e8 11px, #cfcfcf 11px, #cfcfcf 12px), repeating-linear-gradient(90deg, #e8e8e8, #e8e8e8 11px, #cfcfcf 11px, #cfcfcf 12px)',
  },
  {
    id: 'concrete',
    label: 'Concreto',
    fill:
      'radial-gradient(circle at 30% 30%, #c8ccd0 0, #b4b9be 50%, #a0a5ab 100%)',
  },
  {
    id: 'none',
    label: 'Sin textura',
    fill: 'transparent',
    transparent: true,
  },
]

const SHAPES = [
  { id: 'square', label: 'Cuadrada', Icon: Squares2X2Icon },
  { id: 'round', label: 'Redonda', Icon: StopCircleIcon },
  { id: 'rectangle', label: 'Rectangular', Icon: RectangleGroupIcon },
]

function startDrag(e, payload) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-floorplan-element', JSON.stringify(payload))
}

function DraggableTile({ children, payload, title, disabled = false }) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => !disabled && startDrag(e, payload)}
      title={title}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60 dark:border-zinc-800 dark:bg-zinc-950/60'
          : 'cursor-grab border-gray-200 bg-gray-50 hover:border-cyan-400 hover:bg-cyan-50 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-950/30'
      }`}
    >
      {children}
    </div>
  )
}

/**
 * Sidebar derecho del editor (cuando NO hay elemento seleccionado).
 *
 * Cada tile es draggable al canvas. Al soltar:
 *  - Mesa existente → solo se coloca en el plano
 *  - Forma nueva → crea mesa en BD con esa forma y la coloca
 *  - Decoración → solo elemento visual
 *
 * Props:
 *  - mesasSinColocar
 *  - onAddMesa(mesa), onAddShape(shape), onAddDecoration(type)
 *  - busyMesa: deshabilita creación de mesa nueva mientras sincroniza con BD
 */
export default function ElementsPanel({
  mesasSinColocar = [],
  onAddMesa,
  onAddShape,
  onAddDecoration,
  onAddWall,
  onAddPerimeter,
  busyMesa = false,
  drawingFloorTexture = null,
  onStartDrawFloor,
  onCancelDrawFloor,
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="border-b border-gray-200 px-3 py-2.5 dark:border-zinc-800">
        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">Elementos</div>
        <div className="text-[11px] text-gray-500 dark:text-zinc-500">
          Arrastra al plano · Click para añadir al centro
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <section>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            Mesas existentes sin colocar ({mesasSinColocar.length})
          </div>
          {mesasSinColocar.length === 0 ? (
            <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50 p-2 text-center text-[11px] text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Todas las mesas registradas ya están colocadas.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {mesasSinColocar.map((mesa) => (
                <DraggableTile
                  key={mesa.id}
                  payload={{ kind: 'placeMesa', tableId: mesa.id }}
                  title={`Mesa ${mesa.numero || ''} · ${mesa.capacidad || 4} asientos`}
                >
                  <button
                    type="button"
                    onClick={() => onAddMesa?.(mesa)}
                    className="flex w-full flex-col items-center gap-1"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-emerald-400 bg-emerald-100 text-xs font-bold text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200">
                      {mesa.numero || '?'}
                    </div>
                    <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                      {mesa.capacidad || 4} asientos
                    </div>
                    <div className="text-[10px] leading-tight text-gray-500 dark:text-zinc-500">
                      {mesa.zona || 'General'}
                    </div>
                  </button>
                </DraggableTile>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            <PlusCircleIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Crear nueva mesa
          </div>
          <div className="mb-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
            Arrastra una forma. Se registra en la base de datos y queda lista para ordenar.
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((s) => (
              <DraggableTile
                key={s.id}
                payload={{ kind: 'shape', shape: s.id }}
                title={`Crear mesa ${s.label.toLowerCase()}`}
                disabled={busyMesa}
              >
                <button
                  type="button"
                  onClick={() => onAddShape?.(s.id)}
                  disabled={busyMesa}
                  className="flex w-full flex-col items-center gap-1 disabled:cursor-not-allowed"
                >
                  <s.Icon className="h-6 w-6 text-gray-700 dark:text-zinc-300" />
                  <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                    {s.label}
                  </div>
                </button>
              </DraggableTile>
            ))}
          </div>
          {busyMesa && (
            <div className="mt-1.5 text-[10px] text-cyan-700 dark:text-cyan-300">
              Creando mesa en BD...
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            Muros y límites
          </div>
          <div className="mb-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
            Se unen automáticamente al solaparse del mismo color.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WALL_PRESETS.map((w) => (
              <DraggableTile
                key={w.id}
                payload={{ kind: 'wall', orientation: w.orientation }}
                title={`Muro ${w.label.toLowerCase()}`}
              >
                <button
                  type="button"
                  onClick={() => onAddWall?.(w.orientation)}
                  className="flex w-full flex-col items-center gap-1"
                >
                  <w.Icon className="h-6 w-6 text-gray-700 dark:text-zinc-300" />
                  <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                    {w.label}
                  </div>
                </button>
              </DraggableTile>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAddPerimeter?.()}
            className="btn btn-xs mt-2 w-full border-gray-300 bg-white text-gray-800 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            Marco perimetral
          </button>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            <PaintBrushIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Pisos
          </div>
          <div className="mb-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
            Selecciona una textura y arrastra en el plano para crear el área.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FLOOR_TILES.map((tile) => {
              const active = drawingFloorTexture === tile.id
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => onStartDrawFloor?.(tile.id)}
                  title={`Dibujar piso ${tile.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                    active
                      ? 'border-cyan-500 ring-2 ring-cyan-500/40 dark:border-cyan-400'
                      : 'border-gray-200 hover:border-cyan-400 dark:border-zinc-800 dark:hover:border-cyan-500/50'
                  }`}
                >
                  <div
                    className={`h-10 w-full rounded-md ${
                      tile.transparent
                        ? 'border border-dashed border-gray-300 dark:border-zinc-600'
                        : 'border border-gray-300 dark:border-zinc-700'
                    }`}
                    style={tile.transparent ? undefined : { background: tile.fill }}
                  />
                  <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                    {tile.label}
                  </div>
                </button>
              )
            })}
          </div>
          {drawingFloorTexture && (
            <button
              type="button"
              onClick={() => onCancelDrawFloor?.()}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Cancelar dibujo
            </button>
          )}
        </section>

        <section>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            Estructuras del local
          </div>
          <div className="mb-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
            Coloca la estructura y usa el lápiz en su esquina para añadir vértices (formas en L, etc.).
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STRUCTURE_TYPES.map((type) => {
              const meta = DECORATION_META[type]
              if (!meta) return null
              const Icon = meta.Icon
              return (
                <DraggableTile
                  key={type}
                  payload={{ kind: 'decoration', decorationType: type }}
                  title={meta.label}
                >
                  <button
                    type="button"
                    onClick={() => onAddDecoration?.(type)}
                    className="flex w-full flex-col items-center gap-1"
                  >
                    <Icon className="h-6 w-6 text-gray-700 dark:text-zinc-300" />
                    <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                      {meta.label}
                    </div>
                  </button>
                </DraggableTile>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-zinc-400">
            Señalización
          </div>
          <div className="mb-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
            Iconos indicativos sin estructura física.
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SIGNAL_TYPES.map((type) => {
              const meta = DECORATION_META[type]
              if (!meta) return null
              const Icon = meta.Icon
              return (
                <DraggableTile
                  key={type}
                  payload={{ kind: 'decoration', decorationType: type }}
                  title={meta.label}
                >
                  <button
                    type="button"
                    onClick={() => onAddDecoration?.(type)}
                    className="flex w-full flex-col items-center gap-1"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                      <Icon className="h-5 w-5 text-gray-700 dark:text-zinc-300" />
                    </div>
                    <div className="text-[10px] leading-tight text-gray-700 dark:text-zinc-300">
                      {meta.label}
                    </div>
                  </button>
                </DraggableTile>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
