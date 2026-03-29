// ── Preference tag groups ─────────────────────────────────────────────────────
// Tags are Korean label strings stored directly on the save record (JSONB).
// They describe the user's subjective perception — not the place's objective type.

export const PREFERENCE_GROUPS: Record<string, string[]> = {
  '분위기':   ['조용한', '감성적인', '활기찬', '아늑한', '세련된', '힙한', '프라이빗한', '숨은 장소 느낌', '오래 머물기 좋은', '구경하는 재미가 있는'],
  '공간 특성': ['큰 규모', '인테리어가 멋진', '사진 찍기 좋은', '뷰가 아름다운', '야외좌석 있는', '채광 좋은', '좌석이 넓은', '동선이 편한'],
  '이용 목적': ['혼자 가기 좋은', '친구와 가기 좋은', '데이트하기 좋은', '가족과 가기 좋은', '작업하기 좋은', '산책과 함께 가기 좋은', '가볍게 들르기 좋은', '특별한 날 가기 좋은'],
  '편의/조건': ['가성비 좋은', '주차 가능', '대중교통 접근 좋은', '웨이팅 적은', '예약 가능한', '반려동물 동반 가능', '아이와 가기 좋은'],
  '경험 품질': ['맛있는', '커피가 좋은', '디저트가 좋은', '서비스가 친절한', '서비스가 특별한', '맞춤 응대가 좋은', '시즌감이 있는', '희소성 있는', '선물하기 좋은'],
  '개인 애착': ['다시 가고 싶은', '단골집', '나만 알고 싶은', '특별한 추억이 있는', '기분전환 되는', '영감 얻기 좋은'],
}

// Flat list of all preference tags
export const ALL_PREFERENCE_TAGS: string[] = Object.values(PREFERENCE_GROUPS).flat()

// Tags shown in the initial (unexpanded) UI — representative cross-group sample
export const MVP_VISIBLE_TAGS: string[] = [
  '조용한',
  '감성적인',
  '사진 찍기 좋은',
  '작업하기 좋은',
  '혼자 가기 좋은',
  '데이트하기 좋은',
  '구경하는 재미가 있는',
  '뷰가 아름다운',
  '인테리어가 멋진',
  '가성비 좋은',
  '맛있는',
  '다시 가고 싶은',
]
