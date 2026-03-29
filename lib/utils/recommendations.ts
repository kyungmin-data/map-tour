import type { PlaceData } from '@/lib/actions/places'

export interface Recommendation {
  id: string
  icon: string
  title: string
  description: string
}

// Archetype cards keyed by preference tag label
const TAG_ARCHETYPES: Record<string, { icon: string; title: string }> = {
  '조용한':           { icon: '🤫', title: '조용한 공간 수집가' },
  '감성적인':         { icon: '🎨', title: '감성 공간 수집가' },
  '활기찬':           { icon: '🎉', title: '활기찬 동네 탐험가' },
  '작업하기 좋은':    { icon: '💻', title: '카페 작업실 헌터' },
  '데이트하기 좋은':  { icon: '💕', title: '데이트 코스 큐레이터' },
  '혼자 가기 좋은':   { icon: '🚶', title: '혼자만의 공간 탐험가' },
  '친구와 가기 좋은': { icon: '👥', title: '친구 모임 플래너' },
  '사진 찍기 좋은':   { icon: '📸', title: '사진 맛집 탐방가' },
  '산책과 함께 가기 좋은': { icon: '🌿', title: '산책 루트 수집가' },
  '구경하는 재미가 있는':  { icon: '🔍', title: '골목 탐험가' },
  '오래 머물기 좋은': { icon: '☕', title: '오래 머무는 공간 헌터' },
  '숨은 장소 느낌':   { icon: '🗝️', title: '숨은 장소 발견자' },
}

// Archetype cards keyed by internal categoryGroup
const CATEGORY_ARCHETYPES: Record<string, { icon: string; title: string }> = {
  '음식점':       { icon: '🍜', title: '맛집 탐방가' },
  '카페/디저트':  { icon: '☕', title: '카페 수집가' },
  '문화/예술':    { icon: '🎭', title: '전시 산책러' },
  '쇼핑':         { icon: '🛍️', title: '쇼핑 탐험가' },
  '여행/명소':    { icon: '📍', title: '명소 큐레이터' },
  '공원/산책':    { icon: '🌲', title: '자연 산책가' },
  '체험/액티비티':{ icon: '🎪', title: '체험 탐험가' },
}
const CATEGORY_ARCHETYPE_DEFAULT = { icon: '🗺️', title: '동네 탐험가' }

const SEOUL_AREAS = [
  { name: '홍대',   lat: 37.557, lng: 126.924 },
  { name: '연남동', lat: 37.562, lng: 126.921 },
  { name: '합정',   lat: 37.549, lng: 126.914 },
  { name: '신촌',   lat: 37.555, lng: 126.937 },
  { name: '마포',   lat: 37.556, lng: 126.950 },
  { name: '서촌',   lat: 37.578, lng: 126.968 },
  { name: '종로',   lat: 37.572, lng: 126.979 },
  { name: '인사동', lat: 37.574, lng: 126.985 },
  { name: '용산',   lat: 37.532, lng: 126.970 },
  { name: '이태원', lat: 37.534, lng: 126.994 },
  { name: '강남',   lat: 37.498, lng: 127.028 },
  { name: '압구정', lat: 37.527, lng: 127.028 },
  { name: '성수',   lat: 37.544, lng: 127.056 },
  { name: '건대',   lat: 37.540, lng: 127.070 },
]

function nearestAreaName(lat: number, lng: number): string {
  return [...SEOUL_AREAS]
    .map((a) => ({ name: a.name, d: (a.lat - lat) ** 2 + (a.lng - lng) ** 2 }))
    .sort((a, b) => a.d - b.d || a.name.localeCompare(b.name))[0].name
}

const CATEGORY_AREA_SUGGESTIONS: Record<string, string[]> = {
  '문화/예술':    ['성수', '을지로', '서촌', '한남', '문래'],
  '음식점':       ['망원', '연남', '성수', '을지로', '익선동'],
  '카페/디저트':  ['성수', '연남', '한남', '서촌', '익선동'],
  '쇼핑':         ['성수', '한남', '압구정', '가로수길'],
  '여행/명소':    ['북촌', '서촌', '성수', '한남', '남산'],
  '공원/산책':    ['서울숲', '한강공원', '북서울꿈의숲'],
  '체험/액티비티':['성수', '홍대', '합정', '연남동'],
}
const FALLBACK_AREAS = ['성수', '이태원', '연남동', '합정']

export function getRecommendations(places: PlaceData[]): Recommendation[] {
  if (places.length < 3) return []

  const recs: Recommendation[] = []

  // Rule 1 — preference tag affinity
  const tagCount: Record<string, number> = {}
  for (const place of places) {
    for (const tag of place.preferenceTags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1
    }
  }
  const topTagEntry = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topTagEntry && topTagEntry[1] >= 2) {
    const [label, count] = topTagEntry
    const a = TAG_ARCHETYPES[label] ?? { icon: '✨', title: `${label} 공간 수집가` }
    recs.push({
      id: 'tag-affinity',
      icon: a.icon,
      title: a.title,
      description: `"${label}" 장소를 유독 자주 저장하고 계세요. 이런 분위기의 공간을 특히 좋아하시는 것 같아요.`,
    })
  }

  // Rule 2 — category group affinity
  const catCount: Record<string, number> = {}
  for (const place of places) {
    const g = place.categoryGroup
    if (g) catCount[g] = (catCount[g] ?? 0) + 1
  }
  const topCatEntry = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topCatEntry && topCatEntry[1] >= 2) {
    const a = CATEGORY_ARCHETYPES[topCatEntry[0]] ?? CATEGORY_ARCHETYPE_DEFAULT
    recs.push({
      id: 'category-affinity',
      icon: a.icon,
      title: a.title,
      description: `${topCatEntry[0]} 공간을 가장 많이 저장하셨어요. 저장 목록에서 가장 자주 보이는 장소 유형이에요.`,
    })
  }

  // Rule 3 — category + preference tag combo
  const catTagCount: Record<string, { count: number; cat: string; tag: string }> = {}
  for (const place of places) {
    const cat = place.categoryGroup
    if (!cat) continue
    for (const tag of place.preferenceTags) {
      const key = `${cat}::${tag}`
      if (!catTagCount[key]) catTagCount[key] = { count: 0, cat, tag }
      catTagCount[key].count++
    }
  }
  const topPair = Object.values(catTagCount)
    .sort((a, b) => b.count - a.count || a.cat.localeCompare(b.cat))[0]
  if (topPair && topPair.count >= 2) {
    const icon = TAG_ARCHETYPES[topPair.tag]?.icon ?? CATEGORY_ARCHETYPES[topPair.cat]?.icon ?? '🎯'
    recs.push({
      id: 'cat-tag-affinity',
      icon,
      title: `${topPair.tag} ${topPair.cat} 수집가`,
      description: `${topPair.cat} 중에서도 "${topPair.tag}" 분위기의 장소를 즐겨 저장하세요. 취향이 뚜렷한 탐험가예요.`,
    })
  }

  // Rule 4 — area focus (geographic density cell)
  const cellCount: Record<string, { count: number; lat: number; lng: number; key: string }> = {}
  for (const place of places) {
    const lat  = Number(place.mapy) / 1e7
    const lng  = Number(place.mapx) / 1e7
    const cell = `${lat.toFixed(1)},${lng.toFixed(1)}`
    if (!cellCount[cell]) {
      cellCount[cell] = { count: 0, lat: Math.round(lat * 10) / 10 + 0.05, lng: Math.round(lng * 10) / 10 + 0.05, key: cell }
    }
    cellCount[cell].count++
  }
  const topCell = Object.values(cellCount)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))[0]
  if (topCell && topCell.count >= 2) {
    const areaName = nearestAreaName(topCell.lat, topCell.lng)
    recs.push({
      id: 'area-focus',
      icon: '📍',
      title: `${areaName} 근처 탐험가`,
      description: `${areaName} 근처에 저장한 장소가 가장 많아요. 이 지역을 중심으로 활발하게 탐험하고 계시네요.`,
    })
  }

  // Rule 5 — category-based distant-area nudge
  if (topCatEntry && topCatEntry[1] >= 2 && topCell) {
    const dominantArea = nearestAreaName(topCell.lat, topCell.lng)
    const candidates   = (CATEGORY_AREA_SUGGESTIONS[topCatEntry[0]] ?? FALLBACK_AREAS)
      .filter((a) => a !== dominantArea)
    const suggestion = candidates[0]
    if (suggestion) {
      recs.push({
        id: 'explore-nudge',
        icon: '🗺️',
        title: '새 동네 탐험 추천',
        description: `${topCatEntry[0]} 공간을 자주 찾으시는군요. ${suggestion}에서도 비슷한 분위기를 느껴보세요.`,
      })
    }
  }

  return recs.slice(0, 5)
}
