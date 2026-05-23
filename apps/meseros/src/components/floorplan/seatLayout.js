/**
 * Cálculo de posiciones de sillas alrededor de una mesa.
 *
 * Convenciones:
 *  - Coordenadas locales relativas al centro de la mesa (cx=0, cy=0).
 *  - Sillas modeladas como cápsula horizontal 32×16 (rotate en TableElement).
 *    El offset perpendicular usa la mitad del lado corto (altura) hacia la mesa.
 *  - Cuadrada/redonda: distribución equiespaciada por lado o ángulo.
 *  - Rectangular: lados largos (arriba/abajo) y cortos (izq/der); esquinas solo si no caben.
 */

export const SEAT_WIDTH = 32
export const SEAT_HEIGHT = 16
export const SEAT_GAP = 10

const PERP_OFFSET = SEAT_GAP + SEAT_HEIGHT / 2

function centeredT(count, i) {
  if (count <= 0) return 0
  if (count === 1) return 0
  return (2 * i + 1) / (2 * count) - 0.5
}

export function getSquareSeats(n, size) {
  const seats = []
  if (n <= 0) return seats

  const distribution = [0, 0, 0, 0]
  for (let i = 0; i < n; i++) distribution[i % 4]++

  const sides = ['top', 'right', 'bottom', 'left']
  const offset = size / 2 + PERP_OFFSET

  sides.forEach((side, idx) => {
    const count = distribution[idx]
    if (count === 0) return
    for (let i = 0; i < count; i++) {
      const t = centeredT(count, i) * size
      if (side === 'top') seats.push({ x: t, y: -offset, side })
      if (side === 'bottom') seats.push({ x: t, y: offset, side })
      if (side === 'left') seats.push({ x: -offset, y: t, side })
      if (side === 'right') seats.push({ x: offset, y: t, side })
    }
  })

  return seats
}

/** Máximo de sillas que caben centradas en un lado sin solaparse. */
function maxSeatsOnEdge(edgeLength) {
  if (edgeLength < SEAT_WIDTH) return 0
  return Math.max(1, Math.floor((edgeLength + SEAT_GAP) / (SEAT_WIDTH + SEAT_GAP)))
}

/**
 * Mesa rectangular: reparte en lados largos (arriba/abajo), luego cortos (izq/der).
 * Esquinas en diagonal solo si la capacidad supera lo que cabe en los cuatro lados.
 */
export function getRectangleSeats(n, width, height) {
  const seats = []
  if (n <= 0) return seats

  const hw = width / 2
  const hh = height / 2
  const offsetY = hh + PERP_OFFSET
  const offsetX = hw + PERP_OFFSET

  const longCap = maxSeatsOnEdge(width) * 2
  const shortCap = maxSeatsOnEdge(height) * 2

  let remaining = n

  function placeHoriz(count, y, side) {
    for (let i = 0; i < count; i++) {
      seats.push({ x: centeredT(count, i) * width, y, side })
    }
  }
  function placeVert(count, x, side) {
    for (let i = 0; i < count; i++) {
      seats.push({ x, y: centeredT(count, i) * height, side })
    }
  }

  const onLongSides = Math.min(remaining, longCap)
  const top = Math.ceil(onLongSides / 2)
  const bottom = onLongSides - top
  remaining -= onLongSides

  if (top > 0) placeHoriz(top, -offsetY, 'top')
  if (bottom > 0) placeHoriz(bottom, offsetY, 'bottom')

  const onShortSides = Math.min(remaining, shortCap)
  const left = Math.ceil(onShortSides / 2)
  const right = onShortSides - left
  remaining -= onShortSides

  if (left > 0) placeVert(left, -offsetX, 'left')
  if (right > 0) placeVert(right, offsetX, 'right')

  if (remaining > 0) {
    const d = PERP_OFFSET * Math.SQRT1_2
    const corners = [
      { x: -(hw + d), y: -(hh + d), side: 'corner' },
      { x: hw + d, y: -(hh + d), side: 'corner' },
      { x: hw + d, y: hh + d, side: 'corner' },
      { x: -(hw + d), y: hh + d, side: 'corner' },
    ]
    for (let i = 0; i < Math.min(remaining, corners.length); i++) {
      seats.push(corners[i])
    }
  }

  return seats
}

/**
 * Mesa redonda: sillas distribuidas uniformemente.
 * Primer asiento en -π/2 (parte superior) para simetría visual.
 */
export function getRoundSeats(n, diameter) {
  const seats = []
  if (n <= 0) return seats

  const radius = diameter / 2 + PERP_OFFSET
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i / n) * 2 * Math.PI
    seats.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      side: 'round',
    })
  }
  return seats
}

export function getSeatsForShape(shape, n, width, height) {
  if (shape === 'round') return getRoundSeats(n, Math.min(width, height))
  if (shape === 'rectangle') return getRectangleSeats(n, width, height)
  return getSquareSeats(n, Math.min(width, height))
}

/**
 * Rotación de la cápsula de silla (grados).
 * Lados rectos: paralelas al borde; redonda/esquina: hacia el centro de la mesa.
 */
export function getSeatRotationDeg(seat) {
  const side = seat?.side
  if (side === 'top') return 0
  if (side === 'bottom') return 180
  if (side === 'left') return -90
  if (side === 'right') return 90
  if (side === 'round' || side === 'corner') {
    return (Math.atan2(seat.y, seat.x) * 180) / Math.PI + 90
  }
  return (Math.atan2(seat.y, seat.x) * 180) / Math.PI + 90
}

/**
 * Tamaños por defecto S/M/L/XL según número de sillas.
 */
export function getDefaultSizeForSeats(seats, shape = 'square') {
  const n = Math.max(1, Number(seats || 0))
  let base = 72
  if (n <= 2) base = 60
  else if (n <= 4) base = 78
  else if (n <= 6) base = 94
  else if (n <= 8) base = 110
  else base = 128

  if (shape === 'rectangle') {
    return { width: Math.round(base * 1.6), height: base }
  }
  return { width: base, height: base }
}
