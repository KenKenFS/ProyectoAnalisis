import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaintBrushIcon } from '@heroicons/react/24/outline'
import { useFloorPlan } from '../../hooks/useFloorPlan'
import FloorPlanCanvas from './FloorPlanCanvas'
import { getDefaultSizeForSeats } from './seatLayout'

const MAP_VIEW_HEIGHT = 'clamp(520px, 78vh, 920px)'

const FALLBACK_COLS = 4
const FALLBACK_GAP = 60
const FALLBACK_PADDING = 80
const FALLBACK_CANVAS_WIDTH = 1400
const FALLBACK_CANVAS_HEIGHT = 900

function newId() {
  return `tmp_${Math.random().toString(36).slice(2, 9)}`
}

function buildFallbackSection(mesas) {
  const list = Array.isArray(mesas) ? mesas : []
  if (list.length === 0) {
    return {
      id: 'fallback',
      name: 'Plano',
      color: '#bbf7d0',
      canvasWidth: FALLBACK_CANVAS_WIDTH,
      canvasHeight: FALLBACK_CANVAS_HEIGHT,
      elements: [],
    }
  }
  const sorted = [...list].sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0))
  const cellSize = 140
  const cols = FALLBACK_COLS
  const rows = Math.ceil(sorted.length / cols)
  const canvasWidth = Math.max(
    FALLBACK_CANVAS_WIDTH,
    cols * (cellSize + FALLBACK_GAP) + FALLBACK_PADDING * 2
  )
  const canvasHeight = Math.max(
    FALLBACK_CANVAS_HEIGHT,
    rows * (cellSize + FALLBACK_GAP) + FALLBACK_PADDING * 2
  )
  const elements = sorted.map((mesa, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const size = getDefaultSizeForSeats(mesa.capacidad || 4, 'square')
    return {
      id: `fb_${mesa.id}`,
      type: 'table',
      shape: 'square',
      x: FALLBACK_PADDING + col * (cellSize + FALLBACK_GAP) + cellSize / 2,
      y: FALLBACK_PADDING + row * (cellSize + FALLBACK_GAP) + cellSize / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
      seats: Number(mesa.capacidad || 4),
      tableId: mesa.id,
      label: mesa.numero != null ? `Mesa ${mesa.numero}` : 'Mesa',
    }
  })
  return {
    id: 'fallback',
    name: 'Plano (auto)',
    color: '#bbf7d0',
    canvasWidth,
    canvasHeight,
    elements,
  }
}

function countTablesInSection(section) {
  if (!section?.elements) return 0
  return section.elements.filter((el) => el.type === 'table').length
}

/**
 * Mapa interactivo del salón en modo mesero (read-only).
 */
export default function MesasMapView({
  mesas = [],
  totalMesasCount = 0,
  showEditPlano = false,
  selectedMesaId = null,
  onSelectMesa,
  className = '',
}) {
  const { plan, loading } = useFloorPlan()
  const mesasById = useMemo(() => {
    const map = {}
    for (const m of mesas || []) map[m.id] = m
    return map
  }, [mesas])

  const sections = useMemo(() => {
    if (plan && Array.isArray(plan.sections) && plan.sections.length > 0 && plan.sections[0]?.elements != null) {
      return plan.sections
    }
    return [buildFallbackSection(mesas)]
  }, [plan, mesas])

  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (sections.length === 0) {
      setActiveId(null)
      return
    }
    if (!activeId || !sections.find((s) => s.id === activeId)) {
      setActiveId(plan?.activeSectionId && sections.find((s) => s.id === plan.activeSectionId)
        ? plan.activeSectionId
        : sections[0].id)
    }
  }, [sections, activeId, plan?.activeSectionId])

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeId) || sections[0] || null,
    [sections, activeId]
  )

  const mesasEnSeccion = useMemo(() => countTablesInSection(activeSection), [activeSection])

  const usingFallback = activeSection?.id === 'fallback'

  const selectedElementId = useMemo(() => {
    if (!selectedMesaId || !activeSection) return null
    const match = (activeSection.elements || []).find(
      (el) => el.type === 'table' && el.tableId === selectedMesaId
    )
    return match?.id || null
  }, [activeSection, selectedMesaId])

  const totalMesas = totalMesasCount > 0 ? totalMesasCount : mesas.length

  function handleSelect(element, mesa) {
    if (element?.type !== 'table') return
    const resolved = mesa || (element.tableId ? mesasById[element.tableId] : null)
    if (resolved && typeof onSelectMesa === 'function') onSelectMesa(resolved)
  }

  function handleBackground() {
    if (typeof onSelectMesa === 'function') onSelectMesa(null)
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 ${className}`}
        style={{ height: MAP_VIEW_HEIGHT }}
      >
        Cargando plano...
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`} style={{ height: MAP_VIEW_HEIGHT }}>
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => {
            const isActive = s.id === activeSection?.id
            const count = countTablesInSection(s)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveId(s.id)
                  if (typeof onSelectMesa === 'function') onSelectMesa(null)
                }}
                className={`inline-flex min-h-[48px] items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-600 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-cyan-400 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-cyan-500/50'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color || '#cbd5e1' }}
                  aria-hidden
                />
                {s.name || 'Sección'}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="relative min-h-0 flex-1 touch-none">
        {activeSection ? (
          <>
            <FloorPlanCanvas
              key={activeSection.id}
              canvasWidth={activeSection.canvasWidth}
              canvasHeight={activeSection.canvasHeight}
              elements={activeSection.elements || []}
              mesasById={mesasById}
              selectedId={selectedElementId}
              onSelectElement={handleSelect}
              onBackgroundClick={handleBackground}
              initialFit="content"
              hideHints
            />

            <div
              className="pointer-events-none absolute left-2 top-2 z-10 rounded-md border border-gray-200/90 bg-white/95 px-2 py-1 text-[10px] leading-tight text-gray-600 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-md dark:shadow-black/50 dark:ring-1 dark:ring-white/10"
              title="Arrastra para mover el plano · Toca una mesa para ordenar"
            >
              <span className="tabular-nums">
                <span className="font-semibold text-gray-900 dark:text-white">{totalMesas}</span>
                <span className="text-gray-500 dark:text-zinc-400"> total</span>
                <span className="mx-1.5 text-gray-300 dark:text-zinc-500" aria-hidden>
                  ·
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">{mesasEnSeccion}</span>
                <span className="text-gray-500 dark:text-zinc-400"> sección</span>
              </span>
            </div>

            {showEditPlano && (
              <Link
                to="/mesero/plano"
                className="pointer-events-auto absolute right-3 top-3 z-10 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-700 active:scale-[0.98]"
                title="Editar plano del restaurante"
              >
                <PaintBrushIcon className="h-5 w-5 shrink-0" aria-hidden />
                Editar plano
              </Link>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Sin secciones disponibles.
          </div>
        )}
      </div>

      {usingFallback && (
        <div className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200">
          Plano aún no diseñado: se muestran las mesas en una cuadrícula automática. Un administrador puede acomodarlas desde el editor.
        </div>
      )}
    </div>
  )
}
