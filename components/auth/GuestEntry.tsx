'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import PlaceSearch from '@/components/search/PlaceSearch'

type EntryMode = 'intro' | 'guest'

const INTRO_PARAGRAPHS = [
  '도시는 늘 같은 모습이지만,\n어떤 공간을 기억하느냐에 따라 전혀 다른 풍경이 됩니다.',
  '우연히 발견한 조용한 카페,\n사진을 남기고 싶었던 골목,\n오래 머물고 싶어졌던 공간들.',
  '그 순간의 느낌을\n"조용한", "뷰가 아름다운", "영감 얻기 좋은" 같은 태그로 남겨보세요.\n하나씩 쌓인 기록은 어느새\n당신만의 취향이 담긴 지도와 탐험의 방향이 됩니다.',
  '게스트 모드에서는 가볍게 둘러볼 수 있고,\n가입하면 저장한 장소를 바탕으로\n나만의 탐험 카드와 추천을 확인할 수 있어요',
]

function GuestNavTabs() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const view         = searchParams.get('view')

  function tabCls(active: boolean) {
    return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'bg-gray-900 text-white'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
    }`
  }

  return (
    <div className="flex items-center gap-1">
      <Link href="/"                  className={tabCls(pathname === '/' && view !== 'exploration')}>저장 장소</Link>
      <Link href="/?view=exploration" className={tabCls(pathname === '/' && view === 'exploration')}>탐험 패턴</Link>
    </div>
  )
}

function GuestNav() {
  return (
    <nav className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <Suspense fallback={<div className="flex items-center gap-1 h-8" />}>
          <GuestNavTabs />
        </Suspense>
        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">게스트</span>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400 hidden sm:block">데이터는 이 기기에만 저장됩니다</p>
        <Link
          href="/auth/login"
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          로그인 / 회원가입
        </Link>
      </div>
    </nav>
  )
}

export default function GuestEntry() {
  const [mode, setMode] = useState<EntryMode>('intro')

  if (mode === 'guest') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <GuestNav />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="flex-1 bg-gray-50" />}>
            <PlaceSearch initialSavedPlaces={[]} initialLists={[]} isGuest />
          </Suspense>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-sm mx-auto w-full">

          {/* intro copy */}
          <div className="space-y-5 mb-10">
            {INTRO_PARAGRAPHS.map((para, i) => (
              <p key={i} className="text-sm text-gray-700 leading-7 whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>

          {/* mode selection */}
          <div className="space-y-2.5">
            <button
              onClick={() => setMode('guest')}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
            >
              게스트로 둘러보기
            </button>
            <Link
              href="/auth/login"
              className="block w-full text-center py-3 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              로그인하고 시작하기
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
