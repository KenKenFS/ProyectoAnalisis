import { Squares2X2Icon } from '@heroicons/react/24/outline'
import { DECORATION_META } from './decorationTypes'
import StructureInternals from './StructureInternals'
import { SHADOW_FILTER, SELECTED_FILTER, getFloorTextureId, FLOOR_TEXTURES } from './FloorTextures'
import { getStructurePalette, isLightStructureBackground } from './structureStyle'
import {
  computeBBox,
  computeInteriorSquareLayout,
  computePolygonLabelPlacement,
  isPolygonElement,
  pointsToSvgAttr,
} from './polygonUtils'

const FLOOR_TEX_IDS = new Set(FLOOR_TEXTURES.map((t) => t.id))

/**
 * Elemento decorativo del local.
 * Modos según DECORATION_META[type].kind:
 *  - 'structure' → caja con borde, fill por color/textura interna,
 *    adornos internos vectoriales (fogones, WC, etc.) y label en franja inferior.
 *  - 'signal'    → icono prominente con label debajo, sin caja física.
 */
export default function DecorationElement({
  element,
  dark = false,
  selected = false,
  onSelect,
  disableInteraction = false,
}) {
  const meta = DECORATION_META[element.decorationType] || {
    label: element.label || 'Elemento',
    Icon: Squares2X2Icon,
    kind: 'structure',
  }
  const Icon = meta.Icon
  const kind = meta.kind || 'structure'
  const width = Number(element.width || (kind === 'signal' ? 86 : 160))
  const height = Number(element.height || (kind === 'signal' ? 96 : 110))
  const halfW = width / 2
  const halfH = height / 2
  const ringColor = '#00C2FF'

  const handleClick = (e) => {
    if (disableInteraction) return
    if (typeof onSelect === 'function') {
      e.stopPropagation()
      onSelect(element)
    }
  }

  const hitPointerEvents = disableInteraction ? 'none' : 'all'
  const groupCursor = disableInteraction ? 'default' : onSelect ? 'pointer' : 'default'

  if (kind === 'signal') {
    const labelColor = dark ? '#e4e4e7' : '#1f2937'
    const iconColor = element.color
      ? '#0f172a'
      : dark
      ? '#e4e4e7'
      : '#1f2937'
    const iconBg = element.color || (dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)')
    const iconBorder = element.color
      ? 'rgba(15,23,42,0.25)'
      : dark
      ? 'rgba(255,255,255,0.18)'
      : 'rgba(15,23,42,0.18)'
    const iconSize = Math.max(20, Math.min(width, height) * 0.55)
    return (
      <g
        transform={`translate(${element.x}, ${element.y}) rotate(${element.rotation || 0})`}
        onClick={handleClick}
        data-element-id={element.id}
        style={{ cursor: onSelect ? 'pointer' : 'default' }}
        filter={selected ? SELECTED_FILTER : SHADOW_FILTER}
      >
        <rect
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          fill="transparent"
          pointerEvents="all"
        />
        {selected && (
          <rect
            x={-halfW - 4}
            y={-halfH - 4}
            width={width + 8}
            height={height + 8}
            rx={10}
            ry={10}
            fill="none"
            stroke={ringColor}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.85}
            pointerEvents="none"
          />
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
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
              gap: 4,
            }}
          >
            <div
              style={{
                width: iconSize + 18,
                height: iconSize + 18,
                borderRadius: '50%',
                backgroundColor: iconBg,
                border: `1.5px solid ${iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon width={iconSize} height={iconSize} style={{ color: iconColor }} />
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: Math.max(11, Math.min(13, width * 0.14)),
                letterSpacing: 0.2,
                marginTop: 1,
                color: labelColor,
              }}
            >
              {element.label || meta.label}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }

  const hasFloorTex = element.floorTexture && FLOOR_TEX_IDS.has(element.floorTexture)
  const customFill = element.color || null
  const baseFill = customFill || (dark ? '#3a3a4a' : '#e5e1d8')
  const fill = customFill
    ? customFill
    : hasFloorTex
    ? `url(#${getFloorTextureId(element.floorTexture, dark)})`
    : baseFill

  const lightBg = isLightStructureBackground({
    customFill,
    hasFloorTex: hasFloorTex && !customFill,
    floorTexture: element.floorTexture,
    dark,
  })
  const palette = getStructurePalette(lightBg)

  const polygonMode = isPolygonElement(element)
  const bbox = polygonMode ? computeBBox(element.points) : null
  const interiorLayout = polygonMode ? computeInteriorSquareLayout(element.points) : null
  const drawW = polygonMode ? interiorLayout.side : width
  const drawH = polygonMode ? interiorLayout.side : height
  const showInternals = drawW >= 88 && drawH >= 64
  const labelStripHeight = Math.max(20, Math.min(28, (polygonMode ? bbox.height : height) * 0.22))
  const cx = polygonMode ? interiorLayout.cx : element.x
  const cy = polygonMode
    ? interiorLayout.cy -
      (interiorLayout.concave ? Math.min(labelStripHeight * 0.35, interiorLayout.side * 0.14) : 0)
    : element.y
  const clipId = `structure-clip-${element.id}`

  if (polygonMode) {
    const pointsAttr = pointsToSvgAttr(element.points)
    const labelBox = computePolygonLabelPlacement(element.points, labelStripHeight)

    return (
      <g
        onClick={handleClick}
        data-element-id={element.id}
        style={{ cursor: groupCursor }}
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <polygon points={pointsAttr} />
          </clipPath>
        </defs>
        <g
          clipPath={`url(#${clipId})`}
          filter={selected ? SELECTED_FILTER : SHADOW_FILTER}
        >
          <polygon
            points={pointsAttr}
            fill={fill}
            stroke={selected ? ringColor : palette.stroke}
            strokeWidth={selected ? 2.5 : 1.2}
            strokeLinejoin="round"
            pointerEvents={hitPointerEvents}
          />
          {showInternals && (
            <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
              <StructureInternals
                type={element.decorationType}
                width={drawW}
                height={drawH}
                layout="interior"
                line={palette.line}
                lineSoft={palette.lineSoft}
                fillSoft={palette.fillSoft}
                fillStrong={palette.fillStrong}
                accent={palette.text}
              />
            </g>
          )}
          <foreignObject
            x={labelBox.x}
            y={labelBox.y}
            width={labelBox.width}
            height={labelBox.height}
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
              color: palette.text,
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
              padding: '2px 6px',
              boxSizing: 'border-box',
              gap: 6,
              background: palette.labelStripBg,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Icon
              width={Math.max(12, Math.min(16, labelBox.width * 0.1))}
              height={Math.max(12, Math.min(16, labelBox.width * 0.1))}
              style={{ color: palette.text, opacity: 0.9, flexShrink: 0 }}
            />
            <div
              style={{
                fontWeight: 700,
                fontSize: Math.max(10, Math.min(12, labelBox.width * 0.085)),
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {element.label || meta.label}
            </div>
          </div>
          </foreignObject>
        </g>
        {selected && (
          <polygon
            points={pointsAttr}
            fill="none"
            stroke={ringColor}
            strokeWidth={2}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        )}
      </g>
    )
  }

  return (
    <g
      transform={`translate(${element.x}, ${element.y}) rotate(${element.rotation || 0})`}
      onClick={handleClick}
      data-element-id={element.id}
      style={{ cursor: groupCursor }}
      filter={selected ? SELECTED_FILTER : SHADOW_FILTER}
    >
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        rx={10}
        ry={10}
        fill={fill}
        stroke={selected ? ringColor : palette.stroke}
        strokeWidth={selected ? 2.5 : 1.2}
      />
      {showInternals && (
        <StructureInternals
          type={element.decorationType}
          width={width}
          height={height}
          line={palette.line}
          lineSoft={palette.lineSoft}
          fillSoft={palette.fillSoft}
          fillStrong={palette.fillStrong}
          accent={palette.text}
        />
      )}
      <foreignObject
        x={-halfW}
        y={halfH - labelStripHeight}
        width={width}
        height={labelStripHeight}
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
            color: palette.text,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            padding: '2px 6px',
            boxSizing: 'border-box',
            gap: 6,
            background: palette.labelStripBg,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            backdropFilter: 'blur(2px)',
          }}
        >
          <Icon
            width={Math.max(12, Math.min(16, width * 0.1))}
            height={Math.max(12, Math.min(16, width * 0.1))}
            style={{ color: palette.text, opacity: 0.9, flexShrink: 0 }}
          />
          <div
            style={{
              fontWeight: 700,
              fontSize: Math.max(10, Math.min(12, width * 0.085)),
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {element.label || meta.label}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
