import { useMemo } from 'react'
import { CheckCircleIcon, UserGroupIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { getStatusColors } from './statusColors'
import { getSeatsForShape, getSeatRotationDeg } from './seatLayout'
import { SHADOW_FILTER, SELECTED_FILTER } from './FloorTextures'

const STATUS_ICONS = {
  libre: CheckCircleIcon,
  ocupada: UserGroupIcon,
  esperandoCuenta: ClockIcon,
  porLimpiar: SparklesIcon,
}

const CHAIR_WIDTH = 32
const CHAIR_HEIGHT = 16
const CHAIR_FILL = '#6b7fa3'
const CHAIR_STROKE = '#4f6280'
const CHAIR_HIGHLIGHT = 'rgba(255,255,255,0.25)'

/**
 * Mesa estilo Odoo.
 *
 * Sillas: cápsula horizontal (ancho > alto) azul-gris con leve respaldo.
 *
 * Mesa: base madera clara (#c8a882) + tinte del color del estado al 18%,
 * borde grueso del color del estado, esquinas rx=8.
 */
export default function TableElement({
  element,
  mesa,
  selected = false,
  dark = false,
  onSelect,
  disableInteraction = false,
}) {
  const shape = element.shape || 'square'
  const width = Number(element.width || 80)
  const height = Number(element.height || 80)
  const seats = Number(element.seats || mesa?.capacidad || 4)
  const status = mesa?.estadoMesa || 'libre'
  const colors = getStatusColors(status, dark)
  const StatusIcon = STATUS_ICONS[status] || CheckCircleIcon

  const seatPositions = useMemo(() => {
    const baseW = width
    const baseH = height
    return getSeatsForShape(shape, seats, baseW, baseH)
  }, [shape, seats, width, height])

  const transform = `translate(${element.x}, ${element.y}) rotate(${element.rotation || 0})`
  const halfW = width / 2
  const halfH = height / 2

  const handleClick = (e) => {
    if (disableInteraction) return
    e.stopPropagation()
    if (typeof onSelect === 'function') onSelect(element, mesa)
  }

  const ringColor = '#00C2FF'
  const woodBase = dark ? '#8b6b46' : '#c8a882'
  const woodEdge = dark ? '#5a4426' : '#a8855e'
  const minSide = Math.min(width, height)
  const radius = shape === 'rectangle' ? 8 : shape === 'square' ? 8 : 0
  const tableLabel = element.label || (mesa?.numero != null ? `Mesa ${mesa.numero}` : 'Mesa')

  return (
    <g
      transform={transform}
      style={{
        cursor: disableInteraction ? 'default' : 'pointer',
        pointerEvents: disableInteraction ? 'none' : 'auto',
      }}
      onClick={handleClick}
      data-element-id={element.id}
      filter={selected ? SELECTED_FILTER : SHADOW_FILTER}
    >
      {seatPositions.map((s, idx) => {
        const angleDeg = getSeatRotationDeg(s)
        return (
          <g
            key={`seat_${idx}`}
            transform={`translate(${s.x}, ${s.y}) rotate(${angleDeg})`}
          >
            <rect
              x={-CHAIR_WIDTH / 2}
              y={-CHAIR_HEIGHT / 2}
              width={CHAIR_WIDTH}
              height={CHAIR_HEIGHT}
              rx={CHAIR_HEIGHT / 2}
              ry={CHAIR_HEIGHT / 2}
              fill={CHAIR_FILL}
              stroke={CHAIR_STROKE}
              strokeWidth={1.2}
            />
            <rect
              x={-CHAIR_WIDTH / 2 + 2}
              y={-CHAIR_HEIGHT / 2 + 1.5}
              width={CHAIR_WIDTH - 4}
              height={2}
              rx={1}
              fill={CHAIR_HIGHLIGHT}
            />
          </g>
        )
      })}

      {shape === 'round' ? (
        <>
          <circle
            cx={0}
            cy={0}
            r={Math.min(halfW, halfH)}
            fill={woodBase}
            stroke={woodEdge}
            strokeWidth={1}
          />
          <circle
            cx={0}
            cy={0}
            r={Math.min(halfW, halfH)}
            fill={colors.fill}
            opacity={0.55}
          />
          <circle
            cx={0}
            cy={0}
            r={Math.min(halfW, halfH)}
            fill="none"
            stroke={selected ? ringColor : colors.stroke}
            strokeWidth={selected ? 3.5 : 3}
          />
        </>
      ) : (
        <>
          <rect
            x={-halfW}
            y={-halfH}
            width={width}
            height={height}
            rx={radius}
            ry={radius}
            fill={woodBase}
            stroke={woodEdge}
            strokeWidth={1}
          />
          <rect
            x={-halfW}
            y={-halfH}
            width={width}
            height={height}
            rx={radius}
            ry={radius}
            fill={colors.fill}
            opacity={0.55}
          />
          <rect
            x={-halfW}
            y={-halfH}
            width={width}
            height={height}
            rx={radius}
            ry={radius}
            fill="none"
            stroke={selected ? ringColor : colors.stroke}
            strokeWidth={selected ? 3.5 : 3}
          />
        </>
      )}

      <foreignObject x={-halfW} y={-halfH} width={width} height={height} pointerEvents="none">
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            padding: 4,
            boxSizing: 'border-box',
            textShadow: dark
              ? '0 1px 2px rgba(0,0,0,0.55)'
              : '0 1px 1px rgba(255,255,255,0.55)',
          }}
        >
          <StatusIcon
            width={Math.max(13, Math.min(18, minSide * 0.17))}
            height={Math.max(13, Math.min(18, minSide * 0.17))}
            style={{ color: colors.accent, marginBottom: 1 }}
          />
          <div
            style={{
              fontWeight: 800,
              fontSize: Math.max(14, Math.min(24, minSide * 0.26)),
              lineHeight: 1,
              letterSpacing: 0.3,
            }}
          >
            {tableLabel}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
