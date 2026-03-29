'use client'

import { useState, useEffect } from 'react'
import { getRecommendations } from '@/lib/utils/recommendations'
import type { PlaceData } from '@/lib/actions/places'

export default function ExplorationCards({ places }: { places: PlaceData[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const recs = mounted ? getRecommendations(places) : []

  if (!mounted) return null

  if (places.length < 3) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-4xl">🗺</p>
        <p className="text-gray-500 text-sm">장소를 3개 이상 저장하면 탐험 카드가 만들어져요.</p>
      </div>
    )
  }

  if (recs.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-4xl">🔍</p>
        <p className="text-gray-500 text-sm">아직 패턴을 분석하기에 데이터가 부족해요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" style={{ animation: 'fadeIn 0.3s ease' }}>
      {recs.map((rec, i) => (
        <div
          key={rec.id}
          className="rounded-2xl border border-gray-200 bg-white px-6 py-5 space-y-2 shadow-sm"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="text-3xl">{rec.icon}</div>
          <p className="text-base font-bold text-gray-900">{rec.title}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>
        </div>
      ))}
    </div>
  )
}
