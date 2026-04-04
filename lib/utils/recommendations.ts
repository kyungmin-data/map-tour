import type { PlaceData } from '@/lib/actions/places'
import { analyzeRegions } from '@/lib/utils/regions'

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
    const [label] = topTagEntry
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

  // Rule 4 — area focus (derived from address, not coordinates)
  const regions = analyzeRegions(places)
  if (regions.length > 0 && regions[0].count >= 2) {
    const topRegion = regions[0]
    recs.push({
      id: 'area-focus',
      icon: '📍',
      title: `${topRegion.name} 탐험가`,
      description: `${topRegion.name}에 저장한 장소가 가장 많아요. 이 지역을 중심으로 활발하게 탐험하고 계시네요.`,
    })
  }

  return recs.slice(0, 4)
}
