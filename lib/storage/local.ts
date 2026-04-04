import type { PlaceData, ListData } from '@/lib/actions/places'

const PLACES_KEY = 'guest_saved_places'
const LISTS_KEY  = 'guest_lists'

export function loadGuestPlaces(): PlaceData[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLACES_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as PlaceData[]).map((p) => ({ ...p, memo: p.memo ?? '' }))
  } catch {
    return []
  }
}

export function saveGuestPlaces(places: PlaceData[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PLACES_KEY, JSON.stringify(places))
}

export function loadGuestLists(): ListData[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LISTS_KEY)
    return raw ? (JSON.parse(raw) as ListData[]) : []
  } catch {
    return []
  }
}

export function saveGuestLists(lists: ListData[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
}

export function clearGuestData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PLACES_KEY)
  localStorage.removeItem(LISTS_KEY)
}
