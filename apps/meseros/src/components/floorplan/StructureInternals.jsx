/**
 * Adornos visuales internos por tipo de estructura.
 * Diseño en clave outline, inspirado en Odoo POS floor plan.
 */
export default function StructureInternals({
  type,
  width,
  height,
  layout = 'corner',
  line = 'rgba(15,23,42,0.72)',
  lineSoft = 'rgba(15,23,42,0.42)',
  fillSoft = 'rgba(255,255,255,0.65)',
  fillStrong = 'rgba(15,23,42,0.1)',
  accent = '#374151',
}) {
  const halfW = width / 2
  const halfH = height / 2
  const interior = layout === 'interior'

  if (type === 'kitchen') {
    const stoveSize = Math.min(width * (interior ? 0.36 : 0.42), height * (interior ? 0.44 : 0.62))
    const burnerSize = stoveSize * 0.32
    const burnerOffset = stoveSize * 0.22
    const cx = interior ? -width * 0.2 : -halfW + width * 0.32
    const cy = interior ? -height * 0.12 : -height * 0.05
    const fridgeW = Math.max(28, width * (interior ? 0.15 : 0.18))
    const fridgeH = Math.max(48, height * (interior ? 0.52 : 0.7))
    const fridgeX = interior ? width * 0.2 - fridgeW / 2 : halfW - fridgeW - 10
    const fridgeY = interior ? -fridgeH / 2 - height * 0.06 : -fridgeH / 2
    return (
      <g pointerEvents="none">
        <rect
          x={cx - stoveSize / 2}
          y={cy - stoveSize / 2}
          width={stoveSize}
          height={stoveSize}
          rx={6}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        {[
          [-burnerOffset, -burnerOffset],
          [burnerOffset, -burnerOffset],
          [-burnerOffset, burnerOffset],
          [burnerOffset, burnerOffset],
        ].map(([dx, dy], i) => (
          <g key={i} transform={`translate(${cx + dx}, ${cy + dy})`}>
            <circle r={burnerSize / 2} fill={fillStrong} stroke={line} strokeWidth={1.2} />
            <circle r={burnerSize / 2.6} fill="none" stroke={line} strokeWidth={1} />
            <circle r={burnerSize / 4} fill="none" stroke={lineSoft} strokeWidth={0.9} />
          </g>
        ))}
        <rect
          x={fridgeX}
          y={fridgeY}
          width={fridgeW}
          height={fridgeH}
          rx={4}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <line
          x1={fridgeX}
          y1={fridgeY + fridgeH * 0.4}
          x2={fridgeX + fridgeW}
          y2={fridgeY + fridgeH * 0.4}
          stroke={line}
          strokeWidth={1}
        />
        <rect
          x={fridgeX + 4}
          y={fridgeY + fridgeH * 0.46}
          width={fridgeW - 8}
          height={3}
          rx={1}
          fill={lineSoft}
        />
        <rect
          x={fridgeX + fridgeW * 0.7}
          y={fridgeY + 8}
          width={3}
          height={fridgeH * 0.25}
          rx={1.5}
          fill={lineSoft}
        />
      </g>
    )
  }

  if (type === 'bar') {
    const counterH = Math.max(20, height * 0.32)
    const counterY = -halfH + Math.max(10, height * 0.15)
    const bottleW = Math.max(5, Math.min(8, width * 0.04))
    const bottleH = Math.max(14, height * 0.3)
    const bottleSpacing = Math.min(width * 0.13, 50)
    return (
      <g pointerEvents="none">
        <rect
          x={-halfW + 10}
          y={counterY}
          width={width - 20}
          height={counterH}
          rx={5}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <line
          x1={-halfW + 10}
          y1={counterY + counterH * 0.55}
          x2={halfW - 10}
          y2={counterY + counterH * 0.55}
          stroke={lineSoft}
          strokeWidth={0.8}
        />
        {[-2, -1, 0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * bottleSpacing}, ${counterY - bottleH * 0.55})`}>
            <rect
              x={-bottleW / 2}
              y={0}
              width={bottleW}
              height={bottleH}
              rx={1.8}
              fill={fillStrong}
              stroke={line}
              strokeWidth={0.8}
            />
            <rect
              x={-bottleW / 4}
              y={-3}
              width={bottleW / 2}
              height={3.5}
              rx={1}
              fill={fillStrong}
              stroke={line}
              strokeWidth={0.6}
            />
          </g>
        ))}
      </g>
    )
  }

  if (type === 'cashier') {
    const armLong = Math.min(width * 0.7, 150)
    const armShort = Math.min(height * 0.6, 90)
    const thick = Math.max(16, Math.min(24, height * 0.22))
    const cx = -halfW + 12 + armLong / 2
    const cy = halfH - 12 - thick / 2
    return (
      <g pointerEvents="none">
        <rect
          x={cx - armLong / 2}
          y={cy - thick / 2}
          width={armLong}
          height={thick}
          rx={3}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <rect
          x={cx + armLong / 2 - thick}
          y={cy - thick / 2 - armShort + thick}
          width={thick}
          height={armShort}
          rx={3}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <g transform={`translate(${cx + armLong / 2 - thick - 18}, ${cy - thick / 2 - 14})`}>
          <rect
            x={-14}
            y={-10}
            width={28}
            height={18}
            rx={2}
            fill={fillStrong}
            stroke={line}
            strokeWidth={1}
          />
          <rect x={-11} y={-7} width={22} height={5} rx={1} fill={lineSoft} />
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                key={`k-${row}-${col}`}
                x={-11 + col * 6}
                y={-1 + row * 3}
                width={4.5}
                height={1.8}
                rx={0.5}
                fill={lineSoft}
              />
            ))
          )}
        </g>
      </g>
    )
  }

  if (type === 'reception') {
    const armLong = Math.min(width * 0.75, 170)
    const armShort = Math.min(height * 0.55, 80)
    const thick = Math.max(18, Math.min(26, height * 0.22))
    const cx = -halfW + 12 + armLong / 2
    const cy = halfH - 12 - thick / 2
    return (
      <g pointerEvents="none">
        <rect
          x={cx - armLong / 2}
          y={cy - thick / 2}
          width={armLong}
          height={thick}
          rx={3}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <rect
          x={cx + armLong / 2 - thick}
          y={cy - thick / 2 - armShort + thick}
          width={thick}
          height={armShort}
          rx={3}
          fill={fillSoft}
          stroke={line}
          strokeWidth={1.4}
        />
        <line
          x1={cx - armLong / 2 + 4}
          y1={cy - 1}
          x2={cx + armLong / 2 - thick - 4}
          y2={cy - 1}
          stroke={lineSoft}
          strokeWidth={0.8}
        />
        <g transform={`translate(${cx + armLong / 2 - thick - 28}, ${cy - thick / 2 - 12})`}>
          <circle r={8} fill={fillStrong} stroke={line} strokeWidth={0.8} />
          <path
            d="M 0 -8 Q -5 -4 -2 0 Q 2 -4 0 -8 Z"
            fill={accent}
            opacity={0.55}
          />
          <path
            d="M 0 -8 Q 4 -3 6 1 Q 3 -2 0 -8 Z"
            fill={accent}
            opacity={0.4}
          />
        </g>
      </g>
    )
  }

  if (type === 'bathroom') {
    const wcW = Math.min(width * 0.3, 50)
    const wcH = Math.min(height * 0.55, 70)
    const sinkW = Math.min(width * 0.3, 50)
    const sinkH = Math.min(height * 0.32, 38)
    const leftCenter = -width * 0.22
    const rightCenter = width * 0.22
    return (
      <g pointerEvents="none">
        <g transform={`translate(${leftCenter}, 0)`}>
          <rect
            x={-wcW / 2}
            y={-wcH / 2}
            width={wcW}
            height={wcH * 0.42}
            rx={3}
            fill={fillSoft}
            stroke={line}
            strokeWidth={1.4}
          />
          <ellipse
            cx={0}
            cy={-wcH / 2 + wcH * 0.42 + wcH * 0.32}
            rx={wcW * 0.46}
            ry={wcH * 0.32}
            fill={fillSoft}
            stroke={line}
            strokeWidth={1.4}
          />
          <line
            x1={-wcW * 0.35}
            y1={-wcH / 2 + 5}
            x2={wcW * 0.35}
            y2={-wcH / 2 + 5}
            stroke={lineSoft}
            strokeWidth={0.7}
          />
        </g>
        <g transform={`translate(${rightCenter}, 0)`}>
          <rect
            x={-sinkW / 2}
            y={-sinkH / 2}
            width={sinkW}
            height={sinkH}
            rx={4}
            fill={fillSoft}
            stroke={line}
            strokeWidth={1.4}
          />
          <ellipse
            cx={0}
            cy={sinkH * 0.08}
            rx={sinkW * 0.35}
            ry={sinkH * 0.28}
            fill="none"
            stroke={line}
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={-sinkH / 2}
            x2={0}
            y2={-sinkH / 2 + sinkH * 0.22}
            stroke={line}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={0} cy={-sinkH / 2 + sinkH * 0.22} r={1.4} fill={line} />
        </g>
      </g>
    )
  }

  return null
}
