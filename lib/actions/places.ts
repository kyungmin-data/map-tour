'use server'

import { createClient } from '@/lib/supabase/server'

export interface ListData {
  id: string
  name: string
}

// PlaceData = one saved place record belonging to a user.
// category        = raw Naver category string (kept for reference / re-mapping)
// categoryGroup   = internal top-level category, e.g. "카페/디저트"
// categorySubgroup= internal detailed category, e.g. "카페"
// preferenceTags  = save-level personal tags (subjective), stored as JSONB string array
// memo            = optional free-text note written by the user
export interface PlaceData {
  title: string
  category: string
  categoryGroup: string
  categorySubgroup: string
  address: string
  roadAddress: string
  telephone: string
  mapx: string
  mapy: string
  preferenceTags: string[]
  listId: string | null
  memo: string
}

export async function getLists(): Promise<ListData[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('lists')
    .select('id, name')
    .order('created_at')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createList(name: string): Promise<ListData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('lists')
    .insert({ name, user_id: user.id })
    .select('id, name')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function savePlace(place: PlaceData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('saved_places')
    .insert({
      user_id:          user.id,
      title:            place.title,
      category:         place.category,
      category_group:   place.categoryGroup,
      category_subgroup:place.categorySubgroup,
      address:          place.address,
      road_address:     place.roadAddress,
      telephone:        place.telephone,
      mapx:             place.mapx,
      mapy:             place.mapy,
      list_id:          place.listId ?? null,
      preference_tags:  place.preferenceTags,
    })

  if (error && error.code !== '23505') throw new Error(error.message)
  // 23505 = unique violation (duplicate save) — silently skip
}

export async function updatePlaceTags(mapx: string, mapy: string, tags: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('saved_places')
    .update({ preference_tags: tags })
    .eq('user_id', user.id)
    .eq('mapx', mapx)
    .eq('mapy', mapy)

  if (error) throw new Error(error.message)
}

export async function deletePlace(mapx: string, mapy: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('user_id', user.id)
    .eq('mapx', mapx)
    .eq('mapy', mapy)

  if (error) throw new Error(error.message)
}

export async function getSavedPlaces(): Promise<PlaceData[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('saved_places')
    .select('title, category, category_group, category_subgroup, address, road_address, telephone, mapx, mapy, list_id, preference_tags, memo')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    title:           row.title,
    category:        row.category,
    categoryGroup:   row.category_group   ?? '',
    categorySubgroup:row.category_subgroup ?? '',
    address:         row.address,
    roadAddress:     row.road_address,
    telephone:       row.telephone,
    mapx:            row.mapx,
    mapy:            row.mapy,
    preferenceTags:  (row.preference_tags as string[]) ?? [],
    listId:          (row as any).list_id ?? null,
    memo:            (row as any).memo ?? '',
  }))
}

export async function publishList(listId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('lists')
    .update({ is_public: true })
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
}

export async function getPublicList(
  listId: string,
): Promise<{ list: ListData; places: PlaceData[] } | null> {
  const supabase = await createClient()

  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('id, name')
    .eq('id', listId)
    .eq('is_public', true)
    .single()

  if (listError || !list) return null

  const { data: places, error: placesError } = await supabase
    .from('saved_places')
    .select('title, category, category_group, category_subgroup, address, road_address, telephone, mapx, mapy, list_id, preference_tags, memo')
    .eq('list_id', listId)
    .order('created_at', { ascending: false })

  if (placesError) return null

  return {
    list,
    places: (places ?? []).map((row) => ({
      title:           row.title,
      category:        row.category,
      categoryGroup:   row.category_group   ?? '',
      categorySubgroup:row.category_subgroup ?? '',
      address:         row.address,
      roadAddress:     row.road_address,
      telephone:       row.telephone,
      mapx:            row.mapx,
      mapy:            row.mapy,
      preferenceTags:  (row.preference_tags as string[]) ?? [],
      listId:          listId,
      memo:            (row as any).memo ?? '',
    })),
  }
}

export async function updatePlaceMemo(mapx: string, mapy: string, memo: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('saved_places')
    .update({ memo })
    .eq('user_id', user.id)
    .eq('mapx', mapx)
    .eq('mapy', mapy)

  if (error) throw new Error(error.message)
}
