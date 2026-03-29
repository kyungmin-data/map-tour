'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import type { PlaceData, ListData } from '@/lib/actions/places'

// ── constants ───────────────────────────────────────────────────────────────

const CARD_W   = 400
const MAP_H    = 310
const STRIP_H  = 150
const PLACE_CW = 130
const PLACE_CH = 72
const MARKER_R = 13

// ── helpers ─────────────────────────────────────────────────────────────────

function topLevel(category: string) {
  return category.split('>')[0].trim()
}

function toMarkerPos(
  places: PlaceData[],
  w: number,
  h: number,
  pad = 44,
): { cx: number; cy: number }[] {
  const lngs   = places.map((p) => Number(p.mapx) / 1e7)
  const lats   = places.map((p) => Number(p.mapy) / 1e7)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  return places.map((p) => ({
    cx: maxLng === minLng
      ? w / 2
      : pad + ((Number(p.mapx) / 1e7 - minLng) / (maxLng - minLng)) * (w - 2 * pad),
    cy: maxLat === minLat
      ? h / 2
      : (h - pad) - ((Number(p.mapy) / 1e7 - minLat) / (maxLat - minLat)) * (h - 2 * pad),
  }))
}

function toCardPos(
  markers: { cx: number; cy: number }[],
  mapW: number,
  mapH: number,
  cw: number,
  ch: number,
): { x: number; y: number }[] {
  const cx = markers.reduce((s, m) => s + m.cx, 0) / markers.length
  const cy = markers.reduce((s, m) => s + m.cy, 0) / markers.length
  const maxSpread = Math.max(
    ...markers.map((m) => Math.sqrt((m.cx - cx) ** 2 + (m.cy - cy) ** 2)),
  )
  const DIST = 88
  return markers.map((m, i) => {
    const angle =
      maxSpread < 30
        ? (i / markers.length) * Math.PI * 2 - Math.PI / 2
        : Math.atan2(m.cy - cy || 0.001, m.cx - cx || 0.001)
    const ox = maxSpread < 30 ? cx : m.cx
    const oy = maxSpread < 30 ? cy : m.cy
    const x = Math.max(2, Math.min(mapW - cw - 2, ox + Math.cos(angle) * DIST - cw / 2))
    const y = Math.max(2, Math.min(mapH - ch - 2, oy + Math.sin(angle) * DIST - ch / 2))
    return { x, y }
  })
}

// ── mood system ─────────────────────────────────────────────────────────────

interface Mood {
  mapBg: string
  blockA: string      // primary block fill
  blockB: string      // secondary block fill
  road: string        // street stroke color
  parkFill: string    // park / green-space fill
  accent: string      // marker, border, badge
  accentSoft: string  // tag pill background
  cardBg: string      // floating place card bg
  stripBg: string     // bottom strip bg
  stripTitle: string  // list name color
  stripSub: string    // label / count color
  mapLabel: string    // e.g. "맛집 지도"
  icons: string[]     // decorative emoji overlaid on blocks
}

const MOODS: Record<string, Mood> = {
  food: {
    mapBg: '#FEF3E0', blockA: '#F5DCB0', blockB: '#ECC896',
    road: '#DEB86A', parkFill: '#B5CE98',
    accent: '#C84818', accentSoft: '#F8C4A8',
    cardBg: '#FFFCF6',
    stripBg: '#2A0C00', stripTitle: '#FFF8F0', stripSub: '#E8A060',
    mapLabel: '맛집 지도',
    icons: ['🍽', '🥢', '☕', '🍜'],
  },
  cafe: {
    mapBg: '#F8EFE0', blockA: '#EED8B0', blockB: '#DEC490',
    road: '#C8A060', parkFill: '#AACCA0',
    accent: '#6B3818', accentSoft: '#D8A878',
    cardBg: '#FFFCF6',
    stripBg: '#220E00', stripTitle: '#FFF8F0', stripSub: '#C8985A',
    mapLabel: '카페 지도',
    icons: ['☕', '🧋', '🍰', '🫖'],
  },
  culture: {
    mapBg: '#F0ECF8', blockA: '#DDD0F0', blockB: '#CCBCE8',
    road: '#B0A0D0', parkFill: '#A8C0D8',
    accent: '#4C2E9E', accentSoft: '#C4B4EE',
    cardBg: '#FAFAFF',
    stripBg: '#160838', stripTitle: '#FFF8FF', stripSub: '#B0A0E0',
    mapLabel: '문화 지도',
    icons: ['🎨', '🖼', '🎭', '🎪'],
  },
  shopping: {
    mapBg: '#F0F8EE', blockA: '#CCEAC8', blockB: '#B4D8B8',
    road: '#8CC898', parkFill: '#70B870',
    accent: '#1A6838', accentSoft: '#8ECC9E',
    cardBg: '#F8FBF8',
    stripBg: '#062018', stripTitle: '#F8FFF8', stripSub: '#80C890',
    mapLabel: '쇼핑 지도',
    icons: ['🛍', '👗', '✨', '💳'],
  },
  nature: {
    mapBg: '#EAF4E0', blockA: '#C8DCA8', blockB: '#B4CC90',
    road: '#8CB870', parkFill: '#60A848',
    accent: '#1C5A28', accentSoft: '#80C888',
    cardBg: '#F8FAF5',
    stripBg: '#081E0C', stripTitle: '#F8FFF5', stripSub: '#80C888',
    mapLabel: '자연 지도',
    icons: ['🌿', '🌳', '🍃', '🌸'],
  },
  default: {
    mapBg: '#EDE8E0', blockA: '#D8CEC0', blockB: '#C8BCA8',
    road: '#B0A488', parkFill: '#A8B898',
    accent: '#3A3228', accentSoft: '#B0A898',
    cardBg: '#FAFAF8',
    stripBg: '#18181b', stripTitle: '#ffffff', stripSub: '#A8A098',
    mapLabel: '나의 지도',
    icons: ['📍', '🗺', '✨', '🧭'],
  },
}

function deriveMood(places: PlaceData[]): Mood {
  const counts: Record<string, number> = {}
  for (const p of places) {
    // Prefer the structured categoryGroup; fall back to parsing the raw Naver string
    const cat = p.categoryGroup || topLevel(p.category)
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  if (top === '음식점')         return MOODS.food
  if (top.includes('카페'))     return MOODS.cafe
  if (top.includes('문화'))     return MOODS.culture
  if (top === '쇼핑')           return MOODS.shopping
  if (top.includes('공원'))     return MOODS.nature
  return MOODS.default
}

// ── component ───────────────────────────────────────────────────────────────

export default function ListCard({
  list,
  places,
}: {
  list: ListData
  places: PlaceData[]
}) {
  const cardRef   = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const mood = deriveMood(places)

  // Prefer places with tags (richer cards); cap at 5
  const withTags    = places.filter((p) => p.preferenceTags.length > 0)
  const withoutTags = places.filter((p) => p.preferenceTags.length === 0)
  const featured    = [...withTags, ...withoutTags].slice(0, 5)

  const markers = toMarkerPos(featured, CARD_W, MAP_H)
  const cardPos = toCardPos(markers, CARD_W, MAP_H, PLACE_CW, PLACE_CH)

  async function handleExport() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 })
      const a = document.createElement('a')
      a.download = `${list.name}.png`
      a.href = dataUrl
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // Emoji decor positions — inside block areas, away from streets
  const decorPositions = [
    { x: 16,  y: 16  },   // block row-1 col-1
    { x: 238, y: 14  },   // block row-1 col-3
    { x: 334, y: 128 },   // block row-2 col-4
    { x: 20,  y: 236 },   // block row-3 col-1
  ]

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8 }}>

      {/* ── captured area ─────────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        style={{
          width: CARD_W,
          borderRadius: 20,
          overflow: 'hidden',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          backgroundColor: mood.cardBg,
        }}
      >

        {/* ── map area ──────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', width: CARD_W, height: MAP_H }}>

          {/* SVG: illustrated map background + connectors + markers */}
          <svg
            width={CARD_W}
            height={MAP_H}
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            {/* Base fill */}
            <rect width={CARD_W} height={MAP_H} fill={mood.mapBg} />

            {/* ── city blocks — 3 rows × 4 cols, staggered for organic feel ── */}
            {/* Row 1 */}
            <rect x={6}   y={5}   width={92}  height={86}  rx={8} fill={mood.blockA} />
            <rect x={116} y={5}   width={80}  height={90}  rx={8} fill={mood.blockB} opacity={0.9} />
            <rect x={216} y={3}   width={80}  height={87}  rx={8} fill={mood.blockA} opacity={0.85} />
            <rect x={314} y={7}   width={80}  height={83}  rx={8} fill={mood.blockB} opacity={0.8} />
            {/* Row 2 (varied heights for character) */}
            <rect x={4}   y={108} width={94}  height={96}  rx={8} fill={mood.blockB} opacity={0.8} />
            <rect x={116} y={106} width={80}  height={100} rx={8} fill={mood.blockA} opacity={0.85} />
            <rect x={218} y={110} width={78}  height={92}  rx={8} fill={mood.blockB} opacity={0.75} />
            <rect x={314} y={108} width={80}  height={96}  rx={8} fill={mood.blockA} opacity={0.8} />
            {/* Row 3 */}
            <rect x={6}   y={222} width={90}  height={82}  rx={8} fill={mood.blockA} opacity={0.75} />
            <rect x={114} y={218} width={84}  height={88}  rx={8} fill={mood.blockB} opacity={0.8} />
            <rect x={216} y={220} width={80}  height={86}  rx={8} fill={mood.blockA} opacity={0.7} />
            <rect x={314} y={222} width={80}  height={84}  rx={8} fill={mood.blockB} opacity={0.75} />

            {/* Park / green open space (center-left) */}
            <ellipse cx={162} cy={157} rx={32} ry={24} fill={mood.parkFill} opacity={0.55} />
            <ellipse cx={162} cy={157} rx={20} ry={15} fill={mood.parkFill} opacity={0.4} />

            {/* ── streets — organic S-curves, not straight lines ─────────── */}
            {/* Horizontal 1 — gentle S */}
            <path
              d={`M0,100 C60,96 140,105 220,99 S340,103 ${CARD_W},100`}
              fill="none" stroke={mood.road} strokeWidth={9} strokeLinecap="round"
            />
            {/* Horizontal 2 */}
            <path
              d={`M0,212 C80,208 160,217 240,211 S340,215 ${CARD_W},212`}
              fill="none" stroke={mood.road} strokeWidth={9} strokeLinecap="round"
            />
            {/* Vertical 1 */}
            <path
              d={`M107,0 C104,80 111,180 106,${MAP_H}`}
              fill="none" stroke={mood.road} strokeWidth={7} strokeLinecap="round"
            />
            {/* Vertical 2 */}
            <path
              d={`M207,0 C210,100 204,200 208,${MAP_H}`}
              fill="none" stroke={mood.road} strokeWidth={7} strokeLinecap="round"
            />
            {/* Vertical 3 */}
            <path
              d={`M307,0 C304,90 310,190 306,${MAP_H}`}
              fill="none" stroke={mood.road} strokeWidth={7} strokeLinecap="round"
            />
            {/* Diagonal accent route — feels like a real neighborhood cut-through */}
            <path
              d={`M${CARD_W},55 Q${CARD_W * 0.65},${MAP_H * 0.5} ${CARD_W * 0.22},${MAP_H - 45}`}
              fill="none" stroke={mood.road} strokeWidth={4} opacity={0.45}
              strokeDasharray="10 5" strokeLinecap="round"
            />

            {/* Connector lines: marker → card center */}
            {markers.map((m, i) => {
              const cp = cardPos[i]
              return (
                <line
                  key={`conn${i}`}
                  x1={m.cx} y1={m.cy}
                  x2={cp.x + PLACE_CW / 2} y2={cp.y + PLACE_CH / 2}
                  stroke={mood.accent} strokeWidth={1.5}
                  strokeDasharray="5 4" opacity={0.45}
                />
              )
            })}

            {/* Numbered markers with soft glow rings */}
            {markers.map((m, i) => (
              <g key={`mk${i}`}>
                <circle cx={m.cx} cy={m.cy} r={MARKER_R + 5} fill={mood.accent} opacity={0.12} />
                <circle cx={m.cx} cy={m.cy} r={MARKER_R + 2} fill={mood.accent} opacity={0.25} />
                <circle cx={m.cx} cy={m.cy} r={MARKER_R}     fill={mood.accent} />
                <text
                  x={m.cx} y={m.cy + 0.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="800" fill="#fff"
                  fontFamily="'Helvetica Neue', Arial, sans-serif"
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>

          {/* Mood emoji decorations — HTML divs for reliable rendering */}
          {decorPositions.map((pos, i) => (
            <div
              key={`decor${i}`}
              style={{
                position: 'absolute',
                left: pos.x, top: pos.y,
                fontSize: 22, lineHeight: 1,
                opacity: 0.25,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {mood.icons[i] ?? ''}
            </div>
          ))}

          {/* Floating place cards */}
          {featured.map((place, i) => {
            const pos = cardPos[i]
            const tag = place.preferenceTags[0]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: PLACE_CW, height: PLACE_CH,
                  backgroundColor: mood.cardBg,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 3px 14px rgba(0,0,0,0.2)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'row',
                }}
              >
                {/* Left accent bar */}
                <div style={{ width: 4, flexShrink: 0, backgroundColor: mood.accent }} />

                {/* Card content */}
                <div style={{ flex: 1, padding: '7px 8px 6px', overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, color: '#18181b',
                    lineHeight: 1.25, marginBottom: 2,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {place.title}
                  </div>
                  <div style={{
                    fontSize: 9, color: mood.accent, marginBottom: 5,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    opacity: 0.85,
                  }}>
                    {place.categorySubgroup || place.categoryGroup || topLevel(place.category) || '장소'}
                  </div>
                  {tag && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 8.5, padding: '1.5px 5px',
                      backgroundColor: mood.accentSoft,
                      borderRadius: 999,
                      color: mood.accent,
                      fontWeight: 600,
                    }}>
                      {tag}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── title strip ───────────────────────────────────────────────── */}
        <div style={{
          height: STRIP_H,
          padding: '16px 22px 18px',
          backgroundColor: mood.stripBg,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            {/* Category mood label */}
            <div style={{
              fontSize: 10, fontWeight: 600, color: mood.stripSub,
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5,
              opacity: 0.85,
            }}>
              {mood.mapLabel}
            </div>
            {/* List name */}
            <div style={{
              fontSize: 20, fontWeight: 800, color: mood.stripTitle,
              lineHeight: 1.15, letterSpacing: -0.3,
            }}>
              {list.name}
            </div>
            {/* Place count */}
            <div style={{ fontSize: 11, color: mood.stripSub, marginTop: 4, opacity: 0.7 }}>
              {places.length}곳 저장됨
            </div>
          </div>

          {/* Numbered mini-legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
            {featured.map((place, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 15, height: 15, borderRadius: 999,
                  backgroundColor: mood.accent, color: '#fff',
                  fontSize: 7.5, fontWeight: 800, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </div>
                <div style={{
                  fontSize: 10, color: mood.stripTitle,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  maxWidth: 68, opacity: 0.85,
                }}>
                  {place.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── export button — outside captured area ─────────────────────────── */}
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          width: CARD_W, padding: '10px 0', borderRadius: 10,
          backgroundColor: mood.accent, color: '#fff',
          fontSize: 13, fontWeight: 600,
          border: 'none', cursor: exporting ? 'default' : 'pointer',
          opacity: exporting ? 0.5 : 1,
        }}
      >
        {exporting ? '저장 중...' : '이미지 저장'}
      </button>
    </div>
  )
}
