/** Límites y presets del área dibujable por sección (px). */

export const CANVAS_MIN = 400
export const CANVAS_MAX_WIDTH = 6000
export const CANVAS_MAX_HEIGHT = 4500

/** Tamaño por defecto al crear una sección nueva. */
export const DEFAULT_SECTION_CANVAS_WIDTH = 3200
export const DEFAULT_SECTION_CANVAS_HEIGHT = 1600

export function getDefaultSectionCanvasSize() {
  return clampCanvasSize(DEFAULT_SECTION_CANVAS_WIDTH, DEFAULT_SECTION_CANVAS_HEIGHT)
}

export function clampCanvasSize(width, height) {
  const w = Number(width)
  const h = Number(height)
  return {
    width: Math.min(
      CANVAS_MAX_WIDTH,
      Math.max(
        CANVAS_MIN,
        Math.round(Number.isFinite(w) && w > 0 ? w : DEFAULT_SECTION_CANVAS_WIDTH)
      )
    ),
    height: Math.min(
      CANVAS_MAX_HEIGHT,
      Math.max(
        CANVAS_MIN,
        Math.round(Number.isFinite(h) && h > 0 ? h : DEFAULT_SECTION_CANVAS_HEIGHT)
      )
    ),
  }
}

export function formatCanvasSize(width, height) {
  return `${Math.round(width)} × ${Math.round(height)} px`
}

/** Zoom del canvas: factor 1 = 100%, hasta MAX_ZOOM_FACTOR (p. ej. 5 = 500%). */
export const CANVAS_ZOOM_MIN_FACTOR = 0.3
export const CANVAS_ZOOM_MAX_FACTOR = 5
export const CANVAS_ZOOM_STEP = 0.15
/** Vista mesero: no alejar por debajo de 130%. */
export const CANVAS_ZOOM_MESERO_MIN_FACTOR = 1.3

/**
 * Limita zoom y pan al rectángulo [0, canvasWidth] × [0, canvasHeight].
 */
export function clampViewportToCanvas(
  viewport,
  { canvasWidth, canvasHeight, minZoomFactor, maxZoomFactor = CANVAS_ZOOM_MAX_FACTOR }
) {
  const minZ = Math.max(1, Number(minZoomFactor) || CANVAS_ZOOM_MESERO_MIN_FACTOR)
  const maxZ = Math.max(minZ, Number(maxZoomFactor) || CANVAS_ZOOM_MAX_FACTOR)
  const aspect = viewport.width > 0 ? viewport.width / viewport.height : canvasWidth / canvasHeight

  let width = viewport.width
  let height = viewport.height

  const maxW = canvasWidth / minZ
  const maxH = canvasHeight / minZ
  const minW = canvasWidth / maxZ
  const minH = canvasHeight / maxZ

  const fitMax = Math.min(1, maxW / width, maxH / height)
  if (fitMax < 1) {
    width *= fitMax
    height *= fitMax
  }

  const fitMin = Math.max(1, minW / width, minH / height)
  if (fitMin > 1) {
    width *= fitMin
    height *= fitMin
  }

  if (width > canvasWidth) {
    width = canvasWidth
    height = width / aspect
  }
  if (height > canvasHeight) {
    height = canvasHeight
    width = height * aspect
  }

  let x = viewport.x
  let y = viewport.y
  x = Math.max(0, Math.min(canvasWidth - width, x))
  y = Math.max(0, Math.min(canvasHeight - height, y))

  return { x, y, width, height }
}

/** Padding al encuadrar contenido (px SVG). */
export const FIT_PADDING_MESERO = 32
export const FIT_PADDING_DEFAULT = 56

/**
 * Viewport inicial que encuadra el contenido (mesas, muros, etc.) respetando aspecto del contenedor.
 * @param {object} bounds - de computeElementsBounds
 * @param {object} opts
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function viewportFromContentBounds(
  bounds,
  {
    canvasWidth,
    canvasHeight,
    containerWidth = 0,
    containerHeight = 0,
    padding = FIT_PADDING_DEFAULT,
    maxZoomFactor = CANVAS_ZOOM_MAX_FACTOR,
    minZoomFactor,
    tightness = 1,
  }
) {
  const pad = padding
  const boxW = Math.max(48, bounds.width) + pad * 2
  const boxH = Math.max(48, bounds.height) + pad * 2
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2

  const aspect =
    containerWidth > 8 && containerHeight > 8
      ? containerWidth / containerHeight
      : canvasWidth / canvasHeight

  let viewW
  let viewH
  const boxAspect = boxW / boxH
  if (aspect >= boxAspect) {
    viewH = boxH
    viewW = viewH * aspect
  } else {
    viewW = boxW
    viewH = viewW / aspect
  }

  const t = Math.min(1, Math.max(0.72, Number(tightness) || 1))
  viewW *= t
  viewH *= t

  const minViewW = canvasWidth / maxZoomFactor
  if (viewW < minViewW) {
    viewW = minViewW
    viewH = viewW / aspect
  }

  const maxViewW = minZoomFactor ? canvasWidth / minZoomFactor : canvasWidth
  const maxViewH = minZoomFactor ? canvasHeight / minZoomFactor : canvasHeight
  const fitOut = Math.min(1, maxViewW / viewW, maxViewH / viewH)
  if (fitOut < 1) {
    viewW *= fitOut
    viewH *= fitOut
  }

  if (viewW > canvasWidth) {
    viewW = canvasWidth
    viewH = Math.min(canvasHeight, viewW / aspect)
  }
  if (viewH > canvasHeight) {
    viewH = canvasHeight
    viewW = viewH * aspect
  }

  let x = cx - viewW / 2
  let y = cy - viewH / 2
  if (viewW < canvasWidth) {
    x = Math.max(0, Math.min(canvasWidth - viewW, x))
  } else {
    x = (canvasWidth - viewW) / 2
  }
  if (viewH < canvasHeight) {
    y = Math.max(0, Math.min(canvasHeight - viewH, y))
  } else {
    y = (canvasHeight - viewH) / 2
  }

  const vp = { x, y, width: viewW, height: viewH }
  if (minZoomFactor) {
    return clampViewportToCanvas(vp, {
      canvasWidth,
      canvasHeight,
      minZoomFactor,
      maxZoomFactor,
    })
  }
  return vp
}

/**
 * Viewport al zoom indicado (p. ej. 1.3 = 130%), centrado en un punto del canvas.
 */
export function viewportAtZoomCentered(
  centerX,
  centerY,
  {
    canvasWidth,
    canvasHeight,
    containerWidth = 0,
    containerHeight = 0,
    zoomFactor = CANVAS_ZOOM_MESERO_MIN_FACTOR,
    maxZoomFactor = CANVAS_ZOOM_MAX_FACTOR,
  }
) {
  const zoom = Math.max(1, Number(zoomFactor) || CANVAS_ZOOM_MESERO_MIN_FACTOR)
  const aspect =
    containerWidth > 8 && containerHeight > 8
      ? containerWidth / containerHeight
      : canvasWidth / canvasHeight

  let viewW = canvasWidth / zoom
  let viewH = viewW / aspect
  const maxH = canvasHeight / zoom
  if (viewH > maxH) {
    viewH = maxH
    viewW = viewH * aspect
  }

  return clampViewportToCanvas(
    {
      x: centerX - viewW / 2,
      y: centerY - viewH / 2,
      width: viewW,
      height: viewH,
    },
    { canvasWidth, canvasHeight, minZoomFactor: zoom, maxZoomFactor }
  )
}
