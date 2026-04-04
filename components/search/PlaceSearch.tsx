'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  savePlace as savePlaceAction,
  deletePlace as deletePlaceAction,
  createList as createListAction,
  updatePlaceTags as updatePlaceTagsAction,
  updatePlaceMemo as updatePlaceMemoAction,
  publishList as publishListAction,
  type PlaceData,
  type ListData,
} from '@/lib/actions/places'
import {
  loadGuestPlaces, saveGuestPlaces,
  loadGuestLists,  saveGuestLists,
} from '@/lib/storage/local'
import NaverMap from '@/components/map/NaverMap'
import ExplorationMap from '@/components/map/ExplorationMap'
import PromptModal from '@/components/ui/PromptModal'
import { analyzeRegions, CATEGORY_COLORS } from '@/lib/utils/regions'
import { CATEGORY_GROUPS, CATEGORY_SUBGROUPS, mapNaverCategory } from '@/lib/data/categories'
import { PREFERENCE_GROUPS, MVP_VISIBLE_TAGS } from '@/lib/data/preferences'

// ── types ────────────────────────────────────────────────────────────────────

interface Place {
  title: string
  category: string
  address: string
  roadAddress: string
  telephone: string
  link: string
  mapx: string
  mapy: string
}

type SheetState = 'collapsed' | 'mid' | 'expanded'
const SHEET_PEEK: Record<SheetState, number> = { collapsed: 52, mid: 300, expanded: 9999 }

// ── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(s: string) { return s.replace(/<[^>]*>/g, '') }

function chipCls(active: boolean) {
  return active
    ? 'bg-gray-900 text-white'
    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-500 hover:text-gray-900'
}

function tagChipCls(active: boolean) {
  return active
    ? 'bg-blue-600 text-white border-blue-600'
    : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-500'
}

// ── sub-components ───────────────────────────────────────────────────────────

function SkeletonItem() {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2.5 animate-pulse">
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="h-3 w-2/3 rounded bg-gray-200" />
        <div className="h-2.5 w-1/3 rounded bg-gray-100" />
      </div>
      <div className="h-5 w-10 shrink-0 rounded bg-gray-100" />
    </li>
  )
}

function CompactPlaceRow({
  place, isSelected, activeList, lists, onClick, onDelete, onEditClick, editPanel,
}: {
  place: PlaceData
  isSelected: boolean
  activeList: string | null
  lists: ListData[]
  onClick: () => void
  onDelete: () => void
  onEditClick: () => void
  editPanel?: React.ReactNode
}) {
  return (
    <li className="divide-y divide-gray-100">
      <div
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500 pl-2.5' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{place.title}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {place.categoryGroup && (
              <span className="text-[10px] text-blue-500">
                {place.categorySubgroup || place.categoryGroup}
              </span>
            )}
            {place.preferenceTags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                {tag}
              </span>
            ))}
            {!activeList && place.listId && (
              <span className="text-[10px] text-indigo-400">
                {lists.find((l) => l.id === place.listId)?.name}
              </span>
            )}
          </div>
          {place.memo && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{place.memo}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEditClick() }}
          className="shrink-0 text-[10px] text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded px-1.5 py-0.5 transition-colors"
        >
          태그
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="shrink-0 text-gray-300 hover:text-red-500 transition-colors px-1 text-base leading-none"
        >
          ×
        </button>
      </div>
      {editPanel}
    </li>
  )
}

// ── main component ───────────────────────────────────────────────────────────

export default function PlaceSearch({
  initialSavedPlaces,
  initialLists,
  isGuest = false,
}: {
  initialSavedPlaces: PlaceData[]
  initialLists: ListData[]
  isGuest?: boolean
}) {
  // search
  const [query, setQuery]             = useState('')
  const [places, setPlaces]           = useState<Place[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchCount, setSearchCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // map
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null)
  const [previewPlace, setPreviewPlace]   = useState<Place | null>(null)

  // save flow — pending state
  const [pendingSave, setPendingSave]               = useState<Place | null>(null)
  const [pendingCategoryGroup, setPendingCatGroup]  = useState('')
  const [pendingCategorySubgroup, setPendingCatSub] = useState('')
  const [pendingPreferenceTags, setPendingTags]     = useState<string[]>([])
  const [pendingMemo, setPendingMemo]               = useState('')
  const [showAllSaveTags, setShowAllSaveTags]       = useState(false)
  const [pendingListId, setPendingListId]           = useState<string | null>(null)
  const [newListName, setNewListName]               = useState('')
  const [showNewListInput, setShowNewListInput]     = useState(false)

  // data
  const [savedPlaces, setSavedPlaces] = useState<PlaceData[]>(initialSavedPlaces)
  const [lists, setLists]             = useState<ListData[]>(initialLists)

  // filters
  const [activeCatGroup, setActiveCatGroup]       = useState<string | null>(null)
  const [activeCatSub, setActiveCatSub]           = useState<string | null>(null)
  const [activePrefs, setActivePrefs]             = useState<string[]>([])
  const [showAllFilterTags, setShowAllFilterTags] = useState(false)
  const [activeList, setActiveList]               = useState<string | null>(null)

  // share
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [shareError, setShareError]   = useState<string | null>(null)
  const [shareUrl, setShareUrl]       = useState<string | null>(null)
  const [copyStatus, setCopyStatus]   = useState<'idle' | 'copied' | 'failed'>('idle')
  const shareUrlInputRef              = useRef<HTMLInputElement>(null)

  // prompt modal
  const [activePrompt, setActivePrompt] = useState<'guest-signup' | 'auth-cards' | null>(null)

  // tag + memo editing
  const [editingPlace, setEditingPlace]       = useState<PlaceData | null>(null)
  const [editTags, setEditTags]               = useState<string[]>([])
  const [editMemo, setEditMemo]               = useState('')
  const [showAllEditTags, setShowAllEditTags] = useState(false)

  // mobile sheet
  const [sheetState, setSheetState] = useState<SheetState>('mid')

  // view — driven by URL ?view=exploration
  const searchParams = useSearchParams()
  const panelTab = searchParams.get('view') === 'exploration' ? 'exploration' : 'saved'

  useEffect(() => {
    setShareStatus('idle'); setShareError(null); setShareUrl(null); setCopyStatus('idle')
  }, [activeList])

  // Guest mode: hydrate from localStorage on mount
  useEffect(() => {
    if (!isGuest) return
    setSavedPlaces(loadGuestPlaces())
    setLists(loadGuestLists())
  }, [isGuest])

  // Guest mode: persist to localStorage when data changes
  useEffect(() => {
    if (!isGuest) return
    saveGuestPlaces(savedPlaces)
  }, [savedPlaces, isGuest])

  useEffect(() => {
    if (!isGuest) return
    saveGuestLists(lists)
  }, [lists, isGuest])

  // ── behavior-triggered prompts ─────────────────────────────────────────────

  // Guest: encourage sign-up after saving 3 places
  useEffect(() => {
    if (!isGuest) return
    if (savedPlaces.length !== 3) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem('prompt_guest_3')) return
    localStorage.setItem('prompt_guest_3', '1')
    setActivePrompt('guest-signup')
  }, [savedPlaces.length, isGuest])

  // Auth: surface exploration cards once the user has 10+ saved places.
  // >= 10 rather than === 10 so users who already have more than 10 saves
  // (e.g. on first page load) still see the prompt the first time.
  // === 10 would never fire for them because the count jumps straight past 10.
  useEffect(() => {
    if (isGuest) return
    if (savedPlaces.length < 10) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem('prompt_auth_10')) return
    localStorage.setItem('prompt_auth_10', '1')
    setActivePrompt('auth-cards')
  }, [savedPlaces.length, isGuest])

  // ── derived ─────────────────────────────────────────────────────────────

  const regions = useMemo(() => analyzeRegions(savedPlaces), [savedPlaces])

  const filteredPlaces = savedPlaces
    .filter((p) => !activeList   || p.listId === activeList)
    .filter((p) => !activeCatGroup || p.categoryGroup === activeCatGroup)
    .filter((p) => !activeCatSub   || p.categorySubgroup === activeCatSub)
    .filter((p) => activePrefs.length === 0 || activePrefs.some((t) => p.preferenceTags.includes(t)))

  const hasFilters = !!(activeCatGroup || activeCatSub || activePrefs.length > 0 || activeList)

  // ── actions ──────────────────────────────────────────────────────────────

  function isSaved(place: Place) {
    return savedPlaces.some((p) => p.mapx === place.mapx && p.mapy === place.mapy)
  }

  function openSaveDialog(place: Place) {
    const { group, subgroup } = mapNaverCategory(place.category)
    closeEditTags()
    setPendingSave(place)
    setPendingCatGroup(group)
    setPendingCatSub(subgroup)
    setPendingTags([])
    setPendingMemo('')
    setShowAllSaveTags(false)
  }

  function togglePendingTag(tag: string) {
    setPendingTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function toggleActivePreference(tag: string) {
    setActivePrefs((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function resetFilters() {
    setActiveCatGroup(null); setActiveCatSub(null); setActivePrefs([]); setActiveList(null)
  }

  function openEditTags(place: PlaceData) {
    setPendingSave(null)
    setEditingPlace(place)
    setEditTags([...place.preferenceTags])
    setEditMemo(place.memo)
    setShowAllEditTags(false)
  }

  function closeEditTags() {
    setEditingPlace(null); setEditTags([]); setEditMemo(''); setShowAllEditTags(false)
  }

  function toggleEditTag(tag: string) {
    setEditTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function handleUpdateTags() {
    if (!editingPlace) return
    const { mapx, mapy } = editingPlace
    const newTags = editTags
    const newMemo = editMemo
    setSavedPlaces((prev) =>
      prev.map((p) => p.mapx === mapx && p.mapy === mapy ? { ...p, preferenceTags: newTags, memo: newMemo } : p)
    )
    closeEditTags()
    if (!isGuest) {
      try { await updatePlaceTagsAction(mapx, mapy, newTags) } catch {}
      try { await updatePlaceMemoAction(mapx, mapy, newMemo) } catch {}
    }
  }

  async function handleDeletePlace(place: PlaceData) {
    setSavedPlaces((prev) => prev.filter((p) => !(p.mapx === place.mapx && p.mapy === place.mapy)))
    if (selectedPlace?.mapx === place.mapx && selectedPlace?.mapy === place.mapy) setSelectedPlace(null)
    if (editingPlace?.mapx === place.mapx && editingPlace?.mapy === place.mapy) closeEditTags()
    if (!isGuest) {
      try { await deletePlaceAction(place.mapx, place.mapy) } catch {}
    }
  }

  async function handleCreateList() {
    const name = newListName.trim()
    if (!name) return
    setShowNewListInput(false); setNewListName('')
    if (isGuest) {
      const newList: ListData = { id: String(Date.now()), name }
      setLists((prev) => [...prev, newList])
      setPendingListId(newList.id)
      return
    }
    try {
      const newList = await createListAction(name)
      setLists((prev) => [...prev, newList])
      setPendingListId(newList.id)
    } catch {}
  }

  async function confirmSave() {
    if (!pendingSave || isSaved(pendingSave)) return
    const data: PlaceData = {
      title:           stripHtml(pendingSave.title),
      category:        pendingSave.category,
      categoryGroup:   pendingCategoryGroup,
      categorySubgroup:pendingCategorySubgroup,
      address:         pendingSave.address,
      roadAddress:     pendingSave.roadAddress,
      telephone:       pendingSave.telephone,
      mapx:            pendingSave.mapx,
      mapy:            pendingSave.mapy,
      preferenceTags:  pendingPreferenceTags,
      listId:          pendingListId,
      memo:            pendingMemo,
    }
    setPendingSave(null); setPendingCatGroup(''); setPendingCatSub('')
    setPendingTags([]); setPendingMemo(''); setPendingListId(null); setShowNewListInput(false); setNewListName('')
    setSavedPlaces((prev) => [...prev, data])
    if (!isGuest) {
      try { await savePlaceAction(data) } catch {}
    }
  }

  async function handleShareList(listId: string) {
    console.log('[share] selected listId:', listId)
    setShareStatus('loading')
    setShareError(null)
    setShareUrl(null)
    setCopyStatus('idle')

    if (!isGuest) {
      try {
        await publishListAction(listId)
        console.log('[share] publishList succeeded for', listId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[share] publishList failed:', msg)
        setShareStatus('error')
        setShareError(`목록 공개 실패: ${msg}`)
        return
      }
    }

    const url = `${window.location.origin}/share/${listId}`
    console.log('[share] generated URL:', url)
    setShareStatus('idle')
    setShareUrl(url)
  }

  async function handleCopyUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      console.log('[share] clipboard copy succeeded')
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    } catch (err) {
      console.warn('[share] clipboard copy failed, selecting input:', err)
      setCopyStatus('failed')
      shareUrlInputRef.current?.select()
    }
  }

  async function search() {
    const q = query.trim()
    if (!q) return
    setHasSearched(true); setSearchCount((c) => c + 1)
    setLoading(true); setError(null); setPreviewPlace(null)
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error('검색 서버에 연결할 수 없어요')
      }
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? '검색에 실패했어요')
      setPlaces(d.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했어요'); setPlaces([])
    } finally { setLoading(false) }
  }

  function advanceSheet() {
    setSheetState((s) => s === 'collapsed' ? 'mid' : s === 'mid' ? 'expanded' : 'collapsed')
  }

  // ── reusable chip row helpers ────────────────────────────────────────────

  function PreferenceTagChips({ inSaveDialog = false }: { inSaveDialog?: boolean }) {
    const activeTags = inSaveDialog ? pendingPreferenceTags : activePrefs
    const toggle     = inSaveDialog ? togglePendingTag       : toggleActivePreference
    const showAll    = inSaveDialog ? showAllSaveTags         : showAllFilterTags
    const setShowAll = inSaveDialog ? setShowAllSaveTags      : setShowAllFilterTags

    return (
      <div className="space-y-2">
        {showAll ? (
          <div className="space-y-2.5">
            {Object.entries(PREFERENCE_GROUPS).map(([groupName, tags]) => (
              <div key={groupName}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{groupName}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggle(tag)}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors ${tagChipCls(activeTags.includes(tag))}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {MVP_VISIBLE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${tagChipCls(activeTags.includes(tag))}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          {showAll ? '접기 ↑' : '더 보기 ↓'}
        </button>
      </div>
    )
  }

  // ── save dialog (inline in search results) ────────────────────────────────

  function SaveDialog({ place }: { place: Place }) {
    const categoryLabel = [pendingCategoryGroup, pendingCategorySubgroup].filter(Boolean).join(' > ')

    return (
      <div className="flex flex-col gap-3 px-3 py-3 bg-gray-50 border-t border-gray-200">
        {/* place title + auto-mapped category */}
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate">{stripHtml(place.title)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {categoryLabel && <span className="text-blue-500 mr-1">{categoryLabel}</span>}
            <span>{place.category}</span>
          </p>
        </div>

        {/* preference tags */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            태그
            {pendingPreferenceTags.length > 0 && (
              <span className="ml-1 text-blue-600 font-normal normal-case">{pendingPreferenceTags.length}개 선택</span>
            )}
          </p>
          <PreferenceTagChips inSaveDialog />
        </div>

        {/* list picker */}
        {lists.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">목록</p>
            <div className="flex flex-wrap gap-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setPendingListId(pendingListId === list.id ? null : list.id)}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                    pendingListId === list.id
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {list.name}
                </button>
              ))}
              {showNewListInput ? (
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                    placeholder="목록 이름"
                    autoFocus
                    className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                  />
                  <button onClick={handleCreateList} className="text-xs text-blue-600">확인</button>
                  <button onClick={() => { setShowNewListInput(false); setNewListName('') }} className="text-xs text-gray-400">취소</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewListInput(true)}
                  className="px-2 py-0.5 rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-500"
                >
                  + 새 목록
                </button>
              )}
            </div>
          </div>
        )}

        {/* memo */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">메모</p>
          <textarea
            value={pendingMemo}
            onChange={(e) => setPendingMemo(e.target.value)}
            placeholder="이 장소에 대한 메모를 남겨보세요"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-400 focus:outline-none resize-none"
          />
        </div>

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { setPendingSave(null); setPendingCatGroup(''); setPendingCatSub(''); setPendingTags([]); setPendingMemo(''); setPendingListId(null) }}
            className="flex-1 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={confirmSave}
            className="flex-1 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    )
  }

  // ── tag edit panel (inline below a saved place row) ─────────────────────

  function TagEditPanel() {
    return (
      <div className="px-3 py-3 bg-gray-50 space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            취향 태그
            {editTags.length > 0 && (
              <span className="ml-1 text-blue-600 font-normal normal-case">{editTags.length}개 선택</span>
            )}
          </p>
          {showAllEditTags ? (
            <div className="space-y-2.5">
              {Object.entries(PREFERENCE_GROUPS).map(([groupName, tags]) => (
                <div key={groupName}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{groupName}</p>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <button key={tag} onClick={() => toggleEditTag(tag)}
                        className={`px-2 py-0.5 rounded-full text-xs transition-colors ${tagChipCls(editTags.includes(tag))}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {MVP_VISIBLE_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleEditTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${tagChipCls(editTags.includes(tag))}`}>
                  {tag}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowAllEditTags((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            {showAllEditTags ? '접기 ↑' : '더 보기 ↓'}
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">메모</p>
          <textarea
            value={editMemo}
            onChange={(e) => setEditMemo(e.target.value)}
            placeholder="이 장소에 대한 메모를 남겨보세요"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-400 focus:outline-none resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={closeEditTags}
            className="flex-1 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            취소
          </button>
          <button onClick={handleUpdateTags}
            className="flex-1 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
            저장
          </button>
        </div>
      </div>
    )
  }

  // ── panel sections ────────────────────────────────────────────────────────

  const panelSearch = (
    <div className="bg-white space-y-2 px-3 pt-3 pb-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="장소 검색..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? '...' : '검색'}
        </button>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      {hasSearched && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <ul className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonItem key={i} />)}
            </ul>
          ) : places.length > 0 ? (
            <ul
              key={searchCount}
              style={{ animation: 'fadeIn 0.2s ease' }}
              className="divide-y divide-gray-100 max-h-72 overflow-y-auto"
            >
              {places.map((place, i) => (
                <li key={i} className="divide-y divide-gray-100">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewPlace(place)}>
                      <p className="text-sm font-medium text-gray-900 truncate">{stripHtml(place.title)}</p>
                      {place.category && <p className="text-xs text-blue-600 truncate">{place.category}</p>}
                      {(place.roadAddress || place.address) && (
                        <p className="text-xs text-gray-400 truncate">{place.roadAddress || place.address}</p>
                      )}
                    </div>
                    {pendingSave !== place && (
                      <button
                        onClick={() => openSaveDialog(place)}
                        disabled={isSaved(place)}
                        className="shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default
                          data-[saved=true]:bg-green-50 data-[saved=true]:text-green-700
                          data-[saved=false]:bg-gray-100 data-[saved=false]:text-gray-600 data-[saved=false]:hover:bg-gray-200"
                        data-saved={isSaved(place)}
                      >
                        {isSaved(place) ? '저장됨' : '저장'}
                      </button>
                    )}
                  </div>
                  {pendingSave === place && SaveDialog({ place })}
                </li>
              ))}
            </ul>
          ) : !error ? (
            <p className="text-sm text-gray-400 text-center py-5">결과 없음</p>
          ) : null}
        </div>
      )}
    </div>
  )

  const panelFilters = savedPlaces.length > 0 && (
    <div className="bg-white px-3 pt-3 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">필터</p>
        {hasFilters && (
          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            초기화
          </button>
        )}
      </div>

      {/* List filter */}
      {lists.length >= 1 && (
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setActiveList(null)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${chipCls(activeList === null)}`}>전체</button>
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveList(activeList === list.id ? null : list.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${chipCls(activeList === list.id)}`}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}

      {/* Category group filter */}
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setActiveCatGroup(null); setActiveCatSub(null) }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${chipCls(activeCatGroup === null)}`}
          >
            전체
          </button>
          {CATEGORY_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => { setActiveCatGroup(activeCatGroup === g ? null : g); setActiveCatSub(null) }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${chipCls(activeCatGroup === g)}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Category subgroup filter — appears only when a group is selected */}
        {activeCatGroup && CATEGORY_SUBGROUPS[activeCatGroup] && (
          <div className="flex flex-wrap gap-1 pl-2 pt-0.5">
            {CATEGORY_SUBGROUPS[activeCatGroup].map((s) => (
              <button
                key={s}
                onClick={() => setActiveCatSub(activeCatSub === s ? null : s)}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${chipCls(activeCatSub === s)}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preference tag filter */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          취향 태그
          {activePrefs.length > 0 && (
            <span className="ml-1 text-blue-600 font-normal normal-case">{activePrefs.length}개 선택</span>
          )}
        </p>
        <PreferenceTagChips />
      </div>
    </div>
  )

  const panelEmpty = savedPlaces.length === 0 && !hasSearched && (
    <div className="bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-gray-400">장소를 검색해서 저장해보세요</p>
      <p className="text-xs text-gray-300 mt-1">저장한 장소가 지도에 표시됩니다</p>
    </div>
  )

  const panelSaved = savedPlaces.length > 0 && (
    <div className="bg-white pb-2">
      <div className="px-3 pb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          저장된 장소
          <span className="ml-1 text-gray-300 font-normal">
            {filteredPlaces.length}{hasFilters ? ` / ${savedPlaces.length}` : ''}
          </span>
        </p>
        {activeList && (
          <button
            onClick={() => handleShareList(activeList)}
            disabled={shareStatus === 'loading'}
            className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            {shareStatus === 'loading' ? '공유 중...' : '공유하기'}
          </button>
        )}
      </div>
      {/* Share error */}
      {activeList && shareStatus === 'error' && shareError && (
        <p className="mx-3 mb-2 text-xs text-red-500">{shareError}</p>
      )}
      {/* Share URL card — visible after publishing until list changes */}
      {activeList && shareUrl && (
        <div className="mx-3 mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={shareUrlInputRef}
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:border-blue-300"
            />
            <button
              onClick={handleCopyUrl}
              className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                copyStatus === 'copied'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              {copyStatus === 'copied' ? '복사됨 ✓' : '링크 복사'}
            </button>
          </div>
          {copyStatus === 'copied' && (
            <p className="text-[11px] text-green-600">링크가 복사되었어요 ✓</p>
          )}
          {copyStatus === 'failed' && (
            <p className="text-[11px] text-gray-500">자동 복사 실패, 길게 눌러 복사해주세요</p>
          )}
        </div>
      )}
      <ul className="divide-y divide-gray-100">
        {filteredPlaces.map((place, i) => {
          const isEditingThis = editingPlace?.mapx === place.mapx && editingPlace?.mapy === place.mapy
          return (
            <CompactPlaceRow
              key={i}
              place={place}
              isSelected={selectedPlace?.mapx === place.mapx && selectedPlace?.mapy === place.mapy}
              activeList={activeList}
              lists={lists}
              onClick={() => setSelectedPlace(place)}
              onDelete={() => handleDeletePlace(place)}
              onEditClick={() => isEditingThis ? closeEditTags() : openEditTags(place)}
              editPanel={isEditingThis ? TagEditPanel() : undefined}
            />
          )
        })}
      </ul>
    </div>
  )

  // ── render ────────────────────────────────────────────────────────────────

  const maxRegionCount = regions[0]?.count ?? 1

  const promptConfig = activePrompt === 'guest-signup' ? {
    message: '탐험이 쌓이고 있어요 ✨\n지금 가입하면 저장한 장소를 바탕으로\n나만의 탐험 카드를 확인할 수 있어요',
    actions: [
      { label: '로그인하고 계속하기', href: '/auth/login', primary: true },
      { label: '나중에 할게요', onClick: () => setActivePrompt(null) },
    ],
  } : activePrompt === 'auth-cards' ? {
    message: '탐험 카드가 준비되었어요 🧭\n이제 당신의 취향을 분석해볼까요?',
    actions: [
      { label: '내 카드 보기', href: '/cards', primary: true },
    ],
  } : null

  // ── exploration view (map + region summary) ─────────────────────────────

  if (panelTab === 'exploration') {
    const regionList = (
      <div className="space-y-3">
        {regions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">장소를 저장하면 탐험 패턴을 볼 수 있어요</p>
          </div>
        ) : (
          <>
            {regions.map(region => {
              const colors = CATEGORY_COLORS[region.dominantCategory] ?? CATEGORY_COLORS['기타']
              return (
                <div key={region.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.stroke }} />
                      <span className="text-xs font-medium text-gray-900 truncate">{region.name}</span>
                      {region.dominantTag && (
                        <span className="text-[10px] text-gray-400 truncate">{region.dominantTag}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{region.count}곳</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(region.count / maxRegionCount) * 100}%`,
                        background: colors.stroke,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 border-t border-gray-100">
              {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => {
                if (!regions.some(r => r.dominantCategory === cat)) return null
                return (
                  <div key={cat} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colors.fill, border: `1.5px solid ${colors.stroke}` }} />
                    <span className="text-xs text-gray-500">{cat}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )

    return (
      <>
        {/* Desktop: left panel + map (same split as saved view) */}
        <div className="hidden md:flex h-full overflow-hidden">
          <aside className="flex flex-col w-[380px] flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">지역별 탐험</p>
                <p className="text-[11px] text-gray-400 mt-0.5">저장한 {savedPlaces.length}곳</p>
              </div>
              {regionList}
            </div>
          </aside>
          <div className="flex-1 relative overflow-hidden">
            <ExplorationMap regions={regions} />
          </div>
        </div>

        {/* Mobile: map on top, summary scrollable below */}
        <div className="md:hidden flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 h-[45%] relative">
            <ExplorationMap regions={regions} />
          </div>
          <div className="flex-1 overflow-y-auto bg-white border-t border-gray-200 px-4 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">지역별 탐험</p>
              <p className="text-[11px] text-gray-400 mt-0.5">저장한 {savedPlaces.length}곳</p>
            </div>
            {regionList}
          </div>
        </div>

        {promptConfig && (
          <PromptModal
            message={promptConfig.message}
            actions={promptConfig.actions}
            onDismiss={() => setActivePrompt(null)}
          />
        )}
      </>
    )
  }

  // ── saved view (map + panel) ─────────────────────────────────────────────

  const sheetTranslate =
    sheetState === 'expanded'
      ? 'translateY(0)'
      : `translateY(calc(100% - ${SHEET_PEEK[sheetState]}px))`

  const collapsedSummary = savedPlaces.length > 0
    ? `저장 ${savedPlaces.length}개 · 태그 필터`
    : '장소를 검색해서 저장해보세요'

  return (
    <>
    <div className="flex h-full overflow-hidden">

      {/* ── PC: left panel ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[380px] flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {panelSearch}{panelEmpty}{panelFilters}{panelSaved}
        </div>
      </aside>

      {/* ── map ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <NaverMap
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          previewPlace={previewPlace}
        />

        {/* ── Mobile: bottom sheet ──────────────────────────────────── */}
        <div
          className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] h-[85vh] flex flex-col"
          style={{ transform: sheetTranslate, transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}
        >
          <button
            onClick={advanceSheet}
            className="flex-shrink-0 w-full flex flex-col items-center pt-2.5 pb-2 gap-1"
          >
            <div className="w-9 h-1 rounded-full bg-gray-300" />
            {sheetState === 'collapsed' && (
              <p className="text-xs text-gray-500 pb-0.5">{collapsedSummary}</p>
            )}
          </button>
          <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-100">
            {panelSearch}{panelEmpty}{panelFilters}{panelSaved}
          </div>
        </div>
      </div>
    </div>

    {promptConfig && (
      <PromptModal
        message={promptConfig.message}
        actions={promptConfig.actions}
        onDismiss={() => setActivePrompt(null)}
      />
    )}
    </>
  )
}
