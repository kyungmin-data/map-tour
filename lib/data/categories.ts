// ── Internal category hierarchy ──────────────────────────────────────────────

export const CATEGORY_GROUPS = [
  '음식점',
  '카페/디저트',
  '문화/예술',
  '쇼핑',
  '공원/산책',
  '체험/액티비티',
  '여행/명소',
  '기타',
] as const

export type CategoryGroup = typeof CATEGORY_GROUPS[number]

export const CATEGORY_SUBGROUPS: Record<string, string[]> = {
  '음식점':       ['한식', '중식', '일식', '양식', '아시안', '분식', '고기', '해산물', '비건/샐러드', '패스트푸드'],
  '카페/디저트':  ['카페', '베이커리', '디저트', '브런치', '티하우스'],
  '문화/예술':    ['미술관', '갤러리', '박물관', '영화관', '공연장', '독립서점', '대형서점', '복합문화공간'],
  '쇼핑':         ['백화점', '쇼핑몰', '의류', '편집숍', '빈티지숍', '소품샵', '문구샵', '인테리어/리빙', '공예품샵'],
  '공원/산책':    ['공원', '산책로', '하천변', '숲길', '전망대', '루프탑', '야경명소'],
  '체험/액티비티':['공방', '클래스', '도예/공예', '쿠킹', '플라워', '보드게임', '방탈출', '전시형 체험', 'VR/실내체험'],
  '여행/명소':    ['관광명소', '지역명소', '역사명소', '랜드마크', '포토스팟', '계절명소'],
  '기타':         [],
}

// ── Naver raw category → internal group/subgroup ──────────────────────────────
// Naver returns e.g. "카페,디저트", "음식점>한식", "문화시설>미술관"

const NAVER_GROUP_MAP: Record<string, string> = {
  // 음식점
  '음식점': '음식점', '한식': '음식점', '중식': '음식점', '일식': '음식점',
  '양식': '음식점', '분식': '음식점', '고기': '음식점', '해산물': '음식점',
  // 카페/디저트
  '카페': '카페/디저트', '카페,디저트': '카페/디저트', '디저트': '카페/디저트',
  '베이커리': '카페/디저트', '브런치': '카페/디저트',
  // 문화/예술
  '문화시설': '문화/예술', '문화,예술': '문화/예술', '예술': '문화/예술',
  '공연': '문화/예술', '서점': '문화/예술', '전시': '문화/예술',
  // 쇼핑
  '쇼핑,유통': '쇼핑', '쇼핑': '쇼핑', '유통': '쇼핑',
  // 공원/산책
  '공원': '공원/산책', '자연,공원': '공원/산책', '자연': '공원/산책', '산책': '공원/산책',
  // 체험/액티비티
  '체험': '체험/액티비티', '액티비티': '체험/액티비티', '공방': '체험/액티비티',
  // 여행/명소
  '여행,명소': '여행/명소', '여행': '여행/명소', '관광': '여행/명소', '명소': '여행/명소',
}

const NAVER_SUBGROUP_MAP: Record<string, string> = {
  // 음식점
  '한식': '한식', '중식': '중식', '일식': '일식', '양식': '양식',
  '아시안': '아시안', '분식': '분식', '고기': '고기', '해산물': '해산물',
  '비건': '비건/샐러드', '샐러드': '비건/샐러드', '패스트푸드': '패스트푸드',
  // 카페/디저트
  '카페': '카페', '베이커리': '베이커리', '디저트': '디저트',
  '브런치': '브런치', '티하우스': '티하우스', '차': '티하우스',
  // 문화/예술
  '미술관': '미술관', '갤러리': '갤러리', '박물관': '박물관',
  '영화관': '영화관', '공연장': '공연장', '독립서점': '독립서점',
  '서점': '대형서점', '복합문화공간': '복합문화공간',
  // 쇼핑
  '백화점': '백화점', '쇼핑몰': '쇼핑몰', '의류': '의류',
  '편집숍': '편집숍', '빈티지': '빈티지숍', '소품샵': '소품샵',
  '문구': '문구샵', '인테리어': '인테리어/리빙', '리빙': '인테리어/리빙',
  '공예품샵': '공예품샵', '마켓': '편집숍',
  // 공원/산책
  '공원': '공원', '산책로': '산책로', '하천': '하천변',
  '숲': '숲길', '전망대': '전망대', '루프탑': '루프탑', '야경': '야경명소',
  // 체험/액티비티
  '공방': '공방', '클래스': '클래스', '도예': '도예/공예', '쿠킹': '쿠킹',
  '플라워': '플라워', '보드게임': '보드게임', '방탈출': '방탈출',
  '전시형 체험': '전시형 체험', 'VR': 'VR/실내체험',
  // 여행/명소
  '관광명소': '관광명소', '지역명소': '지역명소', '역사': '역사명소',
  '랜드마크': '랜드마크', '포토스팟': '포토스팟', '계절명소': '계절명소',
}

// Maps a raw Naver category string to internal { group, subgroup }.
// Never fails — subgroup is always non-empty.
//
// Naver category format examples:
//   "음식점>한식"     → { group: '음식점',     subgroup: '한식' }
//   "음식점>퓨전요리" → { group: '음식점',     subgroup: '퓨전요리' }  ← raw fallback
//   "카페,디저트"     → { group: '카페/디저트', subgroup: '카페' }
//   "문화시설>미술관" → { group: '문화/예술',   subgroup: '미술관' }
//   "대학교"         → { group: '기타',        subgroup: '대학교' }   ← raw fallback
//   ""               → { group: '기타',        subgroup: '기타' }
//
// Group mapping (short-circuits on first match):
//   1. Exact lookup in NAVER_GROUP_MAP
//   2. Substring fuzzy match
//   3. Fallback → '기타'
//
// Subgroup mapping:
//   1. Exact lookup in NAVER_SUBGROUP_MAP (if subRaw present)
//   2. Substring fuzzy match
//   3. Discard if resolved subgroup doesn't belong to the group
//   4. Fallback → subRaw || topRaw  (always yields a meaningful label)
export function mapNaverCategory(naverRaw: string): { group: string; subgroup: string } {
  if (!naverRaw) return { group: '기타', subgroup: '기타' }

  const parts  = naverRaw.split('>')
  const topRaw = parts[0].trim()
  const subRaw = parts[1]?.trim() ?? ''

  // ── group ─────────────────────────────────────────────────────────────────
  let group = NAVER_GROUP_MAP[topRaw] ?? ''
  if (!group) {
    for (const [key, val] of Object.entries(NAVER_GROUP_MAP)) {
      if (topRaw.includes(key) || key.includes(topRaw)) { group = val; break }
    }
  }
  const isOther = !group
  if (!group) group = '기타'

  // ── subgroup ──────────────────────────────────────────────────────────────
  let subgroup = ''

  if (isOther) {
    // Group couldn't be mapped — preserve the most specific raw label so that
    // '기타' places are still distinguishable (e.g. "대학교", "병원", "주유소").
    subgroup = subRaw || topRaw
  } else {
    // Group is mapped — try to resolve a known subgroup.
    if (subRaw) {
      subgroup = NAVER_SUBGROUP_MAP[subRaw] ?? ''
      if (!subgroup) {
        for (const [key, val] of Object.entries(NAVER_SUBGROUP_MAP)) {
          if (subRaw.includes(key) || key.includes(subRaw)) { subgroup = val; break }
        }
      }
      // Discard if the resolved subgroup doesn't belong to the resolved group.
      if (subgroup && !CATEGORY_SUBGROUPS[group]?.includes(subgroup)) {
        subgroup = ''
      }
    }
    // Subgroup still empty — fall back to the most specific raw token available.
    if (!subgroup) subgroup = subRaw || topRaw
  }

  return { group, subgroup }
}
