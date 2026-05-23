import { getFloorTextureId } from './FloorTextures'

/**
 * Piso como objeto dibujado. Type='floor'.
 *
 * - Se renderiza siempre debajo de muros, decoraciones y mesas.
 * - Sin sombras (es parte del fondo del local).
 * - Sin bordes visibles cuando no está seleccionado.
 * - Soporta textura (madera/loseta/concreto/none) y opacidad 0.6-1.
 */
export default function FloorElement({
  element,
  dark = false,
  selected = false,
  onSelect,
  disableInteraction = false,
}) {
  const width = Number(element.width || 200)
  const height = Number(element.height || 200)
  const halfW = width / 2
  const halfH = height / 2
  const texture = element.texture || 'wood'
  const opacityValue =
    typeof element.opacity === 'number' && element.opacity > 0 ? element.opacity : 1
  const fillRef = texture === 'none' ? 'transparent' : `url(#${getFloorTextureId(texture, dark)})`

  const handleClick = (e) => {
    if (disableInteraction) return
    if (typeof onSelect === 'function') {
      e.stopPropagation()
      onSelect(element)
    }
  }

  const hitPointerEvents = disableInteraction ? 'none' : 'all'

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
      {texture === 'none' && (
        <rect
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          fill="transparent"
          pointerEvents={hitPointerEvents}
        />
      )}
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill={fillRef}
        opacity={opacityValue}
      />
      {selected && (
        <rect
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill="none"
          stroke="#00C2FF"
          strokeWidth={2}
          strokeDasharray="5 4"
          pointerEvents="none"
        />
      )}
    </g>
  )
}
