import { useEffect, useState } from 'react'
import {
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { DECORATION_META } from './decorationTypes'
import { getDefaultSizeForSeats } from './seatLayout'
import { FLOOR_TEXTURES } from './FloorTextures'

const FLOOR_OBJECT_TEXTURES = [
  { id: 'wood', label: 'Madera' },
  { id: 'tile', label: 'Loseta' },
  { id: 'concrete', label: 'Concreto' },
  { id: 'none', label: 'Sin textura' },
]

const SHAPES = [
  { id: 'square', label: 'Cuadrada' },
  { id: 'round', label: 'Redonda' },
  { id: 'rectangle', label: 'Rectangular' },
]

const SIZE_PRESETS = [
  { id: 'S', label: 'S · 1-2', seats: 2 },
  { id: 'M', label: 'M · 3-4', seats: 4 },
  { id: 'L', label: 'L · 5-6', seats: 6 },
  { id: 'XL', label: 'XL · 7-12', seats: 8 },
]

const DECORATION_COLORS = [
  { id: 'default', value: null, label: 'Default' },
  { id: 'rose', value: '#fecdd3', label: 'Rosa' },
  { id: 'amber', value: '#fde68a', label: 'Ámbar' },
  { id: 'emerald', value: '#bbf7d0', label: 'Verde' },
  { id: 'sky', value: '#bae6fd', label: 'Cielo' },
  { id: 'violet', value: '#ddd6fe', label: 'Violeta' },
  { id: 'slate', value: '#cbd5e1', label: 'Pizarra' },
  { id: 'orange', value: '#fed7aa', label: 'Naranja' },
]

const WALL_COLORS = [
  { id: 'blue', value: '#1d4ed8', label: 'Azul' },
  { id: 'slate', value: '#475569', label: 'Pizarra' },
  { id: 'graphite', value: '#1f2937', label: 'Grafito' },
  { id: 'brown', value: '#78350f', label: 'Madera' },
  { id: 'ivory', value: '#e5e7eb', label: 'Marfil' },
  { id: 'rose', value: '#9f1239', label: 'Borgoña' },
  { id: 'emerald', value: '#065f46', label: 'Esmeralda' },
]

/**
 * Panel inline a la derecha que aparece cuando hay un elemento seleccionado.
 *
 * Props:
 *  - element: elemento seleccionado del draft
 *  - mesa: doc Firestore vinculado (o null)
 *  - sections: lista de secciones (para mover)
 *  - activeSectionId
 *  - onUpdate(patch): actualiza el elemento en el draft
 *  - onUpdateMesa(patch): actualiza el doc Firestore vinculado
 *  - onRemoveFromPlan(): quita del plano
 *  - onDeleteMesa(): elimina la mesa de Firestore (validando cuenta activa)
 *  - onMoveToSection(targetSectionId)
 *  - onDeselect()
 *  - busyMesa: true mientras se sincroniza con Firestore
 */
export default function ElementDetailsPanel({
  element,
  mesa,
  sections = [],
  activeSectionId = null,
  onUpdate,
  onUpdateMesa,
  onRemoveFromPlan,
  onDeleteMesa,
  onMoveToSection,
  onDeselect,
  onDuplicate,
  busyMesa = false,
}) {
  const isTable = element?.type === 'table'
  const isDecoration = element?.type === 'decoration'
  const isWall = element?.type === 'wall'
  const isFloor = element?.type === 'floor'
  const isLabel = element?.type === 'label'
  const isStructure =
    isDecoration && DECORATION_META[element?.decorationType]?.kind === 'structure'
  const canDuplicate = !isTable && (isDecoration || isWall || isFloor || isLabel)

  const [label, setLabel] = useState(element?.label || '')
  const [shape, setShape] = useState(element?.shape || 'square')
  const [seats, setSeats] = useState(Number(element?.seats || mesa?.capacidad || 4))
  const [numero, setNumero] = useState(Number(mesa?.numero || 0))
  const [width, setWidth] = useState(Number(element?.width || 80))
  const [height, setHeight] = useState(Number(element?.height || 80))

  useEffect(() => {
    setLabel(element?.label || '')
    setShape(element?.shape || 'square')
    setSeats(Number(element?.seats || mesa?.capacidad || 4))
    setNumero(Number(mesa?.numero || 0))
    setWidth(Number(element?.width || 80))
    setHeight(Number(element?.height || 80))
  }, [element?.id, mesa?.id])

  useEffect(() => {
    setWidth(Number(element?.width || 80))
    setHeight(Number(element?.height || 80))
  }, [element?.width, element?.height])

  function commitLabel() {
    if (label !== element.label) onUpdate?.({ label })
  }
  function commitShape(next) {
    setShape(next)
    const size = getDefaultSizeForSeats(seats, next)
    onUpdate?.({ shape: next, width: size.width, height: size.height })
  }
  function applySeats(value) {
    const clamped = Math.max(1, Math.min(20, Number(value || 1)))
    setSeats(clamped)
    const size = getDefaultSizeForSeats(clamped, shape)
    onUpdate?.({ seats: clamped, width: size.width, height: size.height })
    if (mesa && clamped !== Number(mesa.capacidad || 0)) {
      onUpdateMesa?.({ capacidad: clamped })
    }
  }
  function commitNumero() {
    const value = Math.max(1, Number(numero || 1))
    setNumero(value)
    if (mesa && value !== Number(mesa.numero || 0)) {
      onUpdateMesa?.({ numero: value })
      onUpdate?.({ label: `Mesa ${value}` })
    }
  }
  function commitWidth() {
    const v = Math.max(36, Number(width || 36))
    setWidth(v)
    onUpdate?.({ width: v })
  }
  function commitHeight() {
    const v = Math.max(36, Number(height || 36))
    setHeight(v)
    onUpdate?.({ height: v })
  }

  if (!element) return null

  const meta =
    isDecoration && DECORATION_META[element.decorationType]
      ? DECORATION_META[element.decorationType]
      : null

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">
            {isTable
              ? 'Detalle de mesa'
              : isWall
              ? 'Detalle de muro'
              : isFloor
              ? 'Detalle de piso'
              : isDecoration
              ? 'Detalle de elemento'
              : 'Detalle'}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-zinc-500">
            {isTable
              ? mesa
                ? `Vinculada a Mesa ${mesa.numero || '?'} (BD)`
                : 'Mesa sin vincular'
              : isWall
              ? 'Muros del mismo color se unen al solaparse'
              : isFloor
              ? 'Objeto independiente · render por debajo de todo'
              : meta?.label || 'Elemento'}
          </div>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="btn btn-ghost btn-xs"
          title="Volver a paleta"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {busyMesa && (
          <div className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-950/30 dark:text-cyan-200">
            Sincronizando con base de datos...
          </div>
        )}

        {!isWall && !isFloor && (
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Etiqueta
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={commitLabel}
              className="input input-bordered input-sm mt-1 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder={isTable ? `Mesa ${mesa?.numero || '?'}` : 'Texto'}
            />
          </label>
        )}

        {isFloor && (
          <>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
                Textura
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {FLOOR_OBJECT_TEXTURES.map((t) => {
                  const active = (element.texture || 'wood') === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onUpdate?.({ texture: t.id })}
                      className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition ${
                        active
                          ? 'border-cyan-500 bg-cyan-600 text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </label>

            <label className="block">
              <span className="flex items-center justify-between text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
                <span>Opacidad</span>
                <span className="text-gray-500 dark:text-zinc-500">
                  {Math.round((element.opacity ?? 1) * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={60}
                max={100}
                step={1}
                value={Math.round((element.opacity ?? 1) * 100)}
                onChange={(e) => {
                  const next = Math.max(60, Math.min(100, Number(e.target.value) || 100))
                  onUpdate?.({ opacity: next / 100 })
                }}
                className="range range-xs range-info mt-2 w-full"
              />
            </label>
          </>
        )}

        {isWall && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Color del muro
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WALL_COLORS.map((c) => {
                const isSelected = (element.color || '#1d4ed8') === c.value
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onUpdate?.({ color: c.value })}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      isSelected
                        ? 'border-cyan-500 dark:border-cyan-400'
                        : 'border-gray-200 dark:border-zinc-700'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                )
              })}
            </div>
          </div>
        )}

        {isTable && mesa && (
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Número de mesa (BD)
            </span>
            <input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(Number(e.target.value) || 0)}
              onBlur={commitNumero}
              className="input input-bordered input-sm mt-1 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        )}

        {isTable && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Forma
            </div>
            <div className="flex gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => commitShape(s.id)}
                  className={`flex-1 rounded border px-2 py-1.5 text-xs font-semibold transition ${
                    shape === s.id
                      ? 'border-cyan-500 bg-cyan-600 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTable && (
          <>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
                Capacidad rápida
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applySeats(p.seats)}
                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
                      seats === p.seats
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
                Capacidad (1-20)
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={seats}
                onChange={(e) => applySeats(Number(e.target.value) || 1)}
                className="input input-bordered input-sm mt-1 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </>
        )}

        {isDecoration && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Color
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DECORATION_COLORS.map((c) => {
                const isSelected = (element.color || null) === c.value
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      onUpdate?.({
                        color: c.value,
                        floorTexture: c.value ? null : element.floorTexture,
                      })
                    }
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] transition ${
                      isSelected
                        ? 'border-cyan-500 dark:border-cyan-400'
                        : 'border-gray-200 dark:border-zinc-700'
                    }`}
                    style={{
                      backgroundColor: c.value || (c.id === 'default' ? '#f3f4f6' : '#fff'),
                    }}
                    title={c.label}
                  >
                    {c.id === 'default' ? '–' : ''}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isStructure && (
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Piso interno
            </span>
            <select
              value={element.floorTexture || ''}
              onChange={(e) => {
                const next = e.target.value || null
                onUpdate?.(
                  next
                    ? { floorTexture: next, color: null }
                    : { floorTexture: null }
                )
              }}
              className="select select-bordered select-sm mt-1 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">Usar color sólido</option>
              {FLOOR_TEXTURES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-gray-500 dark:text-zinc-500">
              Color y textura son excluyentes: al elegir uno se quita el otro.
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] uppercase text-gray-500 dark:text-zinc-500">Ancho (px)</span>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 0)}
              onBlur={commitWidth}
              className="input input-bordered input-xs h-8 min-h-8 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase text-gray-500 dark:text-zinc-500">Alto (px)</span>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
              onBlur={commitHeight}
              className="input input-bordered input-xs h-8 min-h-8 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>

        {sections.length > 1 && (
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-zinc-400">
              Mover a sección
            </span>
            <select
              value={activeSectionId || ''}
              onChange={(e) => {
                if (e.target.value && e.target.value !== activeSectionId) {
                  onMoveToSection?.(e.target.value)
                }
              }}
              className="select select-bordered select-sm mt-1 w-full dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {isTable && mesa?.cuentaActivaId && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
            Esta mesa tiene cuenta activa. No se puede eliminar de la BD ni quitar del plano hasta que se cobre.
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-200 p-3 dark:border-zinc-800">
        {canDuplicate && (
          <button
            type="button"
            onClick={() => onDuplicate?.()}
            className="btn btn-sm w-full border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200"
            title="Duplicar elemento (Ctrl+C / Ctrl+V)"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            Duplicar
          </button>
        )}
        <button
          type="button"
          onClick={onRemoveFromPlan}
          disabled={busyMesa || (isTable && mesa?.cuentaActivaId)}
          className="btn btn-sm w-full border-gray-300 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
        >
          Quitar del plano
        </button>
        {isTable && mesa && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Eliminar Mesa ${mesa.numero || '?'} permanentemente? Esto la borra de la base de datos.`)) {
                onDeleteMesa?.()
              }
            }}
            disabled={busyMesa || !!mesa.cuentaActivaId}
            className="btn btn-sm w-full border-0 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50"
          >
            <TrashIcon className="h-4 w-4" />
            Eliminar mesa de BD
          </button>
        )}
      </div>
    </div>
  )
}
