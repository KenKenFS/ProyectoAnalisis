import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  Squares2X2Icon,
  PencilSquareIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline'
import TableElement from './TableElement'
import DecorationElement from './DecorationElement'
import LabelElement from './LabelElement'
import WallElement from './WallElement'
import FloorElement from './FloorElement'
import { FloorTextureDefs } from './FloorTextures'
import {
  isPolygonElement,
  isStructureDecoration,
  pointsToSvgAttr,
  computeElementsBounds,
  computeUnionBoundsFromElements,
  findElementsInRect,
  getElementBBox,
  getPolygonEdgeHandles,
  normalizeRectFromPoints,
  offsetPolygonEdge,
} from './polygonUtils'
import {
  CANVAS_ZOOM_MIN_FACTOR as MIN_ZOOM,
  CANVAS_ZOOM_MAX_FACTOR as MAX_ZOOM,
  CANVAS_ZOOM_MESERO_MIN_FACTOR as MESERO_MIN_ZOOM,
  CANVAS_ZOOM_STEP as ZOOM_STEP,
  FIT_PADDING_DEFAULT,
  DEFAULT_SECTION_CANVAS_WIDTH,
  DEFAULT_SECTION_CANVAS_HEIGHT,
  clampViewportToCanvas,
  viewportAtZoomCentered,
  viewportFromContentBounds,
} from './canvasConfig'
const MIN_SIZE = 6
const SNAP_GRID = 8

function snap(value, enabled) {
  if (!enabled) return value
  return Math.round(value / SNAP_GRID) * SNAP_GRID
}

const HANDLE_LIST_FULL = [
  { key: 'tl', cursor: 'nwse-resize' },
  { key: 'tm', cursor: 'ns-resize' },
  { key: 'tr', cursor: 'nesw-resize' },
  { key: 'mr', cursor: 'ew-resize' },
  { key: 'br', cursor: 'nwse-resize' },
  { key: 'bm', cursor: 'ns-resize' },
  { key: 'bl', cursor: 'nesw-resize' },
  { key: 'ml', cursor: 'ew-resize' },
]

const HANDLE_LIST_MIDS = [
  { key: 'tm', cursor: 'ns-resize' },
  { key: 'mr', cursor: 'ew-resize' },
  { key: 'bm', cursor: 'ns-resize' },
  { key: 'ml', cursor: 'ew-resize' },
]

function getHandlesForElement(element) {
  if (!element) return []
  if (isPolygonElement(element)) return []
  if (element.type === 'table' || element.type === 'floor') return HANDLE_LIST_FULL
  return HANDLE_LIST_MIDS
}

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return dark
}

function handlePositions(element) {
  const x = Number(element.x || 0)
  const y = Number(element.y || 0)
  const w = Number(element.width || 80)
  const h = Number(element.height || 80)
  return {
    tl: { x: x - w / 2, y: y - h / 2 },
    tm: { x, y: y - h / 2 },
    tr: { x: x + w / 2, y: y - h / 2 },
    mr: { x: x + w / 2, y },
    br: { x: x + w / 2, y: y + h / 2 },
    bm: { x, y: y + h / 2 },
    bl: { x: x - w / 2, y: y + h / 2 },
    ml: { x: x - w / 2, y },
  }
}

function computeResize(handle, startRect, mouseSvgPt) {
  let left = startRect.x - startRect.width / 2
  let right = startRect.x + startRect.width / 2
  let top = startRect.y - startRect.height / 2
  let bottom = startRect.y + startRect.height / 2

  if (handle.includes('l') && handle !== 'tm' && handle !== 'bm') left = mouseSvgPt.x
  if (handle.includes('r') && handle !== 'tm' && handle !== 'bm') right = mouseSvgPt.x
  if (handle.includes('t') && handle !== 'ml' && handle !== 'mr') top = mouseSvgPt.y
  if (handle.includes('b') && handle !== 'ml' && handle !== 'mr') bottom = mouseSvgPt.y

  if (right - left < MIN_SIZE) {
    if (handle.includes('l') && handle !== 'tm' && handle !== 'bm') left = right - MIN_SIZE
    else right = left + MIN_SIZE
  }
  if (bottom - top < MIN_SIZE) {
    if (handle.includes('t') && handle !== 'ml' && handle !== 'mr') top = bottom - MIN_SIZE
    else bottom = top + MIN_SIZE
  }

  return {
    width: right - left,
    height: bottom - top,
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  }
}

function findAttrFromEvent(target, attr) {
  let node = target
  while (node && node !== document.body) {
    if (node.dataset && node.dataset[attr]) return node.dataset[attr]
    node = node.parentNode
  }
  return null
}

/**
 * Canvas SVG del plano (read-only o editable).
 *
 * Lectura: canvasWidth/Height, elements, sections, mesasById, selectedId, onSelectElement, onBackgroundClick
 * Edición: editable, onElementMove, onElementMoveEnd, onElementResize, onElementDoubleClick, onCanvasDrop
 */
export default function FloorPlanCanvas({
  canvasWidth = DEFAULT_SECTION_CANVAS_WIDTH,
  canvasHeight = DEFAULT_SECTION_CANVAS_HEIGHT,
  sections = [],
  elements = [],
  mesasById = {},
  selectedId = null,
  selectedIds = null,
  onSelectElement,
  onSelectionChange,
  onBackgroundClick,
  editable = false,
  onElementMove,
  onMultiElementMove,
  onElementMoveEnd,
  onElementResize,
  onElementDoubleClick,
  onCanvasDrop,
  drawingMode = null,
  onAreaDrawn,
  vertexEditElementId = null,
  onVertexAdd,
  onStartVertexEdit,
  onPolygonVertexMove,
  onPrepareUndo,
  selectedVertexIndex = null,
  onVertexSelect,
  hideHints = false,
  /** 'canvas' = todo el área; 'content' = encuadra mesas y estructuras (vista mesero). */
  initialFit = 'canvas',
  fitPadding = FIT_PADDING_DEFAULT,
  fitMaxZoom = MAX_ZOOM,
  /** < 1 acerca más el encuadre inicial (p. ej. 0.88 en tablet). */
  fitTightness = 1,
  className = '',
}) {
  const dark = useDarkMode()
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: canvasWidth, height: canvasHeight })
  const panStateRef = useRef(null)
  const dragStateRef = useRef(null)
  const resizeStateRef = useRef(null)
  const drawStateRef = useRef(null)
  const polygonVertexDragRef = useRef(null)
  const polygonEdgeDragRef = useRef(null)
  const marqueeSelectRef = useRef(null)
  const multiDragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const capturePointerIdRef = useRef(null)
  const [drawPreview, setDrawPreview] = useState(null)
  const [marqueePreview, setMarqueePreview] = useState(null)
  const [interactionCursor, setInteractionCursor] = useState('default')
  const [isDragOver, setIsDragOver] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const containerSizeRef = useRef(containerSize)
  containerSizeRef.current = containerSize
  const initialFitDoneRef = useRef(false)
  const fitToContentRef = useRef(() => {})

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const viewMinZoom = editable ? MIN_ZOOM : MESERO_MIN_ZOOM
  const lockViewport = !editable

  const constrainViewport = useCallback(
    (vp) => {
      if (!lockViewport) return vp
      return clampViewportToCanvas(vp, {
        canvasWidth,
        canvasHeight,
        minZoomFactor: viewMinZoom,
        maxZoomFactor: fitMaxZoom,
      })
    },
    [lockViewport, canvasWidth, canvasHeight, viewMinZoom, fitMaxZoom]
  )

  const fitToContent = useCallback(() => {
    const currentElements = elementsRef.current
    const { width: containerWidth, height: containerHeight } = containerSizeRef.current
    if (initialFit === 'content') {
      const bounds = computeElementsBounds(currentElements)
      const cx = bounds ? (bounds.minX + bounds.maxX) / 2 : canvasWidth / 2
      const cy = bounds ? (bounds.minY + bounds.maxY) / 2 : canvasHeight / 2

      if (lockViewport) {
        setViewport(
          viewportAtZoomCentered(cx, cy, {
            canvasWidth,
            canvasHeight,
            containerWidth,
            containerHeight,
            zoomFactor: viewMinZoom,
            maxZoomFactor: fitMaxZoom,
          })
        )
        return
      }

      if (bounds && bounds.width > 0 && bounds.height > 0) {
        setViewport(
          viewportFromContentBounds(bounds, {
            canvasWidth,
            canvasHeight,
            containerWidth,
            containerHeight,
            padding: fitPadding,
            maxZoomFactor: fitMaxZoom,
            tightness: fitTightness,
          })
        )
        return
      }
    }
    const full = { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
    setViewport(lockViewport ? constrainViewport(full) : full)
  }, [
    initialFit,
    canvasWidth,
    canvasHeight,
    fitPadding,
    fitMaxZoom,
    fitTightness,
    lockViewport,
    viewMinZoom,
    constrainViewport,
  ])

  fitToContentRef.current = fitToContent

  useEffect(() => {
    if (initialFitDoneRef.current) return
    if (containerSize.width < 8 || containerSize.height < 8) return
    initialFitDoneRef.current = true
    fitToContentRef.current()
  }, [containerSize.width, containerSize.height])

  const zoomFactor = useMemo(() => canvasWidth / viewport.width, [canvasWidth, viewport.width])

  const applyZoom = useCallback(
    (delta, focal) => {
      setViewport((prev) => {
        const nextWidth = Math.min(
          canvasWidth / viewMinZoom,
          Math.max(canvasWidth / fitMaxZoom, prev.width * (1 - delta))
        )
        const ratio = nextWidth / prev.width
        const nextHeight = prev.height * ratio
        const fx = focal?.x ?? prev.x + prev.width / 2
        const fy = focal?.y ?? prev.y + prev.height / 2
        const nextX = fx - (fx - prev.x) * ratio
        const nextY = fy - (fy - prev.y) * ratio
        return constrainViewport({
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
        })
      })
    },
    [canvasWidth, viewMinZoom, fitMaxZoom, constrainViewport]
  )

  const svgPointFromEvent = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    return pt.matrixTransform(ctm.inverse())
  }, [])

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()
      const focal = svgPointFromEvent(e)
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      applyZoom(delta, focal)
    },
    [applyZoom, svgPointFromEvent]
  )

  useEffect(() => {
    const node = svgRef.current
    if (!node) return undefined
    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function releaseCapturedPointer() {
    const node = svgRef.current
    const pointerId = capturePointerIdRef.current
    if (node && pointerId != null) {
      try {
        node.releasePointerCapture(pointerId)
      } catch {
        /* ya liberado */
      }
    }
    capturePointerIdRef.current = null
  }

  function capturePointer(e) {
    const node = svgRef.current
    if (!node || e.pointerId == null) return
    try {
      node.setPointerCapture(e.pointerId)
      capturePointerIdRef.current = e.pointerId
    } catch {
      /* ignore */
    }
  }

  function isActivePointer(e) {
    if (capturePointerIdRef.current == null) return true
    return e.pointerId === capturePointerIdRef.current
  }

  const effectiveSelectedIds = useMemo(() => {
    if (Array.isArray(selectedIds) && selectedIds.length > 0) return selectedIds
    if (selectedId) return [selectedId]
    return []
  }, [selectedIds, selectedId])

  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds])

  const isElementSelected = useCallback((id) => selectedIdSet.has(id), [selectedIdSet])

  const multiSelectionActive = editable && effectiveSelectedIds.length > 1

  const multiSelectionBounds = useMemo(() => {
    if (!multiSelectionActive) return null
    return computeUnionBoundsFromElements(elements, effectiveSelectedIds)
  }, [multiSelectionActive, elements, effectiveSelectedIds])

  const selectedElement = useMemo(() => {
    if (multiSelectionActive) return null
    const primary = effectiveSelectedIds[0] || selectedId
    return primary ? elements.find((el) => el.id === primary) : null
  }, [elements, selectedId, effectiveSelectedIds, multiSelectionActive])

  const applySelection = useCallback(
    (ids) => {
      const list = Array.isArray(ids) ? [...ids] : []
      if (typeof onSelectionChange === 'function') {
        onSelectionChange(list)
        return
      }
      if (typeof onSelectElement === 'function' && list.length === 1) {
        const el = elements.find((item) => item.id === list[0])
        if (el) onSelectElement(el, el.tableId ? mesasById[el.tableId] : null)
      } else if (list.length === 0 && typeof onBackgroundClick === 'function') {
        onBackgroundClick()
      }
    },
    [onSelectionChange, onSelectElement, onBackgroundClick, elements, mesasById]
  )

  const startMultiDrag = useCallback(
    (e, ids) => {
      const idList = ids || effectiveSelectedIds
      if (!idList.length) return
      const items = idList
        .map((id) => {
          const el = elements.find((item) => item.id === id)
          if (!el) return null
          return {
            id,
            startX: Number(el.x || 0),
            startY: Number(el.y || 0),
            startPoints: isPolygonElement(el) ? el.points.map((p) => ({ x: p.x, y: p.y })) : null,
            isPolygon: isPolygonElement(el),
          }
        })
        .filter(Boolean)
      if (!items.length) return
      if (typeof onPrepareUndo === 'function') onPrepareUndo()
      multiDragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        items,
        moved: false,
      }
      setInteractionCursor('grabbing')
      capturePointer(e)
      e.preventDefault()
    },
    [effectiveSelectedIds, elements, onPrepareUndo]
  )

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return

    const isBackground = e.target === e.currentTarget || e.target.dataset?.bg === 'true'

    if (editable && (e.ctrlKey || e.metaKey) && e.button === 0 && !vertexEditElementId && drawingMode !== 'floor') {
      const pt = svgPointFromEvent(e)
      if (!pt) return
      const toggleId = findAttrFromEvent(e.target, 'elementId')
      marqueeSelectRef.current = {
        startX: pt.x,
        startY: pt.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        lastRect: null,
        active: false,
        pendingToggleId: toggleId,
      }
      setMarqueePreview(null)
      setInteractionCursor('crosshair')
      capturePointer(e)
      e.preventDefault()
      return
    }

    if (findAttrFromEvent(e.target, 'multiMoveHandle')) {
      startMultiDrag(e, effectiveSelectedIds)
      return
    }

    const wantsPan = e.shiftKey || e.button === 1 || e.button === 2

    if (wantsPan) {
      panStateRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewport: { ...viewport },
        isBackground,
      }
      setInteractionCursor('grabbing')
      capturePointer(e)
      e.preventDefault()
      return
    }

    if (editable && vertexEditElementId && isBackground) {
      e.preventDefault()
      return
    }

    if (editable && drawingMode === 'floor') {
      if (findAttrFromEvent(e.target, 'polygonEditTrigger')) {
        e.preventDefault()
        return
      }
      const pt = svgPointFromEvent(e)
      if (!pt) return
      const useSnap = snapEnabled && !e.altKey
      const startX = snap(pt.x, useSnap)
      const startY = snap(pt.y, useSnap)
      if (typeof onPrepareUndo === 'function') onPrepareUndo()
      drawStateRef.current = { startX, startY, useSnap }
      setDrawPreview({ x: startX, y: startY, width: 0, height: 0 })
      setInteractionCursor('crosshair')
      capturePointer(e)
      e.preventDefault()
      return
    }

    if (findAttrFromEvent(e.target, 'polygonEditTrigger')) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (editable && !vertexEditElementId) {
      const edgeIndexRaw = findAttrFromEvent(e.target, 'polygonEdge')
      if (edgeIndexRaw != null && selectedId) {
        const element = elements.find((el) => el.id === selectedId)
        if (element && isPolygonElement(element)) {
          const edgeIndex = Number(edgeIndexRaw)
          const handles = getPolygonEdgeHandles(element.points)
          const handle = handles.find((h) => h.edgeIndex === edgeIndex)
          if (handle) {
            const pt = svgPointFromEvent(e)
            const useSnap = snapEnabled && !e.altKey
            polygonEdgeDragRef.current = {
              elementId: selectedId,
              edgeIndex,
              perpX: handle.perpX,
              perpY: handle.perpY,
              startPoints: element.points.map((p) => ({ x: p.x, y: p.y })),
              startMouse: pt
                ? { x: snap(pt.x, useSnap), y: snap(pt.y, useSnap) }
                : { x: 0, y: 0 },
              moved: false,
              undoPrepared: false,
            }
            setInteractionCursor(handle.cursor)
            capturePointer(e)
            e.preventDefault()
            return
          }
        }
      }
    }

    if (editable && vertexEditElementId) {
      const vertexIndexRaw = findAttrFromEvent(e.target, 'polygonVertex')
      if (vertexIndexRaw != null) {
        const element = elements.find((el) => el.id === vertexEditElementId)
        if (element && isPolygonElement(element)) {
          const vertexIndex = Number(vertexIndexRaw)
          polygonVertexDragRef.current = {
            elementId: vertexEditElementId,
            vertexIndex,
            startPoints: element.points.map((p) => ({ x: p.x, y: p.y })),
            moved: false,
            undoPrepared: false,
          }
          setInteractionCursor('grabbing')
          capturePointer(e)
          e.preventDefault()
          return
        }
      }
      const blockedId = findAttrFromEvent(e.target, 'elementId')
      if (blockedId) {
        e.preventDefault()
        return
      }
    }

    if (editable) {
      const vertexIndexRaw = findAttrFromEvent(e.target, 'polygonVertex')
      if (vertexIndexRaw != null && selectedId) {
        const element = elements.find((el) => el.id === selectedId)
        if (element && isPolygonElement(element)) {
          const vertexIndex = Number(vertexIndexRaw)
          polygonVertexDragRef.current = {
            elementId: selectedId,
            vertexIndex,
            startPoints: element.points.map((p) => ({ x: p.x, y: p.y })),
            moved: false,
            undoPrepared: false,
          }
          setInteractionCursor('grabbing')
          capturePointer(e)
          e.preventDefault()
          return
        }
      }

      const handleKey = findAttrFromEvent(e.target, 'resizeHandle')
      if (handleKey && selectedId) {
        const element = elements.find((el) => el.id === selectedId)
        if (!element) return
        resizeStateRef.current = {
          handle: handleKey,
          elementId: selectedId,
          start: {
            x: Number(element.x || 0),
            y: Number(element.y || 0),
            width: Number(element.width || 80),
            height: Number(element.height || 80),
          },
          moved: false,
          undoPrepared: false,
        }
        setInteractionCursor('grabbing')
        capturePointer(e)
        e.preventDefault()
        return
      }
      const elementId = findAttrFromEvent(e.target, 'elementId')
      if (elementId) {
        const element = elements.find((el) => el.id === elementId)
        if (!element) return

        if (multiSelectionActive && selectedIdSet.has(elementId)) {
          startMultiDrag(e, effectiveSelectedIds)
          return
        }

        dragStateRef.current = {
          elementId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startX: Number(element.x || 0),
          startY: Number(element.y || 0),
          startPoints: isPolygonElement(element)
            ? element.points.map((p) => ({ x: p.x, y: p.y }))
            : null,
          isPolygon: isPolygonElement(element),
          moved: false,
          undoPrepared: false,
        }
        setInteractionCursor('grabbing')
        applySelection([elementId])
        capturePointer(e)
        e.preventDefault()
        return
      }
    }

    const isTouchLike = e.pointerType === 'touch' || e.pointerType === 'pen'
    if (!editable && (isTouchLike || e.button === 0)) {
      const elementId = findAttrFromEvent(e.target, 'elementId')
      const element = elementId ? elements.find((el) => el.id === elementId) : null
      panStateRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewport: { ...viewport },
        isBackground: !elementId,
        pendingElement: element || null,
        readOnlyTap: true,
      }
      setInteractionCursor('grab')
      capturePointer(e)
      e.preventDefault()
      return
    }

    if (!isBackground) return

    if (editable && !vertexEditElementId && drawingMode !== 'floor' && !e.ctrlKey && !e.metaKey) {
      applySelection([])
      setInteractionCursor('default')
      e.preventDefault()
      return
    }

    panStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startViewport: { ...viewport },
      isBackground,
    }
    setInteractionCursor('grabbing')
    capturePointer(e)
    e.preventDefault()
  }

  const handlePointerMove = useCallback(
    (e) => {
      if (!isActivePointer(e)) return

      const svg = svgRef.current
      if (!svg) return
      const ctm = svg.getScreenCTM()
      if (!ctm) return

      if (
        panStateRef.current ||
        dragStateRef.current ||
        resizeStateRef.current ||
        drawStateRef.current ||
        polygonVertexDragRef.current ||
        polygonEdgeDragRef.current ||
        marqueeSelectRef.current ||
        multiDragRef.current
      ) {
        e.preventDefault()
      }

      const marqueeState = marqueeSelectRef.current
      if (marqueeState) {
        if (!marqueeState.active) {
          const moved =
            Math.abs(e.clientX - marqueeState.startClientX) > 4 ||
            Math.abs(e.clientY - marqueeState.startClientY) > 4
          if (moved) {
            marqueeState.active = true
            marqueeState.pendingToggleId = null
          } else {
            return
          }
        }
        const pt = svgPointFromEvent(e)
        if (!pt) return
        const rect = normalizeRectFromPoints(marqueeState.startX, marqueeState.startY, pt.x, pt.y)
        marqueeState.lastRect = rect
        setMarqueePreview(rect)
        return
      }

      const multiDrag = multiDragRef.current
      if (multiDrag) {
        const dx = (e.clientX - multiDrag.startClientX) / ctm.a
        const dy = (e.clientY - multiDrag.startClientY) / ctm.d
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) multiDrag.moved = true
        const useSnap = snapEnabled && !e.altKey
        const moves = multiDrag.items.map((item) => {
          if (item.isPolygon && item.startPoints) {
            const points = item.startPoints.map((p) => ({
              x: snap(p.x + dx, useSnap),
              y: snap(p.y + dy, useSnap),
            }))
            const cx = snap(item.startX + dx, useSnap)
            const cy = snap(item.startY + dy, useSnap)
            return { id: item.id, x: cx, y: cy, points }
          }
          return {
            id: item.id,
            x: snap(item.startX + dx, useSnap),
            y: snap(item.startY + dy, useSnap),
          }
        })
        if (typeof onMultiElementMove === 'function') {
          onMultiElementMove(moves)
        } else if (typeof onElementMove === 'function') {
          for (const m of moves) {
            onElementMove(m.id, m.x, m.y, m.points ? { points: m.points } : undefined)
          }
        }
        return
      }

      const drawState = drawStateRef.current
      if (drawState) {
        const pt = svgPointFromEvent(e)
        if (!pt) return
        const useSnap = drawState.useSnap && !e.altKey
        const ex = snap(pt.x, useSnap)
        const ey = snap(pt.y, useSnap)
        const rect = {
          x: Math.min(drawState.startX, ex),
          y: Math.min(drawState.startY, ey),
          width: Math.abs(ex - drawState.startX),
          height: Math.abs(ey - drawState.startY),
        }
        drawState.lastRect = rect
        setDrawPreview(rect)
        return
      }

      const resizeState = resizeStateRef.current
      if (resizeState) {
        const mouseSvg = svgPointFromEvent(e)
        if (!mouseSvg) return
        const snappedMouse = {
          x: snap(mouseSvg.x, snapEnabled && !e.altKey),
          y: snap(mouseSvg.y, snapEnabled && !e.altKey),
        }
        if (!resizeState.undoPrepared) {
          resizeState.moved = true
          resizeState.undoPrepared = true
          if (typeof onPrepareUndo === 'function') onPrepareUndo()
        }
        const next = computeResize(resizeState.handle, resizeState.start, snappedMouse)
        if (typeof onElementResize === 'function') {
          onElementResize(resizeState.elementId, next)
        }
        return
      }

      const edgeDrag = polygonEdgeDragRef.current
      if (edgeDrag) {
        const mouseSvg = svgPointFromEvent(e)
        if (!mouseSvg) return
        const useSnap = snapEnabled && !e.altKey
        const mx = snap(mouseSvg.x, useSnap)
        const my = snap(mouseSvg.y, useSnap)
        if (!edgeDrag.undoPrepared) {
          edgeDrag.moved = true
          edgeDrag.undoPrepared = true
          if (typeof onPrepareUndo === 'function') onPrepareUndo()
        }
        const offset =
          (mx - edgeDrag.startMouse.x) * edgeDrag.perpX +
          (my - edgeDrag.startMouse.y) * edgeDrag.perpY
        const nextPoints = offsetPolygonEdge(
          edgeDrag.startPoints,
          edgeDrag.edgeIndex,
          offset,
          edgeDrag.perpX,
          edgeDrag.perpY
        )
        if (typeof onPolygonVertexMove === 'function') {
          onPolygonVertexMove(edgeDrag.elementId, nextPoints)
        }
        return
      }

      const vertexDrag = polygonVertexDragRef.current
      if (vertexDrag) {
        const mouseSvg = svgPointFromEvent(e)
        if (!mouseSvg) return
        const snapped = {
          x: snap(mouseSvg.x, snapEnabled && !e.altKey),
          y: snap(mouseSvg.y, snapEnabled && !e.altKey),
        }
        if (!vertexDrag.undoPrepared) {
          vertexDrag.moved = true
          vertexDrag.undoPrepared = true
          if (typeof onPrepareUndo === 'function') onPrepareUndo()
        }
        const nextPoints = vertexDrag.startPoints.map((p, i) =>
          i === vertexDrag.vertexIndex ? { x: snapped.x, y: snapped.y } : { ...p }
        )
        if (typeof onPolygonVertexMove === 'function') {
          onPolygonVertexMove(vertexDrag.elementId, nextPoints)
        }
        return
      }

      const dragState = dragStateRef.current
      if (dragState) {
        const dx = (e.clientX - dragState.startClientX) / ctm.a
        const dy = (e.clientY - dragState.startClientY) / ctm.d
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          if (!dragState.undoPrepared) {
            dragState.moved = true
            dragState.undoPrepared = true
            if (typeof onPrepareUndo === 'function') onPrepareUndo()
          }
        }
        const useSnap = snapEnabled && !e.altKey
        const nextX = snap(dragState.startX + dx, useSnap)
        const nextY = snap(dragState.startY + dy, useSnap)
        if (dragState.isPolygon && dragState.startPoints) {
          const nextPoints = dragState.startPoints.map((p) => ({
            x: snap(p.x + dx, useSnap),
            y: snap(p.y + dy, useSnap),
          }))
          if (typeof onElementMove === 'function') {
            onElementMove(dragState.elementId, nextX, nextY, { points: nextPoints })
          }
        } else if (typeof onElementMove === 'function') {
          onElementMove(dragState.elementId, nextX, nextY)
        }
        return
      }

      const panState = panStateRef.current
      if (panState) {
        const dx = (e.clientX - panState.startClientX) / ctm.a
        const dy = (e.clientY - panState.startClientY) / ctm.d
        if (
          panState.readOnlyTap &&
          (Math.abs(e.clientX - panState.startClientX) > 4 ||
            Math.abs(e.clientY - panState.startClientY) > 4)
        ) {
          panState.didPan = true
          setInteractionCursor('grabbing')
        }
        setViewport(
          constrainViewport({
            x: panState.startViewport.x - dx,
            y: panState.startViewport.y - dy,
            width: panState.startViewport.width,
            height: panState.startViewport.height,
          })
        )
      }
    },
    [
      onElementMove,
      onMultiElementMove,
      onElementResize,
      onPolygonVertexMove,
      onPrepareUndo,
      svgPointFromEvent,
      snapEnabled,
      constrainViewport,
    ]
  )

  const endInteraction = useCallback(
    (e) => {
      if (!isActivePointer(e)) return

      if (marqueeSelectRef.current) {
        const marquee = marqueeSelectRef.current
        marqueeSelectRef.current = null
        setMarqueePreview(null)
        setInteractionCursor('default')
        releaseCapturedPointer()
        if (marquee.active && marquee.lastRect && marquee.lastRect.width >= 6 && marquee.lastRect.height >= 6) {
          const hitIds = findElementsInRect(elements, marquee.lastRect)
          const next = e.ctrlKey || e.metaKey
            ? [...new Set([...effectiveSelectedIds, ...hitIds])]
            : hitIds
          applySelection(next)
          suppressClickRef.current = true
        } else if (marquee.pendingToggleId) {
          const id = marquee.pendingToggleId
          const next = new Set(effectiveSelectedIds)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          applySelection([...next])
          suppressClickRef.current = true
        }
        return
      }

      if (multiDragRef.current) {
        multiDragRef.current = null
        setInteractionCursor('default')
        releaseCapturedPointer()
        return
      }

      if (drawStateRef.current) {
        const rect = drawStateRef.current.lastRect
        drawStateRef.current = null
        setDrawPreview(null)
        setInteractionCursor('default')
        releaseCapturedPointer()
        if (rect && rect.width >= 24 && rect.height >= 24 && typeof onAreaDrawn === 'function') {
          onAreaDrawn(rect)
        }
        return
      }
      if (polygonEdgeDragRef.current) {
        polygonEdgeDragRef.current = null
        setInteractionCursor('default')
        releaseCapturedPointer()
        return
      }
      if (polygonVertexDragRef.current) {
        const vDrag = polygonVertexDragRef.current
        polygonVertexDragRef.current = null
        setInteractionCursor('default')
        releaseCapturedPointer()
        if (!vDrag.moved && typeof onVertexSelect === 'function') {
          onVertexSelect(vDrag.elementId, vDrag.vertexIndex)
        }
        return
      }
      if (resizeStateRef.current) {
        resizeStateRef.current = null
        setInteractionCursor('default')
        releaseCapturedPointer()
        return
      }
      const dragState = dragStateRef.current
      if (dragState) {
        const svg = svgRef.current
        const ctm = svg?.getScreenCTM()
        if (ctm && typeof onElementMoveEnd === 'function') {
          const dx = (e.clientX - dragState.startClientX) / ctm.a
          const dy = (e.clientY - dragState.startClientY) / ctm.d
          onElementMoveEnd(dragState.elementId, dragState.startX + dx, dragState.startY + dy)
        }
        dragStateRef.current = null
        setInteractionCursor('default')
        releaseCapturedPointer()
        return
      }
      const panState = panStateRef.current
      panStateRef.current = null
      setInteractionCursor('default')
      releaseCapturedPointer()
      if (!panState) return
      const moved =
        panState.didPan ||
        Math.abs(e.clientX - panState.startClientX) > 4 ||
        Math.abs(e.clientY - panState.startClientY) > 4
      if (panState.readOnlyTap) {
        if (!moved) {
          if (panState.pendingElement && typeof onSelectElement === 'function') {
            onSelectElement(
              panState.pendingElement,
              panState.pendingElement.tableId ? mesasById[panState.pendingElement.tableId] : null
            )
          } else if (panState.isBackground && typeof onBackgroundClick === 'function') {
            onBackgroundClick()
          }
        }
        return
      }
      if (panState.isBackground && !moved && typeof onBackgroundClick === 'function') {
        onBackgroundClick()
      }
    },
    [
      onBackgroundClick,
      onElementMoveEnd,
      onAreaDrawn,
      onVertexSelect,
      onSelectElement,
      onSelectionChange,
      onMultiElementMove,
      onElementMove,
      mesasById,
      elements,
      effectiveSelectedIds,
      applySelection,
    ]
  )

  function handleSvgClick(e) {
    if (!editable || !vertexEditElementId) return
    if (findAttrFromEvent(e.target, 'polygonVertex') != null) return
    if (findAttrFromEvent(e.target, 'polygonEditTrigger')) return
    if (findAttrFromEvent(e.target, 'resizeHandle')) return
    const pt = svgPointFromEvent(e)
    if (!pt || typeof onVertexAdd !== 'function') return
    const useSnap = snapEnabled && !e.altKey
    onVertexAdd(vertexEditElementId, {
      x: snap(pt.x, useSnap),
      y: snap(pt.y, useSnap),
    })
  }

  function handleDoubleClick(e) {
    if (!editable) return
    const elementId = findAttrFromEvent(e.target, 'elementId')
    if (!elementId) return
    const element = elements.find((el) => el.id === elementId)
    if (element && typeof onElementDoubleClick === 'function') {
      onElementDoubleClick(element)
    }
  }

  function handleDragOver(e) {
    if (!editable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) setIsDragOver(true)
  }

  function handleDragLeave(e) {
    if (!editable) return
    const related = e.relatedTarget
    if (related && containerRef.current && containerRef.current.contains(related)) return
    setIsDragOver(false)
  }

  function handleDrop(e) {
    if (!editable) return
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData('application/x-floorplan-element')
    if (!raw) return
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      return
    }
    const svgPt = svgPointFromEvent(e)
    if (!svgPt) return
    const useSnap = snapEnabled && !e.altKey
    if (typeof onCanvasDrop === 'function') {
      onCanvasDrop(payload, {
        x: snap(svgPt.x, useSnap),
        y: snap(svgPt.y, useSnap),
      })
    }
  }

  const polygonEdgeHandles = useMemo(() => {
    if (!selectedElement || !isPolygonElement(selectedElement)) return []
    if (vertexEditElementId === selectedElement.id) return []
    return getPolygonEdgeHandles(selectedElement.points)
  }, [selectedElement, vertexEditElementId])

  const floors = useMemo(() => elements.filter((el) => el.type === 'floor'), [elements])
  const walls = useMemo(() => elements.filter((el) => el.type === 'wall'), [elements])
  const topLayer = useMemo(
    () => elements.filter((el) => el.type !== 'floor' && el.type !== 'wall'),
    [elements]
  )

  const vertexEditLocked = Boolean(vertexEditElementId)
  const floorDrawLocked = drawingMode === 'floor'
  const placementLocked = vertexEditLocked || floorDrawLocked

  const cursorStyle =
    (drawingMode === 'floor' || vertexEditElementId) && interactionCursor === 'default'
      ? 'crosshair'
      : interactionCursor === 'default'
      ? 'default'
      : interactionCursor

  const handleSize = Math.max(10, 14 / zoomFactor)

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border bg-white dark:bg-zinc-950 ${className}`}
      style={{
        borderColor: isDragOver ? '#00C2FF' : dark ? '#27272a' : '#e5e7eb',
        boxShadow: isDragOver ? '0 0 0 2px rgba(0,194,255,0.35)' : undefined,
        height: '100%',
        minHeight: 420,
        touchAction: 'none',
        transition: 'border-color 120ms, box-shadow 120ms',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onClick={handleSvgClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          background: dark ? '#1e1e2e' : '#f8fafc',
          touchAction: 'none',
          userSelect: 'none',
          cursor: cursorStyle,
        }}
      >
        <defs>
          <FloorTextureDefs dark={dark} />
        </defs>

        <rect
          data-bg="true"
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={dark ? '#1a1a26' : '#f1f5f9'}
        />

        {(editable || lockViewport) && (
          <rect
            data-bg="true"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            rx={editable ? 12 : 0}
            ry={editable ? 12 : 0}
            fill="none"
            stroke={
              lockViewport && !editable
                ? dark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(15,23,42,0.14)'
                : dark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(15,23,42,0.08)'
            }
            strokeWidth={lockViewport && !editable ? 2 : 1.5}
            strokeDasharray={editable ? '6 8' : undefined}
            pointerEvents="none"
          />
        )}

        {floors.map((element) => (
          <FloorElement
            key={element.id}
            element={element}
            dark={dark}
            selected={isElementSelected(element.id)}
            disableInteraction={placementLocked}
            onSelect={
              editable && !placementLocked
                ? (el) => {
                    if (typeof onSelectElement === 'function') onSelectElement(el, null)
                  }
                : undefined
            }
          />
        ))}

        {walls.map((element) => (
          <WallElement
            key={element.id}
            element={element}
            dark={dark}
            selected={isElementSelected(element.id)}
            disableInteraction={placementLocked}
            onSelect={
              editable && !placementLocked
                ? (el) => {
                    if (typeof onSelectElement === 'function') onSelectElement(el, null)
                  }
                : undefined
            }
          />
        ))}

        {topLayer
          .filter((el) => el.type !== 'table')
          .map((element) => {
            if (element.type === 'decoration') {
              return (
                <DecorationElement
                  key={element.id}
                  element={element}
                  dark={dark}
                  selected={isElementSelected(element.id)}
                  disableInteraction={placementLocked}
                  onSelect={
                    editable && !placementLocked
                      ? (el) => {
                          if (typeof onSelectElement === 'function') onSelectElement(el, null)
                        }
                      : undefined
                  }
                />
              )
            }
            if (element.type === 'label') {
              return (
                <LabelElement
                  key={element.id}
                  element={element}
                  dark={dark}
                  selected={isElementSelected(element.id)}
                  disableInteraction={placementLocked}
                  onSelect={
                    editable && !placementLocked
                      ? (el) => {
                          if (typeof onSelectElement === 'function') onSelectElement(el, null)
                        }
                      : undefined
                  }
                />
              )
            }
            return null
          })}

        {topLayer
          .filter((el) => el.type === 'table')
          .map((element) => {
            const mesa = element.tableId ? mesasById[element.tableId] : null
            return (
              <TableElement
                key={element.id}
                element={element}
                mesa={mesa}
                dark={dark}
                selected={isElementSelected(element.id)}
                disableInteraction={placementLocked}
                onSelect={
                  editable && !placementLocked
                    ? (el, m) => {
                        if (typeof onSelectElement === 'function') onSelectElement(el, m)
                      }
                    : undefined
                }
              />
            )
          })}

        {placementLocked && (
          <rect
            data-bg="true"
            data-placement-capture="true"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="transparent"
            pointerEvents="all"
          />
        )}

        {drawPreview && (
          <rect
            x={drawPreview.x}
            y={drawPreview.y}
            width={drawPreview.width}
            height={drawPreview.height}
            fill="rgba(0,194,255,0.15)"
            stroke="#00C2FF"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        )}

        {marqueePreview && (
          <rect
            x={marqueePreview.x}
            y={marqueePreview.y}
            width={marqueePreview.width}
            height={marqueePreview.height}
            fill="rgba(0,194,255,0.12)"
            stroke="#00C2FF"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        )}

        {multiSelectionActive && multiSelectionBounds && multiSelectionBounds.width > 0 && (
          <g pointerEvents="visible">
            <rect
              x={multiSelectionBounds.minX}
              y={multiSelectionBounds.minY}
              width={multiSelectionBounds.width}
              height={multiSelectionBounds.height}
              fill="rgba(0,194,255,0.06)"
              stroke="#00C2FF"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              pointerEvents="none"
            />
            <g
              transform={`translate(${multiSelectionBounds.x}, ${multiSelectionBounds.y})`}
              data-multi-move-handle="true"
              style={{ cursor: 'grab' }}
            >
              <circle
                r={Math.max(14, handleSize * 1.15)}
                fill={dark ? '#18181b' : '#ffffff'}
                stroke="#00C2FF"
                strokeWidth={Math.max(1.5, 2 / zoomFactor)}
              />
              <foreignObject
                x={-Math.max(14, handleSize * 1.15)}
                y={-Math.max(14, handleSize * 1.15)}
                width={Math.max(28, handleSize * 2.3)}
                height={Math.max(28, handleSize * 2.3)}
                pointerEvents="none"
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0891b2',
                  }}
                >
                  <HandRaisedIcon
                    style={{
                      width: Math.max(16, handleSize * 1.2),
                      height: Math.max(16, handleSize * 1.2),
                    }}
                  />
                </div>
              </foreignObject>
            </g>
          </g>
        )}

        {editable && selectedElement && isPolygonElement(selectedElement) && (
          <g pointerEvents="visible">
            <polygon
              points={pointsToSvgAttr(selectedElement.points)}
              fill="none"
              stroke="#00C2FF"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              pointerEvents="none"
            />
            {vertexEditElementId === selectedElement.id
              ? selectedElement.points.map((p, i) => {
                  const isActive =
                    selectedVertexIndex != null && Number(selectedVertexIndex) === i
                  return (
                    <circle
                      key={`sv_${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? handleSize * 0.65 : handleSize / 2}
                      fill={isActive ? '#00C2FF' : dark ? '#0F1923' : '#ffffff'}
                      stroke="#00C2FF"
                      strokeWidth={Math.max(1.2, 2 / zoomFactor)}
                      data-polygon-vertex={String(i)}
                      style={{ cursor: isActive ? 'pointer' : 'grab' }}
                    />
                  )
                })
              : polygonEdgeHandles.map((edge) => (
                  <rect
                    key={`pe_${edge.edgeIndex}`}
                    x={edge.x - handleSize / 2}
                    y={edge.y - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={2}
                    fill={dark ? '#0F1923' : '#ffffff'}
                    stroke="#00C2FF"
                    strokeWidth={Math.max(1.2, 2 / zoomFactor)}
                    data-polygon-edge={String(edge.edgeIndex)}
                    style={{ cursor: edge.cursor }}
                  />
                ))}
          </g>
        )}

        {editable &&
          selectedElement &&
          isStructureDecoration(selectedElement) &&
          (() => {
            const bbox = getElementBBox(selectedElement)
            const active = vertexEditElementId === selectedElement.id
            const btnSize = Math.max(22, handleSize * 1.6)
            const offset = Math.max(36, 32 / zoomFactor)
            return (
              <g
                transform={`translate(${bbox.maxX + offset}, ${bbox.minY - offset})`}
                data-polygon-edit-trigger="true"
                style={{ cursor: 'pointer' }}
                onMouseDown={(ev) => {
                  ev.stopPropagation()
                  ev.preventDefault()
                  if (typeof onStartVertexEdit === 'function') {
                    onStartVertexEdit(selectedElement.id)
                  }
                }}
              >
                <circle
                  r={btnSize / 2}
                  fill={active ? '#00C2FF' : dark ? '#18181b' : '#ffffff'}
                  stroke="#00C2FF"
                  strokeWidth={Math.max(1.5, 2 / zoomFactor)}
                />
                <foreignObject
                  x={-btnSize / 2}
                  y={-btnSize / 2}
                  width={btnSize}
                  height={btnSize}
                  pointerEvents="none"
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: active ? '#fff' : '#0891b2',
                    }}
                  >
                    <PencilSquareIcon style={{ width: btnSize * 0.55, height: btnSize * 0.55 }} />
                  </div>
                </foreignObject>
              </g>
            )
          })()}

        {editable &&
          !multiSelectionActive &&
          selectedElement &&
          selectedElement.type !== 'label' &&
          !isPolygonElement(selectedElement) &&
          (() => {
          const positions = handlePositions(selectedElement)
          const w = Number(selectedElement.width || 80)
          const h = Number(selectedElement.height || 80)
          const handles = getHandlesForElement(selectedElement)
          const showOutline = true
          return (
            <g pointerEvents="visible">
              {showOutline && (
                <rect
                  x={selectedElement.x - w / 2}
                  y={selectedElement.y - h / 2}
                  width={w}
                  height={h}
                  fill="none"
                  stroke="#00C2FF"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  pointerEvents="none"
                />
              )}
              {handles.map((h2) => {
                const pos = positions[h2.key]
                return (
                  <rect
                    key={h2.key}
                    x={pos.x - handleSize / 2}
                    y={pos.y - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={2}
                    fill={dark ? '#0F1923' : '#ffffff'}
                    stroke="#00C2FF"
                    strokeWidth={Math.max(1.2, 2 / zoomFactor)}
                    data-resize-handle={h2.key}
                    style={{ cursor: h2.cursor }}
                  />
                )
              })}
            </g>
          )
        })()}
      </svg>

      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2">
        {editable && (
          <button
            type="button"
            onClick={() => setSnapEnabled((v) => !v)}
            className={`pointer-events-auto inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold shadow-md transition ${
              snapEnabled
                ? 'border-cyan-500 bg-cyan-600 text-white'
                : 'border-gray-200 bg-white/95 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300'
            }`}
            title={`Snap al grid de ${SNAP_GRID}px (mantén Alt para desactivar temporalmente)`}
          >
            <Squares2X2Icon className="h-4 w-4" />
            Snap {SNAP_GRID}px
          </button>
        )}
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-white/95 px-2 py-1 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <button
            type="button"
            onClick={() => applyZoom(-ZOOM_STEP)}
            className="btn btn-xs btn-ghost"
            disabled={lockViewport && zoomFactor <= MESERO_MIN_ZOOM + 0.02}
            title={lockViewport ? 'Alejar (mín. 130%)' : 'Alejar'}
          >
            <MagnifyingGlassMinusIcon className="h-4 w-4" />
          </button>
          <div className="min-w-[44px] text-center text-xs font-semibold tabular-nums text-gray-700 dark:text-zinc-300">
            {Math.round(zoomFactor * 100)}%
          </div>
          <button
            type="button"
            onClick={() => applyZoom(ZOOM_STEP)}
            className="btn btn-xs btn-ghost"
            title="Acercar"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={fitToContent}
            className="btn btn-xs btn-ghost"
            title={initialFit === 'content' ? 'Reencuadrar plano' : 'Ajustar todo'}
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hideHints && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[13.5rem] rounded-lg border border-gray-200/90 bg-white/95 px-2.5 py-2 text-[10px] leading-snug text-gray-600 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-md dark:shadow-black/50 dark:ring-1 dark:ring-white/10">
          {editable ? (
            vertexEditLocked ? (
              <>
                <p className="mb-1 font-semibold text-gray-800 dark:text-zinc-100">Vértices</p>
                <ul className="list-none space-y-0.5 text-gray-600 dark:text-zinc-300">
                  <li>Clic en plano — nuevo punto</li>
                  <li>Supr — borrar vértice</li>
                  <li>Ctrl+Z — deshacer</li>
                  <li>Esc — salir</li>
                </ul>
              </>
            ) : floorDrawLocked ? (
              <>
                <p className="mb-1 font-semibold text-gray-800 dark:text-zinc-100">Dibujar piso</p>
                <ul className="list-none space-y-0.5 text-gray-600 dark:text-zinc-300">
                  <li>Arrastra en el plano</li>
                  <li>Esc — cancelar</li>
                </ul>
              </>
            ) : (
              <>
                <p className="mb-1 font-semibold text-gray-800 dark:text-zinc-100">Editor</p>
                <ul className="list-none space-y-0.5 text-gray-600 dark:text-zinc-300">
                  <li>Ctrl + arrastrar — selección múltiple</li>
                  <li>Ctrl + clic — añadir o quitar</li>
                  <li>Icono central — mover grupo</li>
                  <li>Flechas — 1 px (Ctrl: 5 px)</li>
                  <li>Ctrl+Z — deshacer</li>
                </ul>
              </>
            )
          ) : (
            <ul className="list-none space-y-0.5 text-gray-600 dark:text-zinc-300">
              <li>Arrastra — mover plano</li>
              <li>Toca mesa — tomar pedido</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
