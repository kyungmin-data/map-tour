import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/nav/AppNav'
import ExplorationCards from '@/components/cards/ExplorationCards'
import { getSavedPlaces } from '@/lib/actions/places'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const savedPlaces = await getSavedPlaces()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-lg mx-auto w-full px-6 py-8">
        <div className="mb-8 space-y-1">
          <p className="text-2xl font-bold text-gray-900">내 탐험 카드</p>
          <p className="text-sm text-gray-500">
            저장된 {savedPlaces.length}곳을 바탕으로 분석한 나의 도시 탐험 스타일이에요.
          </p>
        </div>
        <ExplorationCards places={savedPlaces} />
      </div>
    </div>
  )
}
