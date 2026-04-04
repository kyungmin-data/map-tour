import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/nav/AppNav'
import PlaceSearch from '@/components/search/PlaceSearch'
import GuestEntry from '@/components/auth/GuestEntry'
import { getSavedPlaces, getLists } from '@/lib/actions/places'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <GuestEntry />

  const [initialSavedPlaces, initialLists] = await Promise.all([
    getSavedPlaces(),
    getLists(),
  ])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppNav />
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex-1 bg-gray-50" />}>
          <PlaceSearch
            initialSavedPlaces={initialSavedPlaces}
            initialLists={initialLists}
          />
        </Suspense>
      </main>
    </div>
  )
}
