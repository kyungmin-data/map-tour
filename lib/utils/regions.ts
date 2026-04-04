import type { PlaceData } from '@/lib/actions/places'

export interface RegionData {
  name: string
  count: number
  lat: number
  lng: number
  dominantCategory: string
  dominantTag: string | null
}

// Colors keyed by categoryGroup — shared between map and legend panel
export const CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  '음식점':        { fill: '#FEF08A', stroke: '#CA8A04' },
  '카페/디저트':   { fill: '#FED7AA', stroke: '#EA580C' },
  '문화/예술':     { fill: '#DDD6FE', stroke: '#7C3AED' },
  '쇼핑':          { fill: '#BBF7D0', stroke: '#16A34A' },
  '공원/산책':     { fill: '#A7F3D0', stroke: '#059669' },
  '체험/액티비티': { fill: '#BFDBFE', stroke: '#2563EB' },
  '여행/명소':     { fill: '#FDE68A', stroke: '#D97706' },
  '기타':          { fill: '#E5E7EB', stroke: '#6B7280' },
}

/** Korean peninsula bounding box (mainland + Jeju, with margin). */
const KOREA = { latMin: 33, latMax: 40, lngMin: 124, lngMax: 133 }

export function isKoreanCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat  >= KOREA.latMin && lat  <= KOREA.latMax &&
    lng >= KOREA.lngMin && lng <= KOREA.lngMax
  )
}

/** Parse Naver integer-encoded coordinate string to decimal degrees.
 *  Naver stores WGS84 degrees × 1e7 as an integer string, e.g.
 *  "1270289510" → 127.0289510° (longitude), "375665350" → 37.5665350° (latitude).
 */
function parseNaverCoord(raw: string): number {
  return Number(raw) / 1e7
}

/** Extract the smallest named administrative unit from a Korean address.
 *  Priority: 구(district) > 시(city) > 군(county) > fallback '기타'
 */
function extractRegion(address: string): string {
  const gu  = address.match(/([가-힣]{1,6}구)/)
  if (gu)  return gu[1]
  const si  = address.match(/([가-힣]{1,6}시)/)
  if (si)  return si[1]
  const gun = address.match(/([가-힣]{1,6}군)/)
  if (gun) return gun[1]
  return '기타'
}

function modeOf<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  const counts = new Map<T, number>()
  let best = arr[0], bestCount = 0
  for (const v of arr) {
    const c = (counts.get(v) ?? 0) + 1
    counts.set(v, c)
    if (c > bestCount) { bestCount = c; best = v }
  }
  return best
}

export function analyzeRegions(places: PlaceData[]): RegionData[] {
  const buckets = new Map<string, PlaceData[]>()

  for (const place of places) {
    const addr   = place.roadAddress || place.address
    const region = extractRegion(addr)
    const lat    = parseNaverCoord(place.mapy)   // mapy = latitude (y)
    const lng    = parseNaverCoord(place.mapx)   // mapx = longitude (x)

    console.log('[regions] place:', place.title,
      '| address:', addr,
      '| region:', region,
      '| mapx:', place.mapx, '→ lng:', lng,
      '| mapy:', place.mapy, '→ lat:', lat,
    )

    if (!isKoreanCoord(lat, lng)) {
      console.warn('[regions] skipped invalid coord for', place.title, { lat, lng })
      continue
    }

    const bucket = buckets.get(region)
    if (bucket) bucket.push(place)
    else buckets.set(region, [place])
  }

  const result: RegionData[] = []

  for (const [name, bucket] of buckets) {
    // Compute centroid from validated coords only (all passed the guard above)
    const lats = bucket.map(p => parseNaverCoord(p.mapy))
    const lngs = bucket.map(p => parseNaverCoord(p.mapx))
    const lat  = lats.reduce((s, v) => s + v, 0) / lats.length
    const lng  = lngs.reduce((s, v) => s + v, 0) / lngs.length

    const categories    = bucket.map(p => p.categoryGroup).filter(Boolean)
    const dominantCategory = modeOf(categories) ?? '기타'
    const tags          = bucket.flatMap(p => p.preferenceTags)
    const dominantTag   = modeOf(tags)

    console.log('[regions] centroid:', name, { lat, lng, count: bucket.length, dominantCategory })
    result.push({ name, count: bucket.length, lat, lng, dominantCategory, dominantTag })
  }

  return result.sort((a, b) => b.count - a.count)
}
