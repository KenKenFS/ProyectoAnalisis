import { DECORATION_META } from './decorationTypes'

/**
 * Utilidades para elementos estructurales con forma polígono.
 * Coordenadas absolutas en el espacio SVG del canvas.
 */

export function computeCentroid(points) {
  const list = Array.isArray(points) ? points : []
  if (list.length === 0) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const p of list) {
    sx += Number(p.x || 0)
    sy += Number(p.y || 0)
  }
  return { x: sx / list.length, y: sy / list.length }
}

export function computeBBox(points) {
  const list = Array.isArray(points) ? points : []
  if (list.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of list) {
    const x = Number(p.x || 0)
    const y = Number(p.y || 0)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function pointsToSvgAttr(points) {
  return (points || []).map((p) => `${Number(p.x || 0)},${Number(p.y || 0)}`).join(' ')
}

export function translatePoints(points, dx, dy) {
  return (points || []).map((p) => ({
    x: Number(p.x || 0) + dx,
    y: Number(p.y || 0) + dy,
  }))
}

export function isPolygonElement(element) {
  return (
    element?.type === 'decoration' &&
    element?.shape === 'polygon' &&
    Array.isArray(element.points) &&
    element.points.length >= 3
  )
}

export function distance(a, b) {
  return Math.hypot(Number(a.x || 0) - Number(b.x || 0), Number(a.y || 0) - Number(b.y || 0))
}

export function isStructureDecoration(element) {
  if (element?.type !== 'decoration') return false
  const meta = DECORATION_META[element.decorationType]
  return meta?.kind === 'structure'
}

/** Rectángulo colocado (centro + tamaño) → 4 esquinas en sentido horario. */
export function rectToPoints(element) {
  const cx = Number(element.x || 0)
  const cy = Number(element.y || 0)
  const hw = Number(element.width || 80) / 2
  const hh = Number(element.height || 80) / 2
  return [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh },
    { x: cx - hw, y: cy + hh },
  ]
}

function projectOnSegment(p, a, b) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 < 1e-6) return { ...a }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + t * abx, y: a.y + t * aby }
}

/** Inserta un vértice en el borde más cercano al punto clicado. */
export function insertVertexOnClosestEdge(points, clickPt) {
  const list = (points || []).map((p) => ({ x: Number(p.x || 0), y: Number(p.y || 0) }))
  if (list.length < 2) return [...list, { x: clickPt.x, y: clickPt.y }]
  let bestIdx = 0
  let bestProj = list[0]
  let bestDist = Infinity
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    const b = list[(i + 1) % list.length]
    const proj = projectOnSegment(clickPt, a, b)
    const d = distance(clickPt, proj)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
      bestProj = proj
    }
  }
  const next = [...list]
  next.splice(bestIdx + 1, 0, {
    x: Math.round(bestProj.x * 10) / 10,
    y: Math.round(bestProj.y * 10) / 10,
  })
  return next
}

/** Elimina un vértice; requiere al menos 3 puntos restantes. */
export function removeVertexAtIndex(points, index) {
  const list = (points || []).map((p) => ({ x: Number(p.x || 0), y: Number(p.y || 0) }))
  if (list.length <= 3) return list
  const i = Number(index)
  if (i < 0 || i >= list.length) return list
  return list.filter((_, idx) => idx !== i)
}

/** Intersección del polígono con una horizontal y = constante (par de segmentos). */
export function horizontalSpanAtY(points, y) {
  const list = (points || []).map((p) => ({
    x: Number(p.x || 0),
    y: Number(p.y || 0),
  }))
  const xs = []
  const n = list.length
  if (n < 3) return null

  for (let i = 0; i < n; i++) {
    const a = list[i]
    const b = list[(i + 1) % n]
    if (Math.abs(a.y - b.y) < 1e-4) {
      if (Math.abs(a.y - y) < 1e-3) {
        xs.push(a.x, b.x)
      }
      continue
    }
    const yMin = Math.min(a.y, b.y)
    const yMax = Math.max(a.y, b.y)
    if (y < yMin - 1e-3 || y > yMax + 1e-3) continue
    const t = (y - a.y) / (b.y - a.y)
    xs.push(a.x + t * (b.x - a.x))
  }

  if (xs.length < 2) return null
  xs.sort((p, q) => p - q)

  let bestW = 0
  let bestMin = xs[0]
  let bestMax = xs[1]
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const minX = xs[i]
    const maxX = xs[i + 1]
    const w = maxX - minX
    if (w > bestW) {
      bestW = w
      bestMin = minX
      bestMax = maxX
    }
  }

  if (bestW < 12) return null
  return {
    minX: bestMin,
    maxX: bestMax,
    width: bestW,
    centerX: (bestMin + bestMax) / 2,
  }
}

/** Franja inferior del nombre dentro del polígono (evita salirse en formas en L). */
export function computePolygonLabelPlacement(points, stripHeight) {
  const bbox = computeBBox(points)
  const h = Math.max(16, stripHeight)
  const yProbe = bbox.maxY - h * 0.55
  const span = horizontalSpanAtY(points, yProbe)
  const pad = 6

  if (span) {
    return {
      x: span.minX + pad,
      y: bbox.maxY - h,
      width: Math.max(36, span.width - pad * 2),
      height: h,
    }
  }

  return {
    x: bbox.minX + pad,
    y: bbox.maxY - h,
    width: Math.max(36, bbox.width - pad * 2),
    height: h,
  }
}

function normalizePoints(points) {
  return (points || []).map((p) => ({ x: Number(p.x || 0), y: Number(p.y || 0) }))
}

function distanceToSegment(pt, a, b) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 < 1e-6) return distance(pt, a)
  let t = ((pt.x - a.x) * abx + (pt.y - a.y) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  return distance(pt, { x: a.x + t * abx, y: a.y + t * aby })
}

/** Punto dentro del polígono (ray casting). */
export function pointInPolygon(pt, points) {
  const list = normalizePoints(points)
  if (list.length < 3) return false
  let inside = false
  for (let i = 0, j = list.length - 1; i < list.length; j = i++) {
    const xi = list[i].x
    const yi = list[i].y
    const xj = list[j].x
    const yj = list[j].y
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Distancia mínima desde un punto al borde del polígono. */
export function minDistanceToPolygonEdges(pt, points) {
  const list = normalizePoints(points)
  let minD = Infinity
  for (let i = 0; i < list.length; i++) {
    minD = Math.min(minD, distanceToSegment(pt, list[i], list[(i + 1) % list.length]))
  }
  return minD
}

/** Polígono no convexo (p. ej. forma en L). */
export function isConcavePolygon(points) {
  const list = normalizePoints(points)
  if (list.length < 4) return false
  let sign = 0
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    const b = list[(i + 1) % list.length]
    const c = list[(i + 2) % list.length]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-6) continue
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (sign !== s) return true
  }
  return false
}

/**
 * Punto más “profundo” dentro del polígono (evita el hueco de una L).
 * Muestrea la grilla del bbox y elige el de mayor distancia al borde.
 */
export function computePolygonInteriorAnchor(points) {
  const list = normalizePoints(points)
  const bbox = computeBBox(list)
  if (list.length < 3) {
    return { x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 }
  }

  const centroid = computeCentroid(list)
  const concave = isConcavePolygon(list)

  if (!concave && pointInPolygon(centroid, list)) {
    return centroid
  }

  const cols = Math.min(28, Math.max(12, Math.ceil(bbox.width / 22)))
  const rows = Math.min(28, Math.max(12, Math.ceil(bbox.height / 22)))
  const dx = bbox.width / cols
  const dy = bbox.height / rows

  let best = { x: centroid.x, y: centroid.y, score: -1 }
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const pt = { x: bbox.minX + col * dx, y: bbox.minY + row * dy }
      if (!pointInPolygon(pt, list)) continue
      const score = minDistanceToPolygonEdges(pt, list)
      if (score > best.score) {
        best = { x: pt.x, y: pt.y, score }
      }
    }
  }

  if (best.score >= 0) return { x: best.x, y: best.y }
  if (pointInPolygon(centroid, list)) return centroid
  return { x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 }
}

/**
 * Cuadrado de adornos centrado en el interior sólido del polígono.
 * En formas cóncavas reduce tamaño según distancia al borde.
 */
export function computeInteriorSquareLayout(points, paddingRatio = 0.2) {
  const list = normalizePoints(points)
  const anchor = computePolygonInteriorAnchor(list)
  const bbox = computeBBox(list)
  const concave = isConcavePolygon(list)
  const inset = minDistanceToPolygonEdges(anchor, list)
  const bboxCap = Math.min(bbox.width, bbox.height) * (concave ? 0.62 : 0.84)
  const insetCap = inset * 2 * (1 - paddingRatio)
  const side = Math.max(44, Math.min(bboxCap, insetCap))

  return {
    cx: anchor.x,
    cy: anchor.y,
    side,
    concave,
  }
}

/** @deprecated Usar computeInteriorSquareLayout */
export function computeInscribedSquareSize(points, paddingRatio = 0.14) {
  return computeInteriorSquareLayout(points, paddingRatio).side
}

/** Handles en el punto medio de cada arista (ajuste perpendicular al segmento). */
export function getPolygonEdgeHandles(points) {
  const list = normalizePoints(points)
  const n = list.length
  if (n < 3) return []

  const handles = []
  for (let i = 0; i < n; i++) {
    const a = list[i]
    const b = list[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-3) continue
    const perpX = -dy / len
    const perpY = dx / len
    const mostlyHorizontal = Math.abs(dx) >= Math.abs(dy)
    handles.push({
      edgeIndex: i,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      perpX,
      perpY,
      cursor: mostlyHorizontal ? 'ns-resize' : 'ew-resize',
    })
  }
  return handles
}

export function offsetPolygonEdge(points, edgeIndex, offset, perpX, perpY) {
  const list = normalizePoints(points)
  const n = list.length
  if (n < 3 || edgeIndex < 0 || edgeIndex >= n) return list
  const i0 = edgeIndex
  const i1 = (edgeIndex + 1) % n
  const ox = offset * perpX
  const oy = offset * perpY
  return list.map((p, idx) =>
    idx === i0 || idx === i1 ? { x: p.x + ox, y: p.y + oy } : { ...p }
  )
}

export function getElementBBox(element) {
  if (isPolygonElement(element)) return computeBBox(element.points)
  const cx = Number(element.x || 0)
  const cy = Number(element.y || 0)
  const hw = Number(element.width || 80) / 2
  const hh = Number(element.height || 80) / 2
  return {
    minX: cx - hw,
    minY: cy - hh,
    maxX: cx + hw,
    maxY: cy + hh,
    width: hw * 2,
    height: hh * 2,
  }
}

export function normalizeRectFromPoints(x1, y1, x2, y2) {
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  const maxX = Math.max(x1, x2)
  const maxY = Math.max(y1, y2)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  }
}

export function rectsIntersect(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)
}

/** Marquesina: elementos que intersectan el rect (incluye pisos). */
export function findElementsInRect(elements, rect, { excludeTypes = [] } = {}) {
  const skip = new Set(excludeTypes)
  const list = Array.isArray(elements) ? elements : []
  const hits = []
  for (const el of list) {
    if (skip.has(el.type)) continue
    const b = getElementBBox(el)
    if (rectsIntersect(rect, b)) hits.push(el.id)
  }
  return hits
}

export function computeUnionBoundsFromElements(elements, ids) {
  const idSet = new Set(ids || [])
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of elements || []) {
    if (!idSet.has(el.id)) continue
    const b = getElementBBox(el)
    minX = Math.min(minX, b.minX)
    minY = Math.min(minY, b.minY)
    maxX = Math.max(maxX, b.maxX)
    maxY = Math.max(maxY, b.maxY)
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
}

/** Unión de bboxes de elementos (por defecto sin pisos, que suelen cubrir todo el canvas). */
export function computeElementsBounds(elements, { includeFloors = false } = {}) {
  const list = (Array.isArray(elements) ? elements : []).filter(
    (el) => includeFloors || el.type !== 'floor'
  )
  if (list.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of list) {
    const b = getElementBBox(el)
    minX = Math.min(minX, b.minX)
    minY = Math.min(minY, b.minY)
    maxX = Math.max(maxX, b.maxX)
    maxY = Math.max(maxY, b.maxY)
  }
  if (!Number.isFinite(minX)) return null
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
