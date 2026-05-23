import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@shared/firebase/AuthContext'
import {
  createMesa as createMesaFirestore,
  updateMesa as updateMesaFirestore,
  deleteMesa as deleteMesaFirestore,
} from '@shared/firebase/firestore'
import { useFloorPlanDraft } from '../hooks/useFloorPlanDraft'
import { useTableStatus } from '../hooks/useTableStatus'
import FloorPlanCanvas from '../components/floorplan/FloorPlanCanvas'
import SectionsPanel from '../components/floorplan/SectionsPanel'
import ElementsPanel from '../components/floorplan/ElementsPanel'
import ElementDetailsPanel from '../components/floorplan/ElementDetailsPanel'
import { getDefaultSizeForSeats } from '../components/floorplan/seatLayout'
import { DECORATION_META } from '../components/floorplan/decorationTypes'
import {
  computeBBox,
  computeCentroid,
  insertVertexOnClosestEdge,
  isPolygonElement,
  rectToPoints,
  removeVertexAtIndex,
} from '../components/floorplan/polygonUtils'

function nextElementId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function clampToCanvas({ x, y, width, height, canvasWidth, canvasHeight, margin = 0 }) {
  return {
    x: Math.max(margin + width / 2, Math.min(canvasWidth - margin - width / 2, x)),
    y: Math.max(margin + height / 2, Math.min(canvasHeight - margin - height / 2, y)),
  }
}

function nextMesaNumero(mesas) {
  if (!Array.isArray(mesas) || mesas.length === 0) return 1
  const max = mesas.reduce((acc, m) => Math.max(acc, Number(m.numero || 0)), 0)
  return max + 1
}

export default function FloorPlanEditor() {
  const navigate = useNavigate()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const draft = useFloorPlanDraft({ userUid: user?.uid || null })
  const { mesas, loading: loadingMesas } = useTableStatus()

  const [selectedIds, setSelectedIds] = useState([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const [localError, setLocalError] = useState('')
  const [busyMesa, setBusyMesa] = useState(false)
  const [drawingFloorTexture, setDrawingFloorTexture] = useState(null)
  const [vertexEditElementId, setVertexEditElementId] = useState(null)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState(null)
  const [clipboard, setClipboard] = useState(null)

  const pushUndo = () => draft.pushUndoSnapshot()

  const mesasById = useMemo(() => {
    const map = {}
    for (const m of mesas || []) map[m.id] = m
    return map
  }, [mesas])

  const activeSection = draft.activeSection
  const activeElements = activeSection?.elements || []

  const placedTableIds = useMemo(() => {
    const set = new Set()
    for (const s of draft.draft.sections || []) {
      for (const el of s.elements || []) {
        if (el.type === 'table' && el.tableId) set.add(el.tableId)
      }
    }
    return set
  }, [draft.draft.sections])

  const mesasSinColocar = useMemo(
    () => (mesas || []).filter((m) => !placedTableIds.has(m.id)),
    [mesas, placedTableIds]
  )

  const selectedElement = useMemo(
    () => activeElements.find((el) => el.id === selectedId) || null,
    [activeElements, selectedId]
  )

  const selectedMesa =
    selectedElement?.type === 'table' && selectedElement.tableId
      ? mesasById[selectedElement.tableId]
      : null

  useEffect(() => {
    setSelectedIds([])
    setDrawingFloorTexture(null)
    setVertexEditElementId(null)
    setSelectedVertexIndex(null)
  }, [draft.activeSectionId])

  function duplicateElement(source) {
    if (!source || !activeSection) return
    if (source.type === 'table') return
    pushUndo()

    if (source.shape === 'polygon' && source.points?.length >= 3) {
      const points = source.points.map((p) => ({
        x: Number(p.x || 0) + 20,
        y: Number(p.y || 0) + 20,
      }))
      const centroid = computeCentroid(points)
      const bbox = computeBBox(points)
      const copy = {
        ...source,
        id: nextElementId(),
        shape: 'polygon',
        points,
        x: centroid.x,
        y: centroid.y,
        width: Math.max(40, bbox.width),
        height: Math.max(40, bbox.height),
      }
      delete copy.tableId
      draft.addElement(copy)
      setSelectedIds([copy.id])
      return
    }

    const w = Number(source.width || 80)
    const h = Number(source.height || 80)
    const clamped = clampToCanvas({
      x: Number(source.x || 0) + 20,
      y: Number(source.y || 0) + 20,
      width: w,
      height: h,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    const copy = {
      ...source,
      id: nextElementId(),
      x: clamped.x,
      y: clamped.y,
    }
    delete copy.tableId
    draft.addElement(copy)
    setSelectedIds([copy.id])
  }

  function handleSelectionChange(ids) {
    setSelectedIds(Array.isArray(ids) ? ids : [])
    setSelectedVertexIndex(null)
  }

  function handleSelect(element) {
    handleSelectionChange(element?.id ? [element.id] : [])
  }

  function handleBackground() {
    handleSelectionChange([])
  }

  function handleMultiElementMove(moves) {
    if (!Array.isArray(moves)) return
    for (const m of moves) {
      handleElementMove(m.id, m.x, m.y, m.points ? { points: m.points } : undefined)
    }
  }

  function handleVertexSelect(elementId, vertexIndex) {
    if (elementId === selectedId) {
      setSelectedVertexIndex(vertexIndex)
    }
  }

  function removeSelectedVertex() {
    if (selectedVertexIndex == null || !selectedId) return
    const el = activeElements.find((item) => item.id === selectedId)
    if (!el || !isPolygonElement(el)) return
    if (el.points.length <= 3) return
    pushUndo()
    const next = removeVertexAtIndex(el.points, selectedVertexIndex)
    const centroid = computeCentroid(next)
    const bbox = computeBBox(next)
    draft.updateElement(selectedId, {
      points: next,
      x: centroid.x,
      y: centroid.y,
      width: Math.max(40, bbox.width),
      height: Math.max(40, bbox.height),
    })
    setSelectedVertexIndex(null)
  }

  useEffect(() => {
    function onKey(e) {
      const target = e.target
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (isInput) return

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase()
        if (k === 'c') {
          if (selectedElement && selectedElement.type !== 'table') {
            e.preventDefault()
            setClipboard(selectedElement)
          }
          return
        }
        if (k === 'v') {
          if (clipboard) {
            e.preventDefault()
            duplicateElement(clipboard)
          }
          return
        }
        if (k === 'z') {
          e.preventDefault()
          if (draft.canUndo) {
            draft.undo()
            setSelectedIds([])
            setSelectedVertexIndex(null)
            setVertexEditElementId(null)
          }
          return
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          selectedVertexIndex != null &&
          selectedId &&
          selectedElement &&
          isPolygonElement(selectedElement)
        ) {
          e.preventDefault()
          removeSelectedVertex()
          return
        }
        if (selectedIds.length > 0) {
          e.preventDefault()
          pushUndo()
          for (const id of selectedIds) {
            draft.removeElement(id)
          }
          setSelectedIds([])
          setSelectedVertexIndex(null)
        }
      } else if (e.key === 'Escape') {
        if (drawingFloorTexture) {
          setDrawingFloorTexture(null)
        } else if (vertexEditElementId) {
          setVertexEditElementId(null)
          setSelectedVertexIndex(null)
        } else {
          setSelectedIds([])
          setSelectedVertexIndex(null)
        }
      } else if (
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight') &&
        selectedIds.length > 0 &&
        selectedVertexIndex == null &&
        !drawingFloorTexture
      ) {
        e.preventDefault()
        const step = e.ctrlKey || e.metaKey ? 5 : 1
        let dx = 0
        let dy = 0
        if (e.key === 'ArrowLeft') dx = -step
        else if (e.key === 'ArrowRight') dx = step
        else if (e.key === 'ArrowUp') dy = -step
        else if (e.key === 'ArrowDown') dy = step
        if (!e.repeat) pushUndo()
        nudgeSelection(dx, dy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    selectedIds,
    selectedElement,
    selectedVertexIndex,
    clipboard,
    drawingFloorTexture,
    vertexEditElementId,
    draft,
    activeSection,
  ])

  function handleElementMove(id, x, y, opts) {
    if (!activeSection) return
    const element = activeElements.find((el) => el.id === id)
    if (!element) return

    if (opts?.points && element.shape === 'polygon') {
      const points = opts.points
      const centroid = computeCentroid(points)
      const bbox = computeBBox(points)
      draft.updateElement(id, {
        x: centroid.x,
        y: centroid.y,
        points,
        width: Math.max(40, bbox.width),
        height: Math.max(40, bbox.height),
      })
      return
    }

    const width = Number(element.width || 80)
    const height = Number(element.height || 80)
    const clamped = clampToCanvas({
      x,
      y,
      width,
      height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    draft.updateElement(id, { x: clamped.x, y: clamped.y })
  }

  function nudgeSelection(dx, dy) {
    if (!selectedIds.length || !activeSection) return
    for (const id of selectedIds) {
      const el = activeElements.find((item) => item.id === id)
      if (!el) continue
      if (isPolygonElement(el) && el.points?.length >= 3) {
        const points = el.points.map((p) => ({
          x: Number(p.x || 0) + dx,
          y: Number(p.y || 0) + dy,
        }))
        handleElementMove(id, Number(el.x || 0) + dx, Number(el.y || 0) + dy, { points })
      } else {
        handleElementMove(id, Number(el.x || 0) + dx, Number(el.y || 0) + dy)
      }
    }
  }

  function handlePolygonVertexMove(id, points) {
    if (!activeSection) return
    const centroid = computeCentroid(points)
    const bbox = computeBBox(points)
    draft.updateElement(id, {
      x: centroid.x,
      y: centroid.y,
      points,
      width: Math.max(40, bbox.width),
      height: Math.max(40, bbox.height),
    })
  }

  function handleElementResize(id, next) {
    if (!activeSection) return
    const clamped = clampToCanvas({
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    draft.updateElement(id, {
      x: clamped.x,
      y: clamped.y,
      width: next.width,
      height: next.height,
    })
  }

  async function placeNewMesaInBD(point) {
    if (!activeSection) return
    setBusyMesa(true)
    setLocalError('')
    try {
      const numero = nextMesaNumero(mesas)
      const capacidad = 4
      const zona = activeSection.name || 'General'
      const newMesaId = await createMesaFirestore({ numero, capacidad, zona })
      const size = getDefaultSizeForSeats(capacidad, 'square')
      const center = point || {
        x: activeSection.canvasWidth / 2,
        y: activeSection.canvasHeight / 2,
      }
      const clamped = clampToCanvas({
        x: center.x,
        y: center.y,
        width: size.width,
        height: size.height,
        canvasWidth: activeSection.canvasWidth,
        canvasHeight: activeSection.canvasHeight,
      })
      const id = nextElementId()
      pushUndo()
      draft.addElement({
        id,
        type: 'table',
        shape: 'square',
        x: clamped.x,
        y: clamped.y,
        width: size.width,
        height: size.height,
        rotation: 0,
        seats: capacidad,
        tableId: newMesaId,
        label: `Mesa ${numero}`,
      })
      setSelectedIds([id])
    } catch (e) {
      setLocalError(e?.message || 'No se pudo crear la mesa.')
    } finally {
      setBusyMesa(false)
    }
  }

  function placeExistingMesa(mesa, point) {
    if (!activeSection || !mesa) return
    const seats = Number(mesa.capacidad || 4)
    const size = getDefaultSizeForSeats(seats, 'square')
    const center = point || {
      x: activeSection.canvasWidth / 2,
      y: activeSection.canvasHeight / 2,
    }
    const clamped = clampToCanvas({
      x: center.x,
      y: center.y,
      width: size.width,
      height: size.height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    const id = nextElementId()
    pushUndo()
    draft.addElement({
      id,
      type: 'table',
      shape: 'square',
      x: clamped.x,
      y: clamped.y,
      width: size.width,
      height: size.height,
      rotation: 0,
      seats,
      tableId: mesa.id,
      label: mesa.numero != null ? `Mesa ${mesa.numero}` : 'Mesa',
    })
    setSelectedIds([id])
  }

  async function placeShape(shape, point) {
    if (!activeSection) return
    setBusyMesa(true)
    setLocalError('')
    try {
      const numero = nextMesaNumero(mesas)
      const capacidad = 4
      const zona = activeSection.name || 'General'
      const newMesaId = await createMesaFirestore({ numero, capacidad, zona })
      const size = getDefaultSizeForSeats(capacidad, shape)
      const center = point || {
        x: activeSection.canvasWidth / 2,
        y: activeSection.canvasHeight / 2,
      }
      const clamped = clampToCanvas({
        x: center.x,
        y: center.y,
        width: size.width,
        height: size.height,
        canvasWidth: activeSection.canvasWidth,
        canvasHeight: activeSection.canvasHeight,
      })
      const id = nextElementId()
      pushUndo()
      draft.addElement({
        id,
        type: 'table',
        shape,
        x: clamped.x,
        y: clamped.y,
        width: size.width,
        height: size.height,
        rotation: 0,
        seats: capacidad,
        tableId: newMesaId,
        label: `Mesa ${numero}`,
      })
      setSelectedIds([id])
    } catch (e) {
      setLocalError(e?.message || 'No se pudo crear la mesa.')
    } finally {
      setBusyMesa(false)
    }
  }

  function placeDecoration(decorationType, point) {
    if (!activeSection) return
    const meta = DECORATION_META[decorationType]
    const width = Number(meta?.defaultSize?.width || 160)
    const height = Number(meta?.defaultSize?.height || 110)
    const center = point || {
      x: activeSection.canvasWidth / 2,
      y: activeSection.canvasHeight / 2,
    }
    const clamped = clampToCanvas({
      x: center.x,
      y: center.y,
      width,
      height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    const defaultFloorTexture = {
      hallway: 'hatch',
      bathroom: 'tile',
      kitchen: 'concrete',
    }[decorationType]
    const id = nextElementId()
    const newEl = {
      id,
      type: 'decoration',
      decorationType,
      shape: 'rect',
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      rotation: 0,
      label: '',
    }
    if (defaultFloorTexture) newEl.floorTexture = defaultFloorTexture
    pushUndo()
    draft.addElement(newEl)
    setSelectedIds([id])
  }

  function startVertexEdit(elementId) {
    if (vertexEditElementId === elementId) {
      setVertexEditElementId(null)
      return
    }
    const el = activeElements.find((item) => item.id === elementId)
    if (!el || el.type !== 'decoration') return
    if (!isPolygonElement(el)) {
      pushUndo()
      const points = rectToPoints(el)
      const centroid = computeCentroid(points)
      const bbox = computeBBox(points)
      draft.updateElement(elementId, {
        shape: 'polygon',
        points,
        x: centroid.x,
        y: centroid.y,
        width: Math.max(40, bbox.width),
        height: Math.max(40, bbox.height),
      })
    }
    setVertexEditElementId(elementId)
    setSelectedIds([elementId])
    setDrawingFloorTexture(null)
  }

  function handleVertexAdd(elementId, pt) {
    const el = activeElements.find((item) => item.id === elementId)
    if (!el) return
    pushUndo()
    const basePoints = isPolygonElement(el) ? el.points : rectToPoints(el)
    const next = insertVertexOnClosestEdge(basePoints, pt)
    const centroid = computeCentroid(next)
    const bbox = computeBBox(next)
    draft.updateElement(elementId, {
      shape: 'polygon',
      points: next,
      x: centroid.x,
      y: centroid.y,
      width: Math.max(40, bbox.width),
      height: Math.max(40, bbox.height),
    })
  }

  function placeWall(orientation, point) {
    if (!activeSection) return
    const isHorizontal = orientation !== 'vertical'
    const width = isHorizontal ? 220 : 16
    const height = isHorizontal ? 16 : 220
    const center = point || {
      x: activeSection.canvasWidth / 2,
      y: activeSection.canvasHeight / 2,
    }
    const clamped = clampToCanvas({
      x: center.x,
      y: center.y,
      width,
      height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    const id = nextElementId()
    pushUndo()
    draft.addElement({
      id,
      type: 'wall',
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      rotation: 0,
      color: '#1d4ed8',
    })
    setSelectedIds([id])
  }

  function placePerimeter() {
    if (!activeSection) return
    const thickness = 16
    const inset = 12
    const cw = activeSection.canvasWidth
    const ch = activeSection.canvasHeight
    const color = '#1d4ed8'
    const walls = [
      {
        id: nextElementId(),
        type: 'wall',
        x: cw / 2,
        y: inset + thickness / 2,
        width: cw - inset * 2,
        height: thickness,
        rotation: 0,
        color,
      },
      {
        id: nextElementId(),
        type: 'wall',
        x: cw / 2,
        y: ch - inset - thickness / 2,
        width: cw - inset * 2,
        height: thickness,
        rotation: 0,
        color,
      },
      {
        id: nextElementId(),
        type: 'wall',
        x: inset + thickness / 2,
        y: ch / 2,
        width: thickness,
        height: ch - inset * 2,
        rotation: 0,
        color,
      },
      {
        id: nextElementId(),
        type: 'wall',
        x: cw - inset - thickness / 2,
        y: ch / 2,
        width: thickness,
        height: ch - inset * 2,
        rotation: 0,
        color,
      },
    ]
    pushUndo()
    walls.forEach((w) => draft.addElement(w))
    setSelectedIds([])
  }

  function handleAreaDrawn(rect) {
    if (!activeSection) return
    const texture = drawingFloorTexture || 'wood'
    const width = Math.max(40, Math.round(rect.width))
    const height = Math.max(40, Math.round(rect.height))
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const clamped = clampToCanvas({
      x: cx,
      y: cy,
      width,
      height,
      canvasWidth: activeSection.canvasWidth,
      canvasHeight: activeSection.canvasHeight,
    })
    const id = nextElementId()
    draft.addElement({
      id,
      type: 'floor',
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      rotation: 0,
      texture,
      opacity: 1,
    })
    setSelectedIds([id])
    setDrawingFloorTexture(null)
  }

  function handleCanvasDrop(payload, point) {
    if (!payload) return
    if (!activeSection) {
      setLocalError('No hay sección activa.')
      return
    }
    if (payload.kind === 'placeMesa') {
      const mesa = mesasById[payload.tableId]
      if (!mesa) {
        setLocalError('Mesa no encontrada.')
        return
      }
      placeExistingMesa(mesa, point)
    } else if (payload.kind === 'shape') {
      placeShape(payload.shape || 'square', point)
    } else if (payload.kind === 'newMesa') {
      placeNewMesaInBD(point)
    } else if (payload.kind === 'decoration') {
      placeDecoration(payload.decorationType, point)
    } else if (payload.kind === 'wall') {
      placeWall(payload.orientation || 'horizontal', point)
    }
  }

  async function syncMesa(patch) {
    if (!selectedMesa || !patch) return
    setBusyMesa(true)
    setLocalError('')
    try {
      await updateMesaFirestore(selectedMesa.id, {
        numero: patch.numero ?? selectedMesa.numero,
        capacidad: patch.capacidad ?? selectedMesa.capacidad,
        zona: patch.zona ?? selectedMesa.zona,
      })
    } catch (e) {
      setLocalError(e?.message || 'No se pudo actualizar la mesa.')
    } finally {
      setBusyMesa(false)
    }
  }

  async function deleteMesaAndElement() {
    if (!selectedMesa || !selectedElement) return
    setBusyMesa(true)
    setLocalError('')
    try {
      await deleteMesaFirestore(selectedMesa.id)
      pushUndo()
      draft.removeElement(selectedElement.id)
      setSelectedIds([])
    } catch (e) {
      setLocalError(e?.message || 'No se pudo eliminar la mesa.')
    } finally {
      setBusyMesa(false)
    }
  }

  if (authLoading) {
    return <div className="p-6 text-sm text-gray-600 dark:text-zinc-400">Cargando sesión...</div>
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        Solo administradores pueden editar el plano del restaurante.
      </div>
    )
  }

  const multiSelected = selectedIds.length > 1
  const showDetails = Boolean(selectedElement) && !multiSelected
  const showMultiPanel = multiSelected

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[560px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={() => {
            if (draft.dirty && !window.confirm('Tienes cambios sin guardar. ¿Salir igual?')) return
            navigate('/mesero')
          }}
          className="btn btn-sm btn-ghost"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <PaintBrushIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <div className="text-base font-bold text-gray-900 dark:text-zinc-100">
              Editor de plano
            </div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-500">
              {activeSection?.name
                ? `Diseñando: ${activeSection.name} · ${(activeSection.elements || []).length} elemento(s)`
                : 'Selecciona o crea una sección'}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {activeSection && (
            <span className="hidden text-xs text-gray-500 dark:text-zinc-500 sm:inline">
              {activeSection.canvasWidth} × {activeSection.canvasHeight} px
            </span>
          )}

          {draft.dirty ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircleIcon className="h-3 w-3" />
              Guardado
            </span>
          )}

          <button
            type="button"
            onClick={draft.resetFromServer}
            disabled={draft.loading || draft.saving}
            className="btn btn-sm btn-ghost"
            title="Descartar cambios"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Recargar
          </button>
          <button
            type="button"
            onClick={draft.save}
            disabled={draft.saving || !draft.dirty}
            className="btn btn-sm border-0 bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-cyan-600/50"
          >
            {draft.saving ? 'Guardando...' : 'Guardar plano'}
          </button>
        </div>
      </div>

      {(draft.error || localError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {draft.error || localError}
        </div>
      )}
      {draft.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200">
          {draft.success}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <div className="min-h-0 lg:max-h-full">
          <SectionsPanel
            sections={draft.draft.sections}
            activeSectionId={draft.activeSectionId}
            onSelect={draft.setActiveSection}
            onAdd={draft.addSection}
            onUpdate={draft.updateSection}
            onRemove={draft.removeSection}
            onCanvasSizeChange={draft.setSectionCanvasSize}
          />
        </div>

        <div className="min-h-0">
          {draft.loading || loadingMesas || !activeSection ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Cargando plano y mesas...
            </div>
          ) : (
            <FloorPlanCanvas
              canvasWidth={activeSection.canvasWidth}
              canvasHeight={activeSection.canvasHeight}
              elements={activeSection.elements}
              mesasById={mesasById}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelectElement={handleSelect}
              onSelectionChange={handleSelectionChange}
              onBackgroundClick={handleBackground}
              editable
              onElementMove={handleElementMove}
              onMultiElementMove={handleMultiElementMove}
              onElementResize={handleElementResize}
              onCanvasDrop={handleCanvasDrop}
              drawingMode={drawingFloorTexture ? 'floor' : null}
              onAreaDrawn={handleAreaDrawn}
              vertexEditElementId={vertexEditElementId}
              onVertexAdd={handleVertexAdd}
              onStartVertexEdit={startVertexEdit}
              onPolygonVertexMove={handlePolygonVertexMove}
              onPrepareUndo={pushUndo}
              selectedVertexIndex={selectedVertexIndex}
              onVertexSelect={handleVertexSelect}
            />
          )}
        </div>

        <div className="min-h-0 lg:max-h-full">
          {showMultiPanel ? (
            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Selección múltiple
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {selectedIds.length} elementos seleccionados
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                Arrastra el icono central o cualquier elemento del grupo. Ctrl+clic/arrastre para
                marquesina (incluye pisos). Mantén Ctrl al soltar para añadir a la selección.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleSelectionChange([])}
                >
                  Deseleccionar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-error btn-outline"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar ${selectedIds.length} elementos del plano?`)) return
                    pushUndo()
                    for (const id of selectedIds) draft.removeElement(id)
                    handleSelectionChange([])
                  }}
                >
                  Eliminar del plano
                </button>
              </div>
            </div>
          ) : showDetails ? (
            <ElementDetailsPanel
              element={selectedElement}
              mesa={selectedMesa}
              sections={draft.draft.sections}
              activeSectionId={draft.activeSectionId}
              busyMesa={busyMesa}
              onUpdate={(patch) => draft.updateElement(selectedElement.id, patch)}
              onUpdateMesa={syncMesa}
              onMoveToSection={(targetId) => {
                pushUndo()
                draft.moveElementToSection(selectedElement.id, targetId)
              }}
              onRemoveFromPlan={() => {
                pushUndo()
                draft.removeElement(selectedElement.id)
                setSelectedIds([])
                setSelectedVertexIndex(null)
              }}
              onDeleteMesa={deleteMesaAndElement}
              onDeselect={() => handleSelectionChange([])}
              onDuplicate={() => duplicateElement(selectedElement)}
            />
          ) : (
            <ElementsPanel
              mesasSinColocar={mesasSinColocar}
              onAddMesa={(mesa) => placeExistingMesa(mesa, null)}
              onAddShape={(shape) => placeShape(shape, null)}
              onAddDecoration={(type) => placeDecoration(type, null)}
              onAddNewMesa={() => placeNewMesaInBD(null)}
              onAddWall={(orientation) => placeWall(orientation, null)}
              onAddPerimeter={placePerimeter}
              busyMesa={busyMesa}
              drawingFloorTexture={drawingFloorTexture}
              onStartDrawFloor={(texture) => {
                setDrawingFloorTexture(texture)
                setVertexEditElementId(null)
                setSelectedIds([])
              }}
              onCancelDrawFloor={() => setDrawingFloorTexture(null)}
            />
          )}
        </div>
      </div>

      {drawingFloorTexture && (
        <div className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-950/40 dark:text-cyan-200">
          Dibujando piso{' '}
          <span className="font-semibold">{drawingFloorTexture}</span>: arrastra en cualquier parte del plano (mesas y
          estructuras no se seleccionan; el piso queda debajo) ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Esc
          </kbd>{' '}
          cancela
        </div>
      )}
      {vertexEditElementId && (
        <div className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-950/40 dark:text-cyan-200">
          Modo vértices: el resto del plano no se selecciona · clic cerca del borde añade punto · clic en vértice +{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Supr
          </kbd>{' '}
          lo borra (mín. 3) ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Ctrl+Z
          </kbd>{' '}
          deshace ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Esc
          </kbd>{' '}
          termina
        </div>
      )}
      {selectedElement && !drawingFloorTexture && !vertexEditElementId && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-200">
          Seleccionado: <span className="font-semibold">{selectedElement.label || selectedElement.type}</span>
          {isPolygonElement(selectedElement) && (
            <>
              {' · '}
              cuadrados en cada lado: arrastra para mover el lado · lápiz: editar vértices
            </>
          )}
          {' · '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Supr
          </kbd>{' '}
          quita elemento ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Ctrl+C
          </kbd>{' '}
          /{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Ctrl+V
          </kbd>{' '}
          duplica ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Ctrl+Z
          </kbd>{' '}
          deshace{draft.canUndo ? '' : ' (sin historial)'} ·{' '}
          <kbd className="rounded border border-cyan-300 bg-white px-1 py-0.5 font-mono text-[10px] text-cyan-800 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-200">
            Esc
          </kbd>{' '}
          deselecciona
        </div>
      )}
    </div>
  )
}
