/**
 * Muro estructural del restaurante.
 *
 * Sin sombra ni esquinas redondeadas: al solaparse del mismo color se ven como un solo muro.
 */
export default function WallElement({
  element,
  dark = false,
  selected = false,
  onSelect,
  disableInteraction = false,
}) {
  const width = Number(element.width || 120)
  const height = Number(element.height || 16)
  const halfW = width / 2
  const halfH = height / 2
  const color = element.color || (dark ? '#3b82f6' : '#1d4ed8')
  const ringColor = '#00C2FF'

  const handleClick = (e) => {
    if (disableInteraction) return
    if (typeof onSelect === 'function') {
      e.stopPropagation()
      onSelect(element)
    }
  }

  return (
    <g
      transform={`translate(${element.x}, ${element.y}) rotate(${element.rotation || 0})`}
      onClick={handleClick}
      data-element-id={element.id}
      style={{
        cursor: disableInteraction ? 'default' : onSelect ? 'pointer' : 'default',
        pointerEvents: disableInteraction ? 'none' : 'auto',
      }}
    >
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        fill={color}
        stroke="none"
        shapeRendering="crispEdges"
      />
      {selected && (
        <rect
          x={-halfW - 4}
          y={-halfH - 4}
          width={width + 8}
          height={height + 8}
          rx={6}
          ry={6}
          fill="none"
          stroke={ringColor}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.85}
          pointerEvents="none"
        />
      )}
    </g>
  )
}
