/**
 * Etiqueta de texto libre dentro del canvas.
 *
 * Props:
 *  - element: { id, x, y, rotation, label, width?, height? }
 *  - dark: boolean
 *  - selected: boolean
 *  - onSelect?: fn
 */
export default function LabelElement({
  element,
  dark = false,
  selected = false,
  onSelect,
  disableInteraction = false,
}) {
  const text = String(element.label || 'Texto')
  const color = dark ? '#e4e4e7' : '#1f2937'
  const ringColor = '#00C2FF'

  const handleClick = (e) => {
    if (disableInteraction) return
    if (typeof onSelect === 'function') {
      e.stopPropagation()
      onSelect(element)
    }
  }

  const fontSize = Number(element.fontSize || 18)
  const approxWidth = Math.max(40, text.length * fontSize * 0.6)
  const approxHeight = fontSize * 1.4

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
      {selected && (
        <rect
          x={-approxWidth / 2 - 4}
          y={-approxHeight / 2 - 2}
          width={approxWidth + 8}
          height={approxHeight + 4}
          rx={6}
          fill="none"
          stroke={ringColor}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Poppins, Inter, sans-serif"
        fontSize={fontSize}
        fontWeight={700}
        fill={color}
      >
        {text}
      </text>
    </g>
  )
}
